import { assert, beforeEach, describe, it as test, vi } from 'vitest';
import { createHash } from 'crypto';
import type * as MinioInfra from '../../infra/minio';

vi.mock('../../infra/minio', async (importOriginal) => {
  const actual = await importOriginal<typeof MinioInfra>();
  return {
    ...actual,
    uploadToMinio: vi.fn().mockResolvedValue(undefined),
    getFromMinio: vi.fn().mockResolvedValue({ buffer: Buffer.from(''), contentType: 'image/png' }),
    deleteFromMinio: vi.fn().mockResolvedValue(undefined),
  };
});
import { ChangeSet } from '@codemirror/state';
import { DocumentsService } from './documents.service';
import { CheckpointFlushData, IDocumentsRepository } from './documents.repository';
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

  async acquireOwnership(projectId: string): Promise<number> {
    const doc = this.docs.get(projectId);
    if (!doc) throw new Error(`Documento ${projectId} não encontrado`);
    const newGen = (doc.ownerGeneration || 0) + 1;
    doc.ownerGeneration = newGen;
    return newGen;
  }

  async saveCheckpoint(data: CheckpointFlushData): Promise<void> {
    const doc = this.docs.get(data.documentId);
    if (doc) {
      if (
        typeof data.ownerGeneration === 'number' &&
        doc.ownerGeneration &&
        doc.ownerGeneration > data.ownerGeneration
      ) {
        throw new Error(
          `[Fencing Token Conflict] Pod foi destronado: geração no banco (${doc.ownerGeneration}) é superior à geração do processo (${data.ownerGeneration}).`
        );
      }
      if (typeof data.expectedOldVersion === 'number' && doc.version > data.expectedOldVersion) {
        throw new Error(
          `[Conflict] Concorrência otimista falhou: versão atual (${doc.version}) > esperada (${data.expectedOldVersion})`
        );
      }
      doc.content = data.mainContent;
      doc.version = data.version;
      if (typeof data.ownerGeneration === 'number') {
        doc.ownerGeneration = data.ownerGeneration;
      }
    }
    const manifestFiles = this.files
      .filter((f) => f.documentId === data.documentId)
      .map((f) => ({
        path: f.path,
        type: (f.content !== null && f.content !== undefined ? 'text' : 'binary') as
          'text' | 'binary',
        sha256: f.contentHash || 'mock_hash',
        storageKey: f.storageKey || undefined,
        content: f.content !== null && f.content !== undefined ? f.content : undefined,
      }));

    const snapshotWithManifest: DocumentSnapshot = {
      ...data.snapshot,
      manifest: {
        schemaVersion: 1,
        projectId: data.documentId,
        projectVersion: data.version,
        mainEntryPath: data.mainEntryPath,
        files: manifestFiles,
      },
    };

    this.snapshots.push(snapshotWithManifest);
    if (data.secondaryFiles) {
      for (const sf of data.secondaryFiles) {
        const hash = createHash('sha256').update(sf.content, 'utf-8').digest('hex');
        const existing = this.files.find(
          (f) => f.documentId === data.documentId && f.path === sf.path
        );
        if (existing) {
          existing.content = sf.content;
          existing.contentHash = hash;
        } else {
          this.files.push({
            id: sf.path,
            documentId: data.documentId,
            path: sf.path,
            content: sf.content,
            contentHash: hash,
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

  async restoreSnapshot(projectId: string, snapshotId: string): Promise<DocumentSnapshot> {
    const snap = this.snapshots.find((s) => s.id === snapshotId && s.documentId === projectId);
    if (!snap) throw new Error(`Snapshot ${snapshotId} não encontrado`);
    const doc = this.docs.get(projectId);
    if (!doc) throw new Error(`Documento ${projectId} não encontrado`);

    const newVersion = doc.version + 1;
    doc.version = newVersion;
    doc.content = snap.content;

    if (snap.manifest && snap.manifest.files) {
      const manifestPaths = new Set(snap.manifest.files.map((f) => f.path));
      this.files = this.files.filter(
        (f) => f.documentId !== projectId || manifestPaths.has(f.path)
      );
      for (const mf of snap.manifest.files) {
        const existing = this.files.find((f) => f.documentId === projectId && f.path === mf.path);
        if (existing) {
          existing.content = mf.content || null;
          existing.contentHash = mf.sha256;
          existing.storageKey = mf.storageKey || null;
        } else {
          this.files.push({
            id: mf.path,
            documentId: projectId,
            path: mf.path,
            content: mf.content || null,
            contentHash: mf.sha256,
            fileType: mf.type === 'text' ? 'text' : 'image',
            mimeType: mf.type === 'text' ? 'text/plain' : 'application/octet-stream',
            sizeBytes: mf.content ? mf.content.length : 0,
            storageKey: mf.storageKey || null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    const restoredSnapshot: DocumentSnapshot = {
      id: `restore-${Date.now()}`,
      documentId: projectId,
      version: newVersion,
      content: snap.content,
      savedBy: 'Sistema (Rollback)',
      reason: `rollback_snapshot_${snapshotId}`,
      manifest: snap.manifest,
      createdAt: new Date().toISOString(),
    };
    this.snapshots.push(restoredSnapshot);
    return restoredSnapshot;
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
      mainEntryPath: 'main.tex',
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

  test('deve salvar imagem com hash SHA-256 e storageKey imutável content-addressed', async () => {
    const file = await service.uploadProjectFile(
      'doc-test-1',
      'images/grafico.png',
      Buffer.from('fake-png-data'),
      'image/png'
    );

    assert.equal(file.documentId, 'doc-test-1');
    assert.equal(file.path, 'images/grafico.png');
    assert.equal(file.fileType, 'image');
    assert.ok(file.contentHash);
    assert.match(file.storageKey!, /^projects\/doc-test-1\/assets\/[a-f0-9]{64}-grafico\.png$/);
  });

  test('Fencing Token Atômico: deve rejeitar salvamento de Pod com geração defasada', async () => {
    // 1. Pod adquire titularidade inicial (Geração 1)
    const gen1 = await service.acquireDocumentOwnership('doc-test-1');
    assert.equal(gen1, 1);

    // 2. Simula que outro Pod assumiu o documento no PostgreSQL (Geração 2)
    await repo.acquireOwnership('doc-test-1');

    // 3. Pod original tenta aplicar delta e flush com Geração 1
    const change = ChangeSet.of([{ from: 0, insert: 'Novo Texto ' }], initialDocContent.length);
    await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-1', changes: change.toJSON() }],
      'user-1',
      'User 1'
    );

    // O flush deve detectar que a geração do banco é superior e abortar, descarregando a memória
    const snapshot = await service.flushCheckpoint('doc-test-1');
    assert.equal(snapshot, null);
    // Documento foi evictado/descarregado da memória ativa
    assert.equal(service.getMemoryStats().activeDocumentsCount, 0);
  });

  test('Snapshot Multi-Arquivo: deve consolidar manifesto JSONB com arquivos secundários e SHA-256', async () => {
    await service.createProjectTextFile('doc-test-1', 'sections/intro.tex', '\\section{Intro}');
    await service.createProjectTextFile('doc-test-1', 'refs.bib', '@article{test}');

    const change = ChangeSet.of([{ from: 5, insert: ' Beautiful' }], initialDocContent.length);
    await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-alice', changes: change.toJSON() }],
      'user-alice',
      'Alice'
    );

    const snapshot = await service.flushCheckpoint('doc-test-1');
    assert.ok(snapshot);
    if (!snapshot || !snapshot.manifest) {
      assert.fail('Snapshot ou manifesto não gerado');
    }
    const manifest = snapshot.manifest;
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.files.length >= 2, true);

    const introEntry = manifest.files.find((f) => f.path === 'sections/intro.tex');
    assert.ok(introEntry);
    assert.equal(introEntry?.type, 'text');
    assert.ok(introEntry?.sha256);
  });

  test('Rollback Multi-Arquivo: deve restaurar estado exato e expurgar arquivos órfãos', async () => {
    // Cria estado base com intro.tex
    await service.createProjectTextFile('doc-test-1', 'sections/intro.tex', 'Texto Base da Intro');
    const change1 = ChangeSet.of([{ from: 0, insert: 'V1 - ' }], initialDocContent.length);
    await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'u1', changes: change1.toJSON() }],
      'u1',
      'User 1'
    );
    const snap1 = await service.flushCheckpoint('doc-test-1');
    assert.ok(snap1);

    // Cria arquivo posterior e altera main
    await service.createProjectTextFile('doc-test-1', 'sections/future_junk.tex', 'Lixo posterior');
    const filesBeforeRollback = await service.listProjectFiles('doc-test-1');
    assert.ok(filesBeforeRollback.some((f) => f.path === 'sections/future_junk.tex'));

    // Executa restauração do snapshot snap1
    const restored = await service.restoreSnapshot('doc-test-1', snap1!.id);
    assert.ok(restored);
    assert.equal(restored.reason, `rollback_snapshot_${snap1!.id}`);

    // Valida que o arquivo posterior 'sections/future_junk.tex' foi removido
    const filesAfterRollback = await service.listProjectFiles('doc-test-1');
    assert.equal(
      filesAfterRollback.some((f) => f.path === 'sections/future_junk.tex'),
      false
    );
    assert.ok(filesAfterRollback.some((f) => f.path === 'sections/intro.tex'));
  });
});
