import { randomUUID } from 'node:crypto';
import { EvidenceStatus, EvidenceType, TaskEvidence } from '@prisma/client';
import { prisma } from '../../db/prisma';
import {
  deleteFromMinio,
  generatePresignedGetUrl,
  generatePresignedPutUrl,
  MINIO_BUCKET,
  minioClient,
} from '../../infra/minio';
import {
  ITaskEvidencesRepository,
  PrismaTaskEvidencesRepository,
} from '../../repositories/task-evidences.repository';

export interface PresignUploadDTO {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  type: 'IMAGE' | 'PDF';
  title?: string;
}

export interface AddLinkEvidenceDTO {
  title: string;
  url: string;
}

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_IMAGE_MIMES: Record<string, true> = {
  'image/png': true,
  'image/jpeg': true,
  'image/jpg': true,
  'image/webp': true,
  'image/svg+xml': true,
};
const ALLOWED_PDF_MIMES: Record<string, true> = {
  'application/pdf': true,
};

export class TaskEvidencesService {
  constructor(
    private readonly evidencesRepository: ITaskEvidencesRepository = new PrismaTaskEvidencesRepository()
  ) {}
  /**
   * Validação de Governança Institucional:
   * Evidências de tarefas são restritas exclusivamente às Etapas 1 (Planejamento) e 2 (Desenvolvimento Experimental).
   * As etapas subsequentes (Escrita, Revisão, NIT, Congresso) possuem fluxos próprios baseados em TeX e Gatekeepers.
   */
  private async validateTaskInAllowedStage(projectId: string, taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { stage: true },
    });

    if (!task || task.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: Tarefa não encontrada.');
    }

    if (!task.stage) {
      throw new Error('TASK_STAGE_NOT_FOUND: A tarefa não está vinculada a uma etapa.');
    }

    if (task.stage.order !== 1 && task.stage.order !== 2) {
      throw new Error(
        'EVIDENCE_NOT_ALLOWED_STAGE: Evidências são permitidas apenas para tarefas das Etapas 1 (Planejamento) e 2 (Desenvolvimento Experimental).'
      );
    }

    return task;
  }

  /**
   * Fase 1 do Upload Direto: Valida regras de negócio, reserva a chave no MinIO e gera a URL pré-assinada de PUT.
   * Cria o registro da evidência no PostgreSQL com status 'PENDING' para evitar arquivos órfãos.
   */
  async presignUpload(
    projectId: string,
    taskId: string,
    userId: string,
    dto: PresignUploadDTO
  ): Promise<{ evidenceId: string; uploadUrl: string; storageKey: string }> {
    await this.validateTaskInAllowedStage(projectId, taskId);

    if (dto.type === 'IMAGE') {
      if (!ALLOWED_IMAGE_MIMES[dto.mimeType.toLowerCase()]) {
        throw new Error(
          'INVALID_MIME_TYPE: Tipo de imagem não suportado. Formatos aceitos: PNG, JPG, JPEG, WEBP, SVG.'
        );
      }
      if (dto.sizeBytes > MAX_IMAGE_BYTES) {
        throw new Error('FILE_TOO_LARGE: Imagens devem ter no máximo 25 MB.');
      }
    } else if (dto.type === 'PDF') {
      if (!ALLOWED_PDF_MIMES[dto.mimeType.toLowerCase()]) {
        throw new Error('INVALID_MIME_TYPE: Apenas arquivos PDF são aceitos.');
      }
      if (dto.sizeBytes > MAX_PDF_BYTES) {
        throw new Error('FILE_TOO_LARGE: PDFs devem ter no máximo 100 MB.');
      }
    } else {
      throw new Error('INVALID_EVIDENCE_TYPE: Tipo de evidência inválido para upload.');
    }

    const evidenceId = randomUUID();
    const sanitizedName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `projects/${projectId}/tasks/${taskId}/evidences/${evidenceId}-${sanitizedName}`;

    const uploadUrl = await generatePresignedPutUrl(storageKey, 900);

    await this.evidencesRepository.create({
      id: evidenceId,
      taskId,
      projectId,
      uploadedById: userId,
      type: dto.type === 'IMAGE' ? EvidenceType.IMAGE : EvidenceType.PDF,
      status: EvidenceStatus.PENDING,
      title: dto.title || dto.fileName,
      storageKey,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: BigInt(dto.sizeBytes),
    });

    return { evidenceId, uploadUrl, storageKey };
  }

  /**
   * Fase 2 do Upload Direto: O frontend avisa que o arquivo foi transmitido para o MinIO.
   * O backend executa statObject no MinIO para conferir a integridade do arquivo antes de promover a evidência para 'CONFIRMED'.
   */
  async confirmUpload(
    projectId: string,
    taskId: string,
    evidenceId: string
  ): Promise<TaskEvidence> {
    const evidence = await this.evidencesRepository.findById(evidenceId);
    if (!evidence || evidence.projectId !== projectId || evidence.taskId !== taskId) {
      throw new Error('EVIDENCE_NOT_FOUND: Evidência não encontrada.');
    }

    if (evidence.status === EvidenceStatus.CONFIRMED) {
      return evidence;
    }

    if (!evidence.storageKey) {
      throw new Error('EVIDENCE_STORAGE_KEY_MISSING: Chave de armazenamento ausente.');
    }

    let stat;
    try {
      stat = await minioClient.statObject(MINIO_BUCKET, evidence.storageKey);
    } catch {
      throw new Error('MINIO_OBJECT_NOT_FOUND: O arquivo ainda não foi recebido no MinIO.');
    }

    return this.evidencesRepository.updateStatus(
      evidenceId,
      EvidenceStatus.CONFIRMED,
      BigInt(stat.size)
    );
  }

  /**
   * Cadastra uma evidência do tipo LINK (ex: repositório GitHub, Google Colab, dataset no Zenodo).
   * Como não envolve binário no MinIO, o registro nasce diretamente como 'CONFIRMED'.
   */
  async addLink(
    projectId: string,
    taskId: string,
    userId: string,
    dto: AddLinkEvidenceDTO
  ): Promise<TaskEvidence> {
    await this.validateTaskInAllowedStage(projectId, taskId);

    try {
      const parsedUrl = new URL(dto.url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error();
      }
    } catch {
      throw new Error('INVALID_URL: O link deve ser uma URL válida (http:// ou https://).');
    }

    return this.evidencesRepository.create({
      taskId,
      projectId,
      uploadedById: userId,
      type: EvidenceType.LINK,
      status: EvidenceStatus.CONFIRMED,
      title: dto.title,
      url: dto.url,
    });
  }

  /**
   * Lista todas as evidências com status 'CONFIRMED' associadas à tarefa.
   * Para cada imagem ou PDF armazenado no MinIO, gera uma URL pré-assinada de GET válida por 1 hora para renderização segura.
   */
  async listEvidences(
    projectId: string,
    taskId: string
  ): Promise<Array<TaskEvidence & { downloadUrl?: string }>> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task || task.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: Tarefa não encontrada.');
    }

    const evidences = await this.evidencesRepository.findManyByTaskId(
      taskId,
      EvidenceStatus.CONFIRMED
    );

    return Promise.all(
      evidences.map(async (ev) => {
        if (ev.storageKey && (ev.type === EvidenceType.IMAGE || ev.type === EvidenceType.PDF)) {
          const downloadUrl = await generatePresignedGetUrl(ev.storageKey, 3600);
          return { ...ev, downloadUrl };
        }
        return ev;
      })
    );
  }

  /**
   * Remove a evidência do banco relacional e purga o binário correspondente no bucket MinIO.
   */
  async deleteEvidence(projectId: string, taskId: string, evidenceId: string): Promise<void> {
    const evidence = await this.evidencesRepository.findById(evidenceId);
    if (!evidence || evidence.projectId !== projectId || evidence.taskId !== taskId) {
      throw new Error('EVIDENCE_NOT_FOUND: Evidência não encontrada.');
    }

    if (evidence.storageKey) {
      await deleteFromMinio(evidence.storageKey).catch(() => {});
    }

    await this.evidencesRepository.delete(evidenceId);
  }
}
