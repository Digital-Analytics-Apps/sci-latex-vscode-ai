import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminService } from '../admin.service';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    session: {
      count: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    projectStage: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../documents/documents.websocket', () => ({
  getLiveWebSocketStats: vi.fn(() => ({
    activeRoomsCount: 4,
    connectedSocketsCount: 10,
    podId: 'pod-test-1',
  })),
}));

vi.mock('../../documents/documents.service', () => ({
  defaultDocumentsService: {
    getMemoryStats: vi.fn(() => ({
      activeDocumentsCount: 4,
      pendingCheckpointsCount: 1,
      totalPendingOps: 5,
    })),
  },
}));

describe('AdminService — SCIA Admin Center', () => {
  let adminService: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    adminService = new AdminService();
  });

  describe('getOverview', () => {
    it('deve retornar métricas gerais e lista horária com status OPERATIONAL', async () => {
      vi.mocked(prisma.session.count).mockResolvedValue(15);
      vi.mocked(prisma.project.count).mockResolvedValue(47);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(2);

      const overview = await adminService.getOverview();

      expect(overview.systemStatus).toBe('OPERATIONAL');
      expect(overview.activeUsersCount).toBe(15);
      expect(overview.activeProjectsCount).toBe(47);
      expect(overview.activeWebSocketsCount).toBe(10);
      expect(overview.errorsLastHourCount).toBe(2);
      expect(overview.hourlyActivity).toHaveLength(7);
      expect(overview.hourlyActivity[0]).toHaveProperty('hour');
      expect(overview.hourlyActivity[0]).toHaveProperty('requestsCount');
    });

    it('deve marcar status DEGRADED se houver mais de 10 erros na última hora', async () => {
      vi.mocked(prisma.session.count).mockResolvedValue(5);
      vi.mocked(prisma.project.count).mockResolvedValue(10);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(12);

      const overview = await adminService.getOverview();
      expect(overview.systemStatus).toBe('DEGRADED');
    });
  });

  describe('getWorkflow', () => {
    it('deve retornar a distribuição exata das 6 etapas canônicas e gargalos', async () => {
      vi.mocked(prisma.project.count)
        .mockResolvedValueOnce(47) // totalProjects
        .mockResolvedValueOnce(3) // stagnantProjects
        .mockResolvedValueOnce(2); // pendingNit

      vi.mocked(prisma.projectStage.groupBy).mockResolvedValue([
        { order: 1, _count: { projectId: 18 } } as any,
        { order: 2, _count: { projectId: 12 } } as any,
        { order: 3, _count: { projectId: 9 } } as any,
      ]);

      vi.mocked(prisma.projectStage.count).mockResolvedValue(4); // delayedStages

      const workflow = await adminService.getWorkflow();

      expect(workflow.totalProjects).toBe(47);
      expect(workflow.stagesDistribution).toHaveLength(6);
      expect(workflow.stagesDistribution[0].stageNumber).toBe(1);
      expect(workflow.stagesDistribution[0].projectsCount).toBe(18);
      expect(workflow.stagesDistribution[5].stageNumber).toBe(6);
      expect(workflow.stagesDistribution[5].projectsCount).toBe(0);
      expect(workflow.bottlenecks.delayedProjectsCount).toBe(4);
      expect(workflow.bottlenecks.pendingNitValidationsCount).toBe(2);
    });
  });

  describe('getInfrastructure', () => {
    it('deve retornar métricas dos 5 serviços com links do Grafana e Opik', async () => {
      const infra = await adminService.getInfrastructure();

      expect(infra.services.backendFastify.status).toBe('UP');
      expect(infra.services.backendFastify.grafanaUrl).toContain('grafana');
      expect(infra.services.postgres.maxConnections).toBe(100);
      expect(infra.services.aiService.opikUrl).toContain('5174');
    });
  });

  describe('getCollaboration', () => {
    it('deve retornar métricas de colaboração em tempo real e distribuição por pod', async () => {
      const collab = await adminService.getCollaboration();

      expect(collab.activeDocumentsCount).toBe(4);
      expect(collab.connectedUsersCount).toBe(10);
      expect(collab.avgMemoryProcessingMs).toBeLessThan(2);
      expect(collab.documentsByPod).toHaveLength(1);
      expect(collab.documentsByPod[0].documentsCount).toBe(4);
    });
  });

  describe('getActivity', () => {
    it('deve retornar lista de eventos mapeados a partir dos logs de auditoria', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        {
          id: 'log-1',
          createdAt: new Date('2026-11-12T20:45:00Z'),
          action: 'REVIEW_COMPLETED',
          entityType: 'Project',
          entityId: 'proj-12345678',
          details: null,
          userId: 'user-1',
          user: { name: 'Dr. Revisor', email: 'revisor@scia.edu' },
        } as any,
        {
          id: 'log-2',
          createdAt: new Date('2026-11-12T20:35:00Z'),
          action: 'LATEX_COMPILATION_ERROR',
          entityType: 'Project',
          entityId: 'proj-87654321',
          details: null,
          userId: null,
          user: null,
        } as any,
      ]);

      const activity = await adminService.getActivity();

      expect(activity.events).toHaveLength(2);
      expect(activity.events[0].title).toBe('REVIEW_COMPLETED');
      expect(activity.events[0].severity).toBe('INFO');
      expect(activity.events[1].category).toBe('COMPILER');
      expect(activity.events[1].severity).toBe('ERROR');
    });
  });
});
