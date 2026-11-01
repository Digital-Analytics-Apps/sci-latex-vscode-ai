import { EvidenceStatus, EvidenceType, TaskEvidence } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ITaskEvidencesRepository } from '../../../repositories/task-evidences.repository';
import { TaskEvidencesService } from '../task-evidences.service';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../infra/minio', () => ({
  generatePresignedPutUrl: vi.fn().mockResolvedValue('https://minio.test/upload-url'),
  generatePresignedGetUrl: vi.fn().mockResolvedValue('https://minio.test/download-url'),
  deleteFromMinio: vi.fn().mockResolvedValue(undefined),
  minioClient: {
    statObject: vi.fn(),
  },
  MINIO_BUCKET: 'collab-assets',
}));

import { prisma } from '../../../db/prisma';
import { minioClient } from '../../../infra/minio';

describe('TaskEvidencesService (Unit Tests)', () => {
  let mockEvidencesRepository: ITaskEvidencesRepository;
  let service: TaskEvidencesService;

  const validStage2Task = {
    id: 'task-1',
    projectId: 'proj-1',
    assignedToId: 'user-1',
    stageId: 'stage-2',
    title: 'Executar Benchmarks de Latência',
    status: 'IN_PROGRESS' as const,
    startDate: null,
    startedAt: null,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    stage: {
      id: 'stage-2',
      projectId: 'proj-1',
      title: 'Desenvolvimento Experimental',
      description: null,
      order: 2,
      plannedStartAt: null,
      plannedEndAt: null,
      plannedCompletionDate: null,
      startedAt: null,
      completedAt: null,
      status: 'IN_PROGRESS' as const,
      isGatekeeper: false,
      gatekeeperType: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEvidencesRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      findManyByTaskId: vi.fn(),
      delete: vi.fn(),
    };
    service = new TaskEvidencesService(mockEvidencesRepository);
  });

  describe('presignUpload', () => {
    it('deve rejeitar se a tarefa não pertencer às Etapas 1 ou 2', async () => {
      const stage3Task = {
        ...validStage2Task,
        stage: { ...validStage2Task.stage, order: 3, title: 'Escrita do Artigo' },
      };
      vi.mocked(prisma.task.findUnique).mockResolvedValue(stage3Task);

      await expect(
        service.presignUpload('proj-1', 'task-1', 'user-1', {
          fileName: 'grafico.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
          type: 'IMAGE',
        })
      ).rejects.toThrow('EVIDENCE_NOT_ALLOWED_STAGE');
    });

    it('deve rejeitar imagem com formato inválido', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(validStage2Task);

      await expect(
        service.presignUpload('proj-1', 'task-1', 'user-1', {
          fileName: 'malicioso.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 1024,
          type: 'IMAGE',
        })
      ).rejects.toThrow('INVALID_MIME_TYPE');
    });

    it('deve rejeitar imagem maior que 25 MB', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(validStage2Task);

      await expect(
        service.presignUpload('proj-1', 'task-1', 'user-1', {
          fileName: 'grafico_gigante.png',
          mimeType: 'image/png',
          sizeBytes: 26 * 1024 * 1024,
          type: 'IMAGE',
        })
      ).rejects.toThrow('FILE_TOO_LARGE');
    });

    it('deve gerar URL pré-assinada e registrar evidência PENDING na pasta do projeto', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(validStage2Task);

      const fakeEvidence: TaskEvidence = {
        id: 'evidence-123',
        taskId: 'task-1',
        projectId: 'proj-1',
        uploadedById: 'user-1',
        type: EvidenceType.IMAGE,
        status: EvidenceStatus.PENDING,
        title: 'Gráfico de Latência',
        url: null,
        storageKey: 'projects/proj-1/tasks/task-1/evidences/evidence-123-grafico.png',
        fileName: 'grafico.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(2048),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockEvidencesRepository.create).mockResolvedValue(fakeEvidence);

      const result = await service.presignUpload('proj-1', 'task-1', 'user-1', {
        fileName: 'grafico.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        type: 'IMAGE',
        title: 'Gráfico de Latência',
      });

      expect(result.uploadUrl).toBe('https://minio.test/upload-url');
      expect(result.storageKey).toMatch(
        /^projects\/proj-1\/tasks\/task-1\/evidences\/.+-grafico\.png$/
      );
      expect(mockEvidencesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          projectId: 'proj-1',
          status: EvidenceStatus.PENDING,
          type: EvidenceType.IMAGE,
        })
      );
    });
  });

  describe('confirmUpload', () => {
    it('deve confirmar evidência quando objeto existe no MinIO', async () => {
      const pendingEvidence: TaskEvidence = {
        id: 'evidence-1',
        taskId: 'task-1',
        projectId: 'proj-1',
        uploadedById: 'user-1',
        type: EvidenceType.PDF,
        status: EvidenceStatus.PENDING,
        title: 'Relatório Benchmark',
        url: null,
        storageKey: 'projects/proj-1/tasks/task-1/evidences/evidence-1-relatorio.pdf',
        fileName: 'relatorio.pdf',
        mimeType: 'application/pdf',
        sizeBytes: BigInt(5000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockEvidencesRepository.findById).mockResolvedValue(pendingEvidence);
      vi.mocked(minioClient.statObject).mockResolvedValue({
        size: 5120,
        metaData: {},
        lastModified: new Date(),
        etag: 'etag123',
        versionId: null,
      });

      const confirmedEvidence: TaskEvidence = {
        ...pendingEvidence,
        status: EvidenceStatus.CONFIRMED,
        sizeBytes: BigInt(5120),
      };
      vi.mocked(mockEvidencesRepository.updateStatus).mockResolvedValue(confirmedEvidence);

      const result = await service.confirmUpload('proj-1', 'task-1', 'evidence-1');

      expect(minioClient.statObject).toHaveBeenCalledWith(
        'collab-assets',
        'projects/proj-1/tasks/task-1/evidences/evidence-1-relatorio.pdf'
      );
      expect(mockEvidencesRepository.updateStatus).toHaveBeenCalledWith(
        'evidence-1',
        EvidenceStatus.CONFIRMED,
        BigInt(5120)
      );
      expect(result.status).toBe(EvidenceStatus.CONFIRMED);
    });

    it('deve rejeitar se o MinIO acusar ausência do arquivo', async () => {
      const pendingEvidence: TaskEvidence = {
        id: 'evidence-1',
        taskId: 'task-1',
        projectId: 'proj-1',
        uploadedById: 'user-1',
        type: EvidenceType.IMAGE,
        status: EvidenceStatus.PENDING,
        title: 'Print',
        url: null,
        storageKey: 'projects/proj-1/tasks/task-1/evidences/evidence-1-print.png',
        fileName: 'print.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(100),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockEvidencesRepository.findById).mockResolvedValue(pendingEvidence);
      vi.mocked(minioClient.statObject).mockRejectedValue(new Error('NotFound'));

      await expect(service.confirmUpload('proj-1', 'task-1', 'evidence-1')).rejects.toThrow(
        'MINIO_OBJECT_NOT_FOUND'
      );
    });
  });

  describe('addLink', () => {
    it('deve adicionar link externo diretamente como CONFIRMED', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(validStage2Task);

      const linkEvidence: TaskEvidence = {
        id: 'link-1',
        taskId: 'task-1',
        projectId: 'proj-1',
        uploadedById: 'user-1',
        type: EvidenceType.LINK,
        status: EvidenceStatus.CONFIRMED,
        title: 'Notebook Colab',
        url: 'https://colab.research.google.com/drive/xyz',
        storageKey: null,
        fileName: null,
        mimeType: null,
        sizeBytes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockEvidencesRepository.create).mockResolvedValue(linkEvidence);

      const result = await service.addLink('proj-1', 'task-1', 'user-1', {
        title: 'Notebook Colab',
        url: 'https://colab.research.google.com/drive/xyz',
      });

      expect(result.type).toBe(EvidenceType.LINK);
      expect(result.status).toBe(EvidenceStatus.CONFIRMED);
      expect(mockEvidencesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EvidenceType.LINK,
          status: EvidenceStatus.CONFIRMED,
          url: 'https://colab.research.google.com/drive/xyz',
        })
      );
    });

    it('deve rejeitar URLs inválidas', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(validStage2Task);

      await expect(
        service.addLink('proj-1', 'task-1', 'user-1', {
          title: 'Link Quebrado',
          url: 'javascript:alert(1)',
        })
      ).rejects.toThrow('INVALID_URL');
    });
  });

  describe('listEvidences', () => {
    it('deve retornar evidências confirmadas com URLs pré-assinadas de download', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(validStage2Task);

      const confirmedEvidences: TaskEvidence[] = [
        {
          id: 'ev-1',
          taskId: 'task-1',
          projectId: 'proj-1',
          uploadedById: 'user-1',
          type: EvidenceType.IMAGE,
          status: EvidenceStatus.CONFIRMED,
          title: 'Gráfico',
          url: null,
          storageKey: 'projects/proj-1/tasks/task-1/evidences/ev-1.png',
          fileName: 'grafico.png',
          mimeType: 'image/png',
          sizeBytes: BigInt(2048),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ev-2',
          taskId: 'task-1',
          projectId: 'proj-1',
          uploadedById: 'user-1',
          type: EvidenceType.LINK,
          status: EvidenceStatus.CONFIRMED,
          title: 'Repositório GitHub',
          url: 'https://github.com/projeto/experimento',
          storageKey: null,
          fileName: null,
          mimeType: null,
          sizeBytes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockEvidencesRepository.findManyByTaskId).mockResolvedValue(confirmedEvidences);

      const result = await service.listEvidences('proj-1', 'task-1');

      expect(result).toHaveLength(2);
      expect(result[0].downloadUrl).toBe('https://minio.test/download-url');
      expect(result[1].downloadUrl).toBeUndefined();
    });
  });

  describe('deleteEvidence', () => {
    it('deve remover objeto do MinIO e excluir registro', async () => {
      const evidence: TaskEvidence = {
        id: 'ev-1',
        taskId: 'task-1',
        projectId: 'proj-1',
        uploadedById: 'user-1',
        type: EvidenceType.IMAGE,
        status: EvidenceStatus.CONFIRMED,
        title: 'Gráfico',
        url: null,
        storageKey: 'projects/proj-1/tasks/task-1/evidences/ev-1.png',
        fileName: 'grafico.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(2048),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockEvidencesRepository.findById).mockResolvedValue(evidence);

      await service.deleteEvidence('proj-1', 'task-1', 'ev-1');

      expect(mockEvidencesRepository.delete).toHaveBeenCalledWith('ev-1');
    });
  });
});
