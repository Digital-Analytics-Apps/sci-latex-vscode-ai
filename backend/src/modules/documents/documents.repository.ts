import { createHash } from 'crypto';
import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';
import {
  CommentReplySchema,
  Document,
  DocumentOperation,
  DocumentSnapshot,
  ProjectFile,
  ReviewComment,
  SnapshotManifest,
} from './documents.schema';
export interface CheckpointFlushData {
  documentId: string;
  version: number;
  expectedOldVersion?: number;
  ownerGeneration?: number;
  mainEntryPath: string;
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
  acquireOwnership(projectId: string): Promise<number>;
  restoreSnapshot(projectId: string, snapshotId: string): Promise<DocumentSnapshot>;
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
        files: true,
      },
    });

    if (!project) return null;

    const mainEntryPath = project.mainEntryPath;
    if (!mainEntryPath) {
      throw new Error(
        `[DocumentIntegrityError] Projeto "${id}" não possui 'mainEntryPath' definido.`
      );
    }

    const mainFile = project.files.find((f) => f.path === mainEntryPath);
    if (!mainFile) {
      throw new Error(
        `[DocumentIntegrityError] Arquivo principal "${mainEntryPath}" não foi encontrado nos arquivos do projeto "${id}".`
      );
    }

    return {
      id: project.id,
      title: project.name,
      content: mainFile.content || '',
      mainEntryPath,
      version: project.currentVersion,
      ownerGeneration: project.ownerGeneration,
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<Document[]> {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        files: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => {
      const mainEntryPath = p.mainEntryPath;
      if (!mainEntryPath) {
        throw new Error(
          `[DocumentIntegrityError] Projeto "${p.id}" não possui 'mainEntryPath' definido.`
        );
      }
      const mainFile = p.files.find((f) => f.path === mainEntryPath);
      if (!mainFile) {
        throw new Error(
          `[DocumentIntegrityError] Arquivo principal "${mainEntryPath}" não foi encontrado nos arquivos do projeto "${p.id}".`
        );
      }
      return {
        id: p.id,
        title: p.name,
        content: mainFile.content || '',
        mainEntryPath,
        version: p.currentVersion,
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  async create(doc: Document): Promise<Document> {
    if (!doc.mainEntryPath) {
      throw new Error(
        `[DocumentIntegrityError] Tentativa de persistir documento "${doc.id}" sem 'mainEntryPath' definido.`
      );
    }

    await prisma.projectFile.upsert({
      where: { projectId_path: { projectId: doc.id, path: doc.mainEntryPath } },
      create: {
        projectId: doc.id,
        path: doc.mainEntryPath,
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
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new Error(`[DocumentIntegrityError] Projeto "${id}" não encontrado para atualização.`);
    }

    const mainEntryPath = project.mainEntryPath;
    if (!mainEntryPath) {
      throw new Error(
        `[DocumentIntegrityError] Projeto "${id}" não possui 'mainEntryPath' definido.`
      );
    }

    await prisma.$transaction([
      prisma.project.update({
        where: { id },
        data: { currentVersion: version },
      }),
      prisma.projectFile.upsert({
        where: { projectId_path: { projectId: id, path: mainEntryPath } },
        create: {
          projectId: id,
          path: mainEntryPath,
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

    return {
      id,
      title: project.name,
      content,
      mainEntryPath,
      version,
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async acquireOwnership(projectId: string): Promise<number> {
    const updated = await prisma.$queryRaw<Array<{ ownerGeneration: number }>>`
      UPDATE "Project"
      SET "ownerGeneration" = "ownerGeneration" + 1, "updatedAt" = NOW()
      WHERE "id" = ${projectId}
      RETURNING "ownerGeneration";
    `;

    if (!updated || updated.length === 0) {
      throw new Error(
        `[OwnershipError] Projeto "${projectId}" não encontrado ao tentar adquirir titularidade.`
      );
    }

    return updated[0].ownerGeneration;
  }

  async saveCheckpoint(data: CheckpointFlushData): Promise<void> {
    const {
      documentId,
      version,
      expectedOldVersion,
      ownerGeneration,
      mainContent,
      secondaryFiles = [],
      snapshot,
    } = data;

    if (!data.mainEntryPath) {
      throw new Error(
        `[CheckpointIntegrityError] Falha no checkpoint do documento "${documentId}": 'mainEntryPath' não foi fornecido.`
      );
    }

    const mainHash = createHash('sha256').update(mainContent, 'utf-8').digest('hex');

    await prisma.$transaction(async (tx) => {
      // 1. Validação e Persistência Atômica do Fencing Token & Versão de Projeto
      if (
        typeof ownerGeneration === 'number' &&
        ownerGeneration > 0 &&
        typeof expectedOldVersion === 'number' &&
        expectedOldVersion > 0
      ) {
        const rowsAffected = await tx.$executeRaw`
          UPDATE "Project"
          SET "currentVersion" = ${version}, "updatedAt" = NOW()
          WHERE "id" = ${documentId}
            AND "ownerGeneration" = ${ownerGeneration}
            AND "currentVersion" = ${expectedOldVersion};
        `;

        if (rowsAffected === 0) {
          const currentProject = await tx.project.findUnique({
            where: { id: documentId },
            select: { currentVersion: true, ownerGeneration: true },
          });

          if (!currentProject) {
            throw new Error(`[DocumentIntegrityError] Projeto "${documentId}" não encontrado.`);
          }

          if (currentProject.ownerGeneration > ownerGeneration) {
            throw new Error(
              `[Fencing Token Conflict] Pod foi destronado: geração no banco (${currentProject.ownerGeneration}) é superior à geração do processo (${ownerGeneration}).`
            );
          }

          if (currentProject.currentVersion > expectedOldVersion) {
            throw new Error(
              `[Conflict] Concorrência otimista falhou: versão atual do banco (${currentProject.currentVersion}) é mais recente que a esperada (${expectedOldVersion}).`
            );
          }

          throw new Error(
            `[CheckpointConflict] Concorrência rejeitada no documento "${documentId}" (versão esperada ${expectedOldVersion}, atual ${currentProject.currentVersion}; geração ${ownerGeneration}, banco ${currentProject.ownerGeneration}).`
          );
        }
      } else {
        await tx.project.update({
          where: { id: documentId },
          data: {
            currentVersion: version,
            ...(typeof ownerGeneration === 'number' ? { ownerGeneration } : {}),
          },
        });
      }

      // 2. Atualiza arquivo principal com cálculo de hash SHA-256
      await tx.projectFile.upsert({
        where: { projectId_path: { projectId: documentId, path: data.mainEntryPath } },
        create: {
          projectId: documentId,
          path: data.mainEntryPath,
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(Buffer.byteLength(mainContent, 'utf-8')),
          content: mainContent,
          contentHash: mainHash,
        },
        update: {
          content: mainContent,
          contentHash: mainHash,
          sizeBytes: BigInt(Buffer.byteLength(mainContent, 'utf-8')),
        },
      });

      // 3. Atualiza arquivos secundários na mesma transação atômica
      for (const file of secondaryFiles) {
        const fileHash = createHash('sha256').update(file.content, 'utf-8').digest('hex');
        await tx.projectFile.upsert({
          where: { projectId_path: { projectId: documentId, path: file.path } },
          create: {
            projectId: documentId,
            path: file.path,
            fileType: 'text',
            mimeType: 'text/plain',
            sizeBytes: BigInt(Buffer.byteLength(file.content, 'utf-8')),
            content: file.content,
            contentHash: fileHash,
          },
          update: {
            content: file.content,
            contentHash: fileHash,
            sizeBytes: BigInt(Buffer.byteLength(file.content, 'utf-8')),
          },
        });
      }

      // 4. Monta o Manifesto Multi-Arquivo JSONB consolidado
      let manifest: SnapshotManifest;
      if (snapshot.manifest) {
        manifest = snapshot.manifest;
      } else {
        const allFiles = await tx.projectFile.findMany({
          where: { projectId: documentId },
        });

        const manifestFiles = allFiles.map((f) => ({
          path: f.path,
          type: (f.content !== null && f.content !== undefined ? 'text' : 'binary') as
            'text' | 'binary',
          sha256:
            f.contentHash ||
            (f.content ? createHash('sha256').update(f.content).digest('hex') : 'hash_unavailable'),
          storageKey: f.storageKey || undefined,
          content: f.content !== null && f.content !== undefined ? f.content : undefined,
        }));

        manifest = {
          schemaVersion: 1,
          projectId: documentId,
          projectVersion: version,
          mainEntryPath: data.mainEntryPath,
          files: manifestFiles,
        };
      }

      // 5. Cria o snapshot consolidado com manifesto multi-arquivo
      await tx.documentSnapshot.create({
        data: {
          id: snapshot.id,
          projectId: snapshot.documentId,
          version: snapshot.version,
          content: snapshot.content,
          savedBy: snapshot.savedBy,
          reason: snapshot.reason,
          manifest: manifest as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }

  async restoreSnapshot(projectId: string, snapshotId: string): Promise<DocumentSnapshot> {
    const snap = await prisma.documentSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snap || snap.projectId !== projectId) {
      throw new Error(
        `[SnapshotNotFound] Snapshot "${snapshotId}" não encontrado para o projeto "${projectId}".`
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { template: true },
    });

    if (!project) {
      throw new Error(`[ProjectNotFound] Projeto "${projectId}" não encontrado.`);
    }

    const newVersion = project.currentVersion + 1;
    const restoredSnapshotId = `restore-${Date.now()}-${snap.id.substring(0, 8)}`;

    return await prisma.$transaction(async (tx) => {
      let mainContent = snap.content;
      let restoredManifest: SnapshotManifest | null = null;

      if (snap.manifest && typeof snap.manifest === 'object' && 'files' in snap.manifest) {
        const manifest = snap.manifest as unknown as SnapshotManifest;
        restoredManifest = manifest;
        const manifestPaths = new Set(manifest.files.map((f) => f.path));

        // 1. Remove em lote arquivos que foram adicionados posteriormente e não existem neste snapshot (evita query N+1)
        await tx.projectFile.deleteMany({
          where: {
            projectId,
            path: { notIn: Array.from(manifestPaths) },
          },
        });

        // 2. Restaura integralmente os arquivos presentes no manifesto
        for (const entry of manifest.files) {
          const isText = entry.type === 'text' && entry.content !== undefined;
          const isMain = entry.path === manifest.mainEntryPath;
          if (isMain && entry.content) {
            mainContent = entry.content;
          }

          await tx.projectFile.upsert({
            where: { projectId_path: { projectId, path: entry.path } },
            create: {
              projectId,
              path: entry.path,
              fileType: isText ? 'text' : 'image',
              mimeType: isText
                ? isMain
                  ? 'text/x-tex'
                  : 'text/plain'
                : 'application/octet-stream',
              sizeBytes: isText
                ? BigInt(Buffer.byteLength(entry.content || '', 'utf-8'))
                : BigInt(0),
              content: isText ? entry.content : null,
              contentHash: entry.sha256,
              storageKey: entry.storageKey || null,
            },
            update: {
              fileType: isText ? 'text' : 'image',
              mimeType: isText
                ? isMain
                  ? 'text/x-tex'
                  : 'text/plain'
                : 'application/octet-stream',
              sizeBytes: isText
                ? BigInt(Buffer.byteLength(entry.content || '', 'utf-8'))
                : BigInt(0),
              content: isText ? entry.content : null,
              contentHash: entry.sha256,
              storageKey: entry.storageKey || null,
            },
          });
        }
      } else {
        // Fallback para snapshots legados mono-arquivo
        const mainPath = project.mainEntryPath || 'main.tex';
        const hash = createHash('sha256').update(snap.content, 'utf-8').digest('hex');
        await tx.projectFile.upsert({
          where: { projectId_path: { projectId, path: mainPath } },
          create: {
            projectId,
            path: mainPath,
            fileType: 'text',
            mimeType: 'text/x-tex',
            sizeBytes: BigInt(Buffer.byteLength(snap.content, 'utf-8')),
            content: snap.content,
            contentHash: hash,
          },
          update: {
            content: snap.content,
            contentHash: hash,
            sizeBytes: BigInt(Buffer.byteLength(snap.content, 'utf-8')),
          },
        });
      }

      // 3. Atualiza versão do projeto
      await tx.project.update({
        where: { id: projectId },
        data: { currentVersion: newVersion },
      });

      // 4. Cria snapshot de restauração para auditoria e histórico imutável
      const restoredSnapshot: DocumentSnapshot = {
        id: restoredSnapshotId,
        documentId: projectId,
        version: newVersion,
        content: mainContent,
        savedBy: 'Sistema (Rollback)',
        reason: `rollback_snapshot_${snap.id}`,
        manifest: restoredManifest || undefined,
        createdAt: new Date().toISOString(),
      };

      await tx.documentSnapshot.create({
        data: {
          id: restoredSnapshot.id,
          projectId: restoredSnapshot.documentId,
          version: restoredSnapshot.version,
          content: restoredSnapshot.content,
          savedBy: restoredSnapshot.savedBy,
          reason: restoredSnapshot.reason,
          manifest: restoredManifest
            ? (restoredManifest as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });

      return restoredSnapshot;
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
        manifest: snapshot.manifest
          ? (snapshot.manifest as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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
      manifest: s.manifest ? (s.manifest as unknown as SnapshotManifest) : undefined,
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
      contentHash: f.contentHash,
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
      contentHash: f.contentHash,
      storageKey: f.storageKey,
      content: f.content,
      createdAt: f.createdAt.toISOString(),
    };
  }

  async saveProjectFile(file: ProjectFile): Promise<ProjectFile> {
    const calculatedHash =
      file.contentHash ||
      (file.content !== null && file.content !== undefined
        ? createHash('sha256').update(file.content, 'utf-8').digest('hex')
        : null);

    const upserted = await prisma.projectFile.upsert({
      where: { projectId_path: { projectId: file.documentId, path: file.path } },
      create: {
        id: file.id,
        projectId: file.documentId,
        path: file.path,
        fileType: file.fileType,
        mimeType: file.mimeType,
        sizeBytes: BigInt(file.sizeBytes),
        contentHash: calculatedHash,
        storageKey: file.storageKey,
        content: file.content || null,
      },
      update: {
        fileType: file.fileType,
        mimeType: file.mimeType,
        sizeBytes: BigInt(file.sizeBytes),
        contentHash: calculatedHash,
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
      contentHash: upserted.contentHash,
      storageKey: upserted.storageKey,
      content: upserted.content,
      createdAt: upserted.createdAt.toISOString(),
    };
  }

  async updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile> {
    const hash = createHash('sha256').update(content, 'utf-8').digest('hex');
    const updated = await prisma.projectFile.update({
      where: { id: fileId },
      data: {
        content,
        contentHash: hash,
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
      contentHash: updated.contentHash,
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
        file: comment.file,
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
