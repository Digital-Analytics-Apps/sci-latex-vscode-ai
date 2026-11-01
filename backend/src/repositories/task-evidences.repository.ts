import { EvidenceStatus, EvidenceType, TaskEvidence } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateEvidenceData {
  taskId: string;
  projectId: string;
  uploadedById: string;
  type: EvidenceType;
  title: string;
  status?: EvidenceStatus;
  url?: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: bigint;
}

export interface ITaskEvidencesRepository {
  create(data: CreateEvidenceData): Promise<TaskEvidence>;
  findById(id: string): Promise<TaskEvidence | null>;
  updateStatus(id: string, status: EvidenceStatus, sizeBytes?: bigint): Promise<TaskEvidence>;
  findManyByTaskId(taskId: string, status?: EvidenceStatus): Promise<TaskEvidence[]>;
  delete(id: string): Promise<TaskEvidence>;
}

export class PrismaTaskEvidencesRepository implements ITaskEvidencesRepository {
  /**
   * Persiste uma nova evidência no banco (inicialmente PENDING para binários ou CONFIRMED para links).
   */
  async create(data: CreateEvidenceData): Promise<TaskEvidence> {
    return prisma.taskEvidence.create({
      data: {
        taskId: data.taskId,
        projectId: data.projectId,
        uploadedById: data.uploadedById,
        type: data.type,
        status: data.status ?? EvidenceStatus.PENDING,
        title: data.title,
        url: data.url,
        storageKey: data.storageKey,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      },
    });
  }

  /**
   * Busca uma evidência pelo seu identificador único, incluindo dados do autor que fez o upload.
   */
  async findById(id: string): Promise<TaskEvidence | null> {
    return prisma.taskEvidence.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Atualiza o status da evidência (ex: transição de PENDING para CONFIRMED) e registra o tamanho real em bytes.
   */
  async updateStatus(
    id: string,
    status: EvidenceStatus,
    sizeBytes?: bigint
  ): Promise<TaskEvidence> {
    return prisma.taskEvidence.update({
      where: { id },
      data: {
        status,
        ...(sizeBytes !== undefined ? { sizeBytes } : {}),
      },
    });
  }

  /**
   * Retorna a lista de evidências de uma tarefa, ordenadas da mais recente para a mais antiga.
   * Opcionalmente filtra por status (ex: apenas evidências CONFIRMED).
   */
  async findManyByTaskId(taskId: string, status?: EvidenceStatus): Promise<TaskEvidence[]> {
    return prisma.taskEvidence.findMany({
      where: {
        taskId,
        ...(status ? { status } : {}),
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Remove a evidência do banco relacional de forma definitiva.
   */
  async delete(id: string): Promise<TaskEvidence> {
    return prisma.taskEvidence.delete({
      where: { id },
    });
  }
}
