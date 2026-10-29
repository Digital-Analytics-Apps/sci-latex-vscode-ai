import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import {
  CommentReplySchema,
  Document,
  DocumentOperation,
  DocumentSnapshot,
  ProjectFile,
  ReviewComment,
} from './documents.schema';
export interface CheckpointFlushData {
  documentId: string;
  version: number;
  expectedOldVersion?: number;
  ownerGeneration?: number;
  mainContent: string;
  secondaryFiles?: Array<{ path: string; content: string }>;
  snapshot: DocumentSnapshot;
}

export interface IDocumentsRepository {
  findById(id: string): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  create(doc: Document): Promise<Document>;
  updateContent(id: string, content: string, version: number): Promise<Document>;
  saveCheckpoint(data: CheckpointFlushData): Promise<void>;
  appendOperation(op: DocumentOperation): Promise<DocumentOperation>;
  getOperations(documentId: string): Promise<DocumentOperation[]>;
  createSnapshot(snapshot: DocumentSnapshot): Promise<DocumentSnapshot>;
  getSnapshots(documentId: string): Promise<DocumentSnapshot[]>;
  listProjectFiles(documentId: string): Promise<ProjectFile[]>;
  findProjectFileById(fileId: string): Promise<ProjectFile | null>;
  saveProjectFile(file: ProjectFile): Promise<ProjectFile>;
  updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile>;
  deleteProjectFile(fileId: string): Promise<void>;
  listComments(projectId: string): Promise<ReviewComment[]>;
  saveComment(comment: ReviewComment): Promise<ReviewComment>;
  updateComment(comment: ReviewComment): Promise<ReviewComment | null>;
  deleteComment(commentId: string): Promise<boolean>;
}
export class PrismaDocumentsRepository implements IDocumentsRepository {
  async findById(id: string): Promise<Document | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        files: { where: { path: 'main.tex' } },
      },
    });

    if (!project) return null;

    const mainFile = project.files[0];
    return {
      id: project.id,
      title: project.name,
      content: mainFile?.content || '',
      version: project.currentVersion,
      ownerGeneration: project.ownerGeneration,
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<Document[]> {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        files: { where: { path: 'main.tex' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      title: p.name,
      content: p.files[0]?.content || '',
      version: p.currentVersion,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async create(doc: Document): Promise<Document> {
    await prisma.projectFile.upsert({
      where: { projectId_path: { projectId: doc.id, path: 'main.tex' } },
      create: {
        projectId: doc.id,
        path: 'main.tex',
        fileType: 'text',
        mimeType: 'text/x-tex',
        sizeBytes: BigInt(Buffer.byteLength(doc.content, 'utf-8')),
        content: doc.content,
      },
      update: {
        content: doc.content,
        sizeBytes: BigInt(Buffer.byteLength(doc.content, 'utf-8')),
      },
    });

    return doc;
  }

  async updateContent(id: string, content: string, version: number): Promise<Document> {
    await prisma.$transaction([
      prisma.project.update({
        where: { id },
        data: { currentVersion: version },
      }),
      prisma.projectFile.upsert({
        where: { projectId_path: { projectId: id, path: 'main.tex' } },
        create: {
          projectId: id,
          path: 'main.tex',
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(Buffer.byteLength(content, 'utf-8')),
          content,
        },
        update: {
          content,
          sizeBytes: BigInt(Buffer.byteLength(content, 'utf-8')),
        },
      }),
    ]);

    const project = await prisma.project.findUnique({ where: { id } });
    return {
      id,
      title: project?.name || 'Artigo Científico',
      content,
      version,
      updatedAt: project?.updatedAt.toISOString() || new Date().toISOString(),
    };
  }

  async saveCheckpoint(data: CheckpointFlushData): Promise<void> {
    const { documentId, version, expectedOldVersion, mainContent, secondaryFiles = [], snapshot } = data;

    await prisma.$transaction(async (tx) => {
      // Concorrência Otimista & Fencing Token (ownerGeneration)
      const currentProject = await tx.project.findUnique({
        where: { id: documentId },
        select: { currentVersion: true, ownerGeneration: true },
      });

      if (currentProject) {
        // Validação de Fencing Token (Martin Kleppmann Fencing)
        if (typeof data.ownerGeneration === 'number' && data.ownerGeneration > 0) {
          if (currentProject.ownerGeneration > data.ownerGeneration) {
            throw new Error(
              `[Fencing Token Conflict] Pod foi destronado: geração no banco (${currentProject.ownerGeneration}) é superior à geração do processo (${data.ownerGeneration}).`
            );
          }
        }

        // Validação de Versão de Delta
        if (typeof expectedOldVersion === 'number' && expectedOldVersion > 0) {
          if (currentProject.currentVersion > expectedOldVersion) {
            throw new Error(
              `[Conflict] Concorrência otimista falhou: versão atual do banco (${currentProject.currentVersion}) é mais recente que a esperada (${expectedOldVersion}).`
            );
          }
        }
      }

      // 1. Atualiza versão e geração do projeto
      await tx.project.update({
        where: { id: documentId },
        data: {
          currentVersion: version,
          ...(typeof data.ownerGeneration === 'number' ? { ownerGeneration: data.ownerGeneration } : {}),
        },
      });
      // 2. Atualiza arquivo principal (main.tex)
      await tx.projectFile.upsert({
        where: { projectId_path: { projectId: documentId, path: 'main.tex' } },
        create: {
          projectId: documentId,
          path: 'main.tex',
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(Buffer.byteLength(mainContent, 'utf-8')),
          content: mainContent,
        },
        update: {
          content: mainContent,
          sizeBytes: BigInt(Buffer.byteLength(mainContent, 'utf-8')),
        },
      });

      // 3. Atualiza arquivos secundários na mesma transação atômica
      for (const file of secondaryFiles) {
        await tx.projectFile.upsert({
          where: { projectId_path: { projectId: documentId, path: file.path } },
          create: {
            projectId: documentId,
            path: file.path,
            fileType: 'text',
            mimeType: 'text/plain',
            sizeBytes: BigInt(Buffer.byteLength(file.content, 'utf-8')),
            content: file.content,
          },
          update: {
            content: file.content,
            sizeBytes: BigInt(Buffer.byteLength(file.content, 'utf-8')),
          },
        });
      }

      // 4. Cria o snapshot consolidado
      await tx.documentSnapshot.create({
        data: {
          id: snapshot.id,
          projectId: snapshot.documentId,
          version: snapshot.version,
          content: snapshot.content,
          savedBy: snapshot.savedBy,
          reason: snapshot.reason,
        },
      });
    });
  }

  async appendOperation(op: DocumentOperation): Promise<DocumentOperation> {
    await prisma.documentOperation.create({
      data: {
        id: op.id,
        projectId: op.documentId,
        userId: op.userId,
        userName: op.userName,
        type: op.type,
        position: op.position,
        text: op.text || null,
        length: op.length || null,
        timestamp: BigInt(op.timestamp),
      },
    });
    return op;
  }

  async getOperations(documentId: string): Promise<DocumentOperation[]> {
    const ops = await prisma.documentOperation.findMany({
      where: { projectId: documentId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return ops.map((row) => ({
      id: row.id,
      documentId: row.projectId,
      userId: row.userId,
      userName: row.userName,
      type: row.type as 'insert' | 'delete',
      position: row.position,
      text: row.text || undefined,
      length: row.length || undefined,
      timestamp: Number(row.timestamp),
    }));
  }

  async createSnapshot(snapshot: DocumentSnapshot): Promise<DocumentSnapshot> {
    await prisma.documentSnapshot.create({
      data: {
        id: snapshot.id,
        projectId: snapshot.documentId,
        version: snapshot.version,
        content: snapshot.content,
        savedBy: snapshot.savedBy,
        reason: snapshot.reason,
      },
    });
    return snapshot;
  }

  async getSnapshots(documentId: string): Promise<DocumentSnapshot[]> {
    const snaps = await prisma.documentSnapshot.findMany({
      where: { projectId: documentId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return snaps.map((s) => ({
      id: s.id,
      documentId: s.projectId,
      version: s.version,
      content: s.content,
      savedBy: s.savedBy,
      reason: s.reason,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async listProjectFiles(documentId: string): Promise<ProjectFile[]> {
    const files = await prisma.projectFile.findMany({
      where: { projectId: documentId },
      orderBy: { path: 'asc' },
    });

    return files.map((f) => ({
      id: f.id,
      documentId: f.projectId,
      path: f.path,
      fileType: f.fileType,
      mimeType: f.mimeType,
      sizeBytes: Number(f.sizeBytes),
      storageKey: f.storageKey,
      content: f.content,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async findProjectFileById(fileId: string): Promise<ProjectFile | null> {
    const f = await prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!f) return null;

    return {
      id: f.id,
      documentId: f.projectId,
      path: f.path,
      fileType: f.fileType,
      mimeType: f.mimeType,
      sizeBytes: Number(f.sizeBytes),
      storageKey: f.storageKey,
      content: f.content,
      createdAt: f.createdAt.toISOString(),
    };
  }

  async saveProjectFile(file: ProjectFile): Promise<ProjectFile> {
    const upserted = await prisma.projectFile.upsert({
      where: { projectId_path: { projectId: file.documentId, path: file.path } },
      create: {
        id: file.id,
        projectId: file.documentId,
        path: file.path,
        fileType: file.fileType,
        mimeType: file.mimeType,
        sizeBytes: BigInt(file.sizeBytes),
        storageKey: file.storageKey,
        content: file.content || null,
      },
      update: {
        fileType: file.fileType,
        mimeType: file.mimeType,
        sizeBytes: BigInt(file.sizeBytes),
        storageKey: file.storageKey,
        content: file.content || null,
      },
    });

    return {
      id: upserted.id,
      documentId: upserted.projectId,
      path: upserted.path,
      fileType: upserted.fileType,
      mimeType: upserted.mimeType,
      sizeBytes: Number(upserted.sizeBytes),
      storageKey: upserted.storageKey,
      content: upserted.content,
      createdAt: upserted.createdAt.toISOString(),
    };
  }

  async updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile> {
    const updated = await prisma.projectFile.update({
      where: { id: fileId },
      data: {
        content,
        sizeBytes: BigInt(Buffer.byteLength(content, 'utf-8')),
      },
    });

    return {
      id: updated.id,
      documentId: updated.projectId,
      path: updated.path,
      fileType: updated.fileType,
      mimeType: updated.mimeType,
      sizeBytes: Number(updated.sizeBytes),
      storageKey: updated.storageKey,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
    };
  }
  async deleteProjectFile(fileId: string): Promise<void> {
    await prisma.projectFile.delete({ where: { id: fileId } });
  }

  async listComments(projectId: string): Promise<ReviewComment[]> {
    const records = await prisma.reviewComment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      documentId: r.projectId,
      file: r.file,
      from: r.from,
      to: r.to,
      selectedText: r.selectedText,
      userId: r.userId,
      userName: r.userName,
      userColor: r.userColor,
      content: r.content,
      status: r.status as 'open' | 'resolved',
      createdAt: r.createdAt.toISOString(),
      replies: CommentReplySchema.array().catch([]).parse(r.replies),
    }));
  }

  async saveComment(comment: ReviewComment): Promise<ReviewComment> {
    const repliesJson = comment.replies as unknown as Prisma.InputJsonValue;
    const created = await prisma.reviewComment.upsert({
      where: { id: comment.id },
      create: {
        id: comment.id,
        projectId: comment.documentId,
        file: comment.file || 'main.tex',
        from: comment.from,
        to: comment.to,
        selectedText: comment.selectedText,
        userId: comment.userId,
        userName: comment.userName,
        userColor: comment.userColor,
        content: comment.content,
        status: comment.status || 'open',
        replies: repliesJson,
      },
      update: {
        from: comment.from,
        to: comment.to,
        content: comment.content,
        status: comment.status,
        replies: repliesJson,
      },
    });

    return {
      id: created.id,
      documentId: created.projectId,
      file: created.file,
      from: created.from,
      to: created.to,
      selectedText: created.selectedText,
      userId: created.userId,
      userName: created.userName,
      userColor: created.userColor,
      content: created.content,
      status: created.status as 'open' | 'resolved',
      createdAt: created.createdAt.toISOString(),
      replies: CommentReplySchema.array().catch([]).parse(created.replies),
    };
  }

  async updateComment(comment: ReviewComment): Promise<ReviewComment | null> {
    try {
      const repliesJson = comment.replies as unknown as Prisma.InputJsonValue;
      const updated = await prisma.reviewComment.update({
        where: { id: comment.id },
        data: {
          from: comment.from,
          to: comment.to,
          content: comment.content,
          status: comment.status,
          replies: repliesJson,
        },
      });

      return {
        id: updated.id,
        documentId: updated.projectId,
        file: updated.file,
        from: updated.from,
        to: updated.to,
        selectedText: updated.selectedText,
        userId: updated.userId,
        userName: updated.userName,
        userColor: updated.userColor,
        content: updated.content,
        status: updated.status as 'open' | 'resolved',
        createdAt: updated.createdAt.toISOString(),
        replies: CommentReplySchema.array().catch([]).parse(updated.replies),
      };
    } catch {
      return null;
    }
  }

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      await prisma.reviewComment.delete({ where: { id: commentId } });
      return true;
    } catch {
      return false;
    }
  }
}

export const defaultDocumentsRepository = new PrismaDocumentsRepository();
