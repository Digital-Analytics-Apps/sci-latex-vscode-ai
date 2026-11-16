import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionAuditService } from '../action-audit.service';
import { AiopsService } from '../aiops.service';

describe('AIOps Copilot Service & RCA Decision Engine', () => {
  let mockMcpGateway: any;
  let mockDb: any;
  let service: AiopsService;
  let auditService: ActionAuditService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMcpGateway = {
      queryK8sPods: vi.fn().mockResolvedValue([]),
      queryK8sNodes: vi.fn().mockResolvedValue([]),
      queryPrometheusInstant: vi.fn().mockResolvedValue({
        metricName: 'up',
        query: 'up',
        resultType: 'vector',
        values: [],
      }),
      queryLokiLogs: vi.fn().mockResolvedValue([]),
      queryGlitchTipIssues: vi.fn().mockResolvedValue([]),
      queryOpikTraces: vi.fn().mockResolvedValue([]),
      restartK8sDeployment: vi.fn().mockResolvedValue(true),
    };

    mockDb = {
      aiopsIncident: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      aiopsRcaReport: {
        create: vi.fn(),
      },
      aiopsChatMessage: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      aiopsActionAuditLedger: {
        create: vi.fn(),
      },
    };

    service = new AiopsService(mockMcpGateway as any, mockDb as any);
    auditService = new ActionAuditService(mockMcpGateway as any, mockDb as any);
  });

  it('deve listar incidentes com paginação correta', async () => {
    mockDb.aiopsIncident.findMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        serviceName: 'compiler-worker',
        namespace: 'production',
        severity: 'CRITICAL',
        status: 'OPEN',
        triggerSource: 'LOKI_ERROR',
        triggerMessage: 'Out of memory during compilation',
        traceId: 'trace-123',
        detectedAt: new Date('2026-11-15T12:00:00Z'),
        resolvedAt: null,
      },
    ]);
    mockDb.aiopsIncident.count.mockResolvedValue(1);

    const result = await service.listIncidents({ page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].serviceName).toBe('compiler-worker');
    expect(result.incidents[0].severity).toBe('CRITICAL');
  });

  it('deve classificar como INFRASTRUCTURE quando o pod morreu com ExitCode 137 (OOMKilled)', async () => {
    const incidentId = '22222222-2222-2222-2222-222222222222';
    mockDb.aiopsIncident.findUnique.mockResolvedValue({
      id: incidentId,
      serviceName: 'compiler-worker',
      namespace: 'production',
      severity: 'HIGH',
      status: 'OPEN',
      triggerSource: 'LOKI_ERROR',
      triggerMessage: 'Killed',
      detectedAt: new Date('2026-11-15T12:00:00Z'),
    });

    mockMcpGateway.queryK8sPods.mockResolvedValue([
      {
        podName: 'compiler-worker-abc-123',
        namespace: 'production',
        status: 'CrashLoopBackOff',
        restartCount: 3,
        lastTerminationReason: 'OOMKilled',
        lastTerminationExitCode: 137,
        isReady: false,
        events: [],
      },
    ]);

    mockDb.aiopsRcaReport.create.mockImplementation(({ data }: any) => ({
      id: '33333333-3333-3333-3333-333333333333',
      ...data,
      createdAt: new Date(),
    }));

    const report = await service.runRcaDiagnosis(incidentId);

    expect(report.classification).toBe('INFRASTRUCTURE');
    expect(report.rootCauseSummary).toContain('OOMKilled (ExitCode 137)');
    expect(report.suggestedActions).toHaveLength(1);
    expect(report.suggestedActions[0].actionType).toBe('K8S_DEPLOYMENT_RESTART');
    expect(mockDb.aiopsIncident.update).toHaveBeenCalledWith({
      where: { id: incidentId },
      data: { status: 'INVESTIGATING' },
    });
  });

  it('deve classificar como APPLICATION quando há exceções do GlitchTip e sem OOM no cluster', async () => {
    const incidentId = '44444444-4444-4444-4444-444444444444';
    mockDb.aiopsIncident.findUnique.mockResolvedValue({
      id: incidentId,
      serviceName: 'backend-fastify',
      namespace: 'production',
      severity: 'HIGH',
      status: 'OPEN',
      triggerSource: 'GLITCHTIP',
      triggerMessage: 'Database connection closed',
      detectedAt: new Date('2026-11-15T12:00:00Z'),
    });

    mockMcpGateway.queryGlitchTipIssues.mockResolvedValue([
      {
        issueId: '987',
        title: 'ConnectionTimeoutError: Pool exhausted',
        count: 42,
        lastSeen: new Date().toISOString(),
        firstSeen: new Date().toISOString(),
      },
    ]);

    mockDb.aiopsRcaReport.create.mockImplementation(({ data }: any) => ({
      id: '55555555-5555-5555-5555-555555555555',
      ...data,
      createdAt: new Date(),
    }));

    const report = await service.runRcaDiagnosis(incidentId);

    expect(report.classification).toBe('APPLICATION');
    expect(report.rootCauseSummary).toContain('ConnectionTimeoutError: Pool exhausted');
  });

  it('deve registrar no ActionAuditLedger e executar ação da allowlist com sucesso', async () => {
    mockDb.aiopsActionAuditLedger.create.mockResolvedValue({
      id: 'audit-001',
      actionType: 'K8S_DEPLOYMENT_RESTART',
      targetResource: 'production/compiler-worker',
      executionStatus: 'SUCCESS',
      executedAt: new Date(),
    });

    const result = await auditService.executeRemediationAction(
      'usr-admin-1',
      'admin@scia.system',
      '192.168.1.100',
      {
        actionType: 'K8S_DEPLOYMENT_RESTART',
        targetResource: 'production/compiler-worker',
        parameters: {},
        userConfirmation: true,
      }
    );

    expect(result.executionStatus).toBe('SUCCESS');
    expect(mockMcpGateway.restartK8sDeployment).toHaveBeenCalledWith(
      'production',
      'compiler-worker'
    );
    expect(mockDb.aiopsActionAuditLedger.create).toHaveBeenCalled();
  });

  it('deve retornar histórico de mensagens conversacionais ordenado por data', async () => {
    mockDb.aiopsChatMessage.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        incidentId: null,
        userId: 'usr-admin',
        role: 'user',
        content: 'quantos nós temos hoje?',
        toolCalls: null,
        createdAt: new Date('2026-11-15T10:00:00Z'),
      },
      {
        id: 'msg-2',
        incidentId: null,
        userId: 'usr-admin',
        role: 'assistant',
        content: 'Ambiente Atual: Docker Compose Local',
        toolCalls: { actions: [] },
        createdAt: new Date('2026-11-15T10:00:05Z'),
      },
    ]);

    const history = await service.getChatHistory({ limit: 50 });

    expect(mockDb.aiopsChatMessage.findMany).toHaveBeenCalledWith({
      where: {},
      take: 50,
      orderBy: { createdAt: 'asc' },
    });
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
    expect(history[1].content).toContain('Docker Compose Local');
  });

  describe('chatWithAgent — Roteamento Inteligente e MCP Copilot', () => {
    it('deve responder saudação e apresentar menu operacional quando o usuário disser "Olá"', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-1' });

      const res = await service.chatWithAgent('usr-1', {
        content: 'Olá, como você pode me ajudar?',
      });

      expect(res.message).toContain('AIOps Copilot');
      expect(res.message).toContain('Kubernetes MCP');
      expect(res.message).toContain('Prometheus MCP');
      expect(mockDb.aiopsChatMessage.create).toHaveBeenCalledTimes(2);
    });

    it('deve consultar pods e nós via K8s MCP quando perguntado sobre pods com problemas', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-2' });
      mockMcpGateway.queryK8sPods.mockResolvedValue([
        {
          podName: 'compiler-worker-xyz',
          namespace: 'production',
          status: 'CrashLoopBackOff',
          restartCount: 5,
          lastTerminationReason: 'OOMKilled',
          lastTerminationExitCode: 137,
          isReady: false,
          events: [],
        },
      ]);
      mockMcpGateway.queryK8sNodes.mockResolvedValue([
        {
          nodeName: 'worker-node-1',
          isReady: true,
          memoryPressure: true,
          diskPressure: false,
          pidPressure: false,
        },
      ]);

      const res = await service.chatWithAgent('usr-1', {
        content: 'Liste todos os pods que estão com problemas ou restarts',
      });

      expect(mockMcpGateway.queryK8sPods).toHaveBeenCalled();
      expect(mockMcpGateway.queryK8sNodes).toHaveBeenCalled();
      expect(res.message).toContain('compiler-worker-xyz');
      expect(res.message).toContain('CrashLoopBackOff');
      expect(res.message).toContain('worker-node-1');
      expect(res.suggestedActions).toBeDefined();
      expect(res.suggestedActions?.[0]).toMatchObject({
        actionType: 'K8S_DEPLOYMENT_RESTART',
      });
    });

    it('deve responder com status de Docker Compose e contêineres quando perguntado "quantos nos temos hoje?" em ambiente sem K8s', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-k8s-nodes-dc' });
      mockMcpGateway.queryK8sPods.mockResolvedValue([]);
      mockMcpGateway.queryK8sNodes.mockResolvedValue([]);

      const res = await service.chatWithAgent('usr-1', {
        content: 'quantos nos temos hoje?',
      });

      expect(mockMcpGateway.queryK8sPods).toHaveBeenCalled();
      expect(mockMcpGateway.queryK8sNodes).toHaveBeenCalled();
      expect(res.message).toContain('Ambiente Atual: Docker Compose Local');
      expect(res.message).toContain('0 nós ativos');
      expect(res.message).toContain('10 contêineres Docker independentes');
    });

    it('deve consultar logs via Loki MCP quando perguntado sobre erros nos logs', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-3' });
      mockMcpGateway.queryLokiLogs.mockResolvedValue([
        {
          streamLabels: { app: 'compiler-worker' },
          entries: [
            {
              timestamp: '2026-11-15T12:00:00Z',
              line: 'LaTeX error: fatal runaway argument',
              level: 'ERROR',
            },
          ],
        },
      ]);

      const res = await service.chatWithAgent('usr-1', {
        content: 'Quais são os erros mais frequentes registrados nos logs?',
      });

      expect(mockMcpGateway.queryLokiLogs).toHaveBeenCalled();
      expect(res.message).toContain('Análise de Logs Estruturados (Loki MCP)');
      expect(res.message).toContain('runaway argument');
    });

    it('deve consultar métricas do Prometheus quando perguntado sobre pool de conexões do postgres', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-4' });
      mockMcpGateway.queryPrometheusInstant.mockResolvedValue({
        metricName: 'process_resident_memory_bytes',
        query: 'process_resident_memory_bytes or up',
        resultType: 'vector',
        values: [
          {
            labels: { job: 'postgres-pool', instance: 'pg-primary' },
            value: [1763212800, '20971520'],
          },
        ],
      });

      const res = await service.chatWithAgent('usr-1', {
        content: 'Como está o pool de conexões do postgres e uso de memória?',
      });

      expect(mockMcpGateway.queryPrometheusInstant).toHaveBeenCalled();
      expect(res.message).toContain('Prometheus MCP');
      expect(res.message).toContain('postgres-pool');
      expect(res.message).toContain('20.0 MB');
    });

    it('deve consultar exceções do GlitchTip quando perguntado sobre stacktraces', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-5' });
      mockMcpGateway.queryGlitchTipIssues.mockResolvedValue([
        {
          issueId: '101',
          title: 'TypeError: Cannot read property of undefined',
          culprit: 'compiler.ts:42',
          count: 14,
          lastSeen: new Date().toISOString(),
          firstSeen: new Date().toISOString(),
        },
      ]);

      const res = await service.chatWithAgent('usr-1', {
        content: 'Mostre as stacktraces recentes capturadas no GlitchTip',
      });

      expect(mockMcpGateway.queryGlitchTipIssues).toHaveBeenCalled();
      expect(res.message).toContain('GlitchTip MCP');
      expect(res.message).toContain('TypeError: Cannot read property of undefined');
      expect(res.message).toContain('compiler.ts:42');
    });

    it('deve propor ação com Human-in-the-Loop quando o usuário pedir para reiniciar um serviço', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-6' });

      const res = await service.chatWithAgent('usr-1', {
        content: 'Reinicie o deployment do compiler-worker agora',
      });

      expect(res.message).toContain('Proposta de Ação e Remediação (Human-in-the-Loop)');
      expect(res.suggestedActions).toHaveLength(1);
      expect(res.suggestedActions?.[0]).toMatchObject({
        actionType: 'K8S_DEPLOYMENT_RESTART',
        commandPreview: expect.stringContaining(
          'kubectl rollout restart deployment/compiler-worker'
        ),
      });
    });

    it('deve realizar visão geral cross-telemetria em prompt de saúde geral do sistema', async () => {
      mockDb.aiopsChatMessage.create.mockResolvedValue({ id: 'msg-7' });

      const res = await service.chatWithAgent('usr-1', {
        content: 'Como está a saúde geral de todo o sistema?',
      });

      expect(mockMcpGateway.queryK8sPods).toHaveBeenCalled();
      expect(mockMcpGateway.queryK8sNodes).toHaveBeenCalled();
      expect(mockMcpGateway.queryPrometheusInstant).toHaveBeenCalled();
      expect(mockMcpGateway.queryLokiLogs).toHaveBeenCalled();
      expect(mockMcpGateway.queryGlitchTipIssues).toHaveBeenCalled();
      expect(mockMcpGateway.queryOpikTraces).toHaveBeenCalled();
      expect(res.message).toContain('Panorama Geral de Saúde do Sistema');
    });
  });
});
