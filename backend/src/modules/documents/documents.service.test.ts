import { describe, beforeEach, it as test, assert } from 'vitest';
import { ChangeSet } from '@codemirror/state';
import { DocumentsService } from './documents.service';
import { IDocumentsRepository, CheckpointFlushData } from './documents.repository';
import {
  Document,
  DocumentOperation,
  DocumentSnapshot,
  ProjectFile,
  ReviewComment,
} from './documents.schema';
class InMemoryDocumentsRepository implements IDocumentsRepository {
  private docs = new Map<string, Document>();
  private snapshots: DocumentSnapshot[] = [];
  private operations: DocumentOperation[] = [];
  private files: ProjectFile[] = [];
  private comments: ReviewComment[] = [];
  async findById(id: string): Promise<Document | null> {
    const doc = this.docs.get(id);
    return doc ? { ...doc } : null;
  }

  async findAll(): Promise<Document[]> {
    return Array.from(this.docs.values());
  }

  async create(doc: Document): Promise<Document> {
    this.docs.set(doc.id, { ...doc });
    return doc;
  }

  async updateContent(id: string, content: string, version: number): Promise<Document> {
    const doc = this.docs.get(id);
    if (!doc) throw new Error(`Documento ${id} não encontrado`);
    doc.content = content;
    doc.version = version;
    return { ...doc };
  }

  async saveCheckpoint(data: CheckpointFlushData): Promise<void> {
    const doc = this.docs.get(data.documentId);
    if (doc) {
      doc.content = data.mainContent;
      doc.version = data.version;
    }
    this.snapshots.push(data.snapshot);
    if (data.secondaryFiles) {
      for (const sf of data.secondaryFiles) {
        const existing = this.files.find((f) => f.documentId === data.documentId && f.path === sf.path);
        if (existing) {
          existing.content = sf.content;
        } else {
          this.files.push({
            id: sf.path,
            documentId: data.documentId,
            path: sf.path,
            content: sf.content,
            sizeBytes: sf.content.length,
            mimeType: 'text/plain',
            fileType: 'text',
            storageKey: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  async appendOperation(op: DocumentOperation): Promise<DocumentOperation> {
    this.operations.push(op);
    return op;
  }

  async getOperations(documentId: string): Promise<DocumentOperation[]> {
    return this.operations.filter((o) => o.documentId === documentId);
  }

  async createSnapshot(snapshot: DocumentSnapshot): Promise<DocumentSnapshot> {
    this.snapshots.push(snapshot);
    return snapshot;
  }

  async getSnapshots(documentId: string): Promise<DocumentSnapshot[]> {
    return this.snapshots.filter((s) => s.documentId === documentId);
  }

  async listProjectFiles(documentId: string): Promise<ProjectFile[]> {
    return this.files.filter((f) => f.documentId === documentId);
  }

  async findProjectFileById(fileId: string): Promise<ProjectFile | null> {
    const f = this.files.find((x) => x.id === fileId);
    return f ? { ...f } : null;
  }

  async saveProjectFile(file: ProjectFile): Promise<ProjectFile> {
    this.files.push(file);
    return file;
  }

  async updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile> {
    const f = this.files.find((x) => x.id === fileId);
    if (!f) throw new Error('File not found');
    f.content = content;
    return f;
  }

  async deleteProjectFile(fileId: string): Promise<void> {
    this.files = this.files.filter((f) => f.id !== fileId);
  }

  async listComments(projectId: string): Promise<ReviewComment[]> {
    return this.comments.filter((c) => c.documentId === projectId);
  }

  async saveComment(comment: ReviewComment): Promise<ReviewComment> {
    const idx = this.comments.findIndex((c) => c.id === comment.id);
    if (idx >= 0) {
      this.comments[idx] = comment;
    } else {
      this.comments.push(comment);
    }
    return comment;
  }

  async updateComment(comment: ReviewComment): Promise<ReviewComment | null> {
    const idx = this.comments.findIndex((c) => c.id === comment.id);
    if (idx >= 0) {
      this.comments[idx] = comment;
      return comment;
    }
    return null;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const initialLen = this.comments.length;
    this.comments = this.comments.filter((c) => c.id !== commentId);
    return this.comments.length !== initialLen;
  }
}

describe('DocumentsService - Motor Colaborativo com @codemirror/collab', () => {
  let repo: InMemoryDocumentsRepository;
  let service: DocumentsService;
  const initialDocContent = 'Hello World';

  beforeEach(async () => {
    repo = new InMemoryDocumentsRepository();
    await repo.create({
      id: 'doc-test-1',
      title: 'Artigo de Teste',
      content: initialDocContent,
      version: 1,
      updatedAt: new Date().toISOString(),
    });
    service = new DocumentsService(repo);
    await service.getDocument('doc-test-1');
  });

  test('deve aplicar pushUpdates sequencial e avançar a versão', async () => {
    // Insere " Beautiful" na posição 5
    const change = ChangeSet.of([{ from: 5, insert: ' Beautiful' }], initialDocContent.length);
    const result = await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-alice', changes: change.toJSON() }],
      'user-alice',
      'Alice'
    );

    assert.equal(result.newVersion, 1);
    assert.equal(result.docContent, 'Hello Beautiful World');
    assert.equal(service.getCollabVersion('doc-test-1', 'main.tex'), 1);

    const doc = await service.getDocument('doc-test-1');
    assert.equal(doc.content, 'Hello Beautiful World');
  });

  test('deve rebasear edições concorrentes de clientes sob latência sem corrupção de offsets', async () => {
    // Cenário: Alice e Bob começam ambos na versão 0 do documento "Hello World" (len: 11)
    // Alice insere " Amazing" na posição 5
    const aliceChange = ChangeSet.of([{ from: 5, insert: ' Amazing' }], initialDocContent.length);

    // Bob insere "!" no final (posição 11)
    const bobChange = ChangeSet.of([{ from: 11, insert: '!' }], initialDocContent.length);

    // 1. Operação de Alice chega ao servidor primeiro
    const aliceResult = await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'alice', changes: aliceChange.toJSON() }],
      'alice',
      'Alice'
    );
    assert.equal(aliceResult.docContent, 'Hello Amazing World');
    assert.equal(aliceResult.newVersion, 1);

    // 2. Operação de Bob chega atrasada, declarando baseVersion = 0
    // O servidor DEVE rebasear a inserção de Bob sobre a inserção de Alice
    const bobResult = await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0, // Bob ainda não tinha visto a versão 1 de Alice
      [{ clientID: 'bob', changes: bobChange.toJSON() }],
      'bob',
      'Bob'
    );

    assert.equal(bobResult.newVersion, 2);
    // Convergência matemática: o '!' de Bob deve ser transposto para após 'World'
    assert.equal(bobResult.docContent, 'Hello Amazing World!');

    const doc = await service.getDocument('doc-test-1');
    assert.equal(doc.content, 'Hello Amazing World!');
  });

  test('deve ajustar posições de comentários inline quando texto é inserido antes deles', async () => {
    service.addComment('doc-test-1', {
      id: 'comm-test',
      documentId: 'doc-test-1',
      file: 'main.tex',
      from: 6,
      to: 11,
      selectedText: 'World',
      userId: 'rev-1',
      userName: 'Revisor',
      userColor: '#888',
      content: 'Comentário sobre World',
      status: 'open',
      createdAt: '12:00',
      replies: [],
    });

    // Insere "Big " (4 caracteres) na posição 0
    const change = ChangeSet.of([{ from: 0, insert: 'Big ' }], initialDocContent.length);
    await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-1', changes: change.toJSON() }],
      'user-1',
      'User 1'
    );

    const comments = service.getComments('doc-test-1');
    const comment = comments.find((c) => c.id === 'comm-test');
    assert.ok(comment);
    assert.equal(comment?.from, 10);
    assert.equal(comment?.to, 15);
  });

  test('flushCheckpoint deve persistir conteúdo no repositório e criar snapshot', async () => {
    const change = ChangeSet.of([{ from: 11, insert: '!' }], initialDocContent.length);
    await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-1', changes: change.toJSON() }],
      'user-1',
      'User 1'
    );

    const snapshot = await service.flushCheckpoint('doc-test-1');
    assert.ok(snapshot);
    assert.equal(snapshot?.content, 'Hello World!');
    const repoSnapshots = await repo.getSnapshots('doc-test-1');
    assert.equal(repoSnapshots.length, 1);
    assert.equal(repoSnapshots[0].content, 'Hello World!');
  });

  test('deve persistir e carregar comentários de revisão (ReviewComment) via repositório', async () => {
    const comment: ReviewComment = {
      id: 'comm-persistent-1',
      documentId: 'doc-test-1',
      file: 'main.tex',
      from: 0,
      to: 5,
      selectedText: 'Hello',
      userId: 'rev-1',
      userName: 'Reviewer Teste',
      userColor: '#10b981',
      content: 'Excelente introdução, favor verificar referência.',
      status: 'open',
      createdAt: new Date().toISOString(),
      replies: [],
    };

    service.addComment('doc-test-1', comment);

    // Valida no repositório
    const savedInRepo = await repo.listComments('doc-test-1');
    assert.equal(savedInRepo.length, 1);
    assert.equal(savedInRepo[0].id, 'comm-persistent-1');
    assert.equal(savedInRepo[0].content, 'Excelente introdução, favor verificar referência.');

    // Adiciona resposta (reply)
    service.replyComment('doc-test-1', 'comm-persistent-1', {
      id: 'reply-1',
      userId: 'auth-1',
      userName: 'Autor',
      userColor: '#3b82f6',
      content: 'Referência adicionada!',
      createdAt: new Date().toISOString(),
    });

    const withReply = service.getComments('doc-test-1');
    assert.equal(withReply[0].replies.length, 1);

    // Resolve comentário
    service.resolveComment('doc-test-1', 'comm-persistent-1', 'resolved');
    const resolved = service.getComments('doc-test-1');
    assert.equal(resolved[0].status, 'resolved');

    // Valida persistência após novo getDocument em instância fresca
    const freshService = new DocumentsService(repo);
    await freshService.getDocument('doc-test-1');
    const loadedFromDb = freshService.getComments('doc-test-1');
    assert.equal(loadedFromDb.length, 1);
    assert.equal(loadedFromDb[0].id, 'comm-persistent-1');
    assert.equal(loadedFromDb[0].status, 'resolved');
    assert.equal(loadedFromDb[0].replies.length, 1);
  });
});
