import type { AdminCollaborationData, AdminInfrastructureData } from '../../api/adminCenterApi';
import type {
  CommunicationEdge,
  RequestSimulationScenario,
  ServiceNode,
} from './types';

export const buildTopologyNodesAndEdges = (
  infraData?: AdminInfrastructureData,
  collabData?: AdminCollaborationData,
  activeTraceStep?: {
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    direction: 'forward' | 'backward';
    particleColor?: string;
    processingNodeIds?: string[];
  } | null,
  activeProcessingNodeIds: string[] = []
): { nodes: ServiceNode[]; edges: CommunicationEdge[] } => {
  const services = infraData?.services;

  const isNodeActive = (id: string) => {
    if (activeProcessingNodeIds.includes(id)) {
      return true;
    }
    if (activeTraceStep?.processingNodeIds?.includes(id)) {
      return true;
    }
    if (!activeTraceStep) return false;
    return (
      activeTraceStep.sourceNodeId === id || activeTraceStep.targetNodeId === id
    );
  };

  // Coordenadas com espaçamento arquitetural amplo (250px de vão horizontal e 130px de vão vertical)
  const COL_1_X = 80;    // Coluna Esquerda: Compiler & MinIO S3
  const COL_2_X = 620;   // Coluna Central: Frontend SPA, Gateway Fastify, PostgreSQL, Redis
  const COL_3_X = 1160;  // Coluna Direita: SciAI Engine & Opik LLMOps

  const ROW_1_Y = 50;    // Nível 1: Client Web
  const ROW_2_Y = 340;   // Nível 2: API Gateway / Core
  const ROW_3_Y = 660;   // Nível 3: Microservices & Primary DB
  const ROW_4_Y = 980;   // Nível 4: Storage & Observability

  const nodes: ServiceNode[] = [
    // 1. Frontend Client
    {
      id: 'client-frontend',
      type: 'serviceNode',
      position: { x: COL_2_X, y: ROW_1_Y },
      data: {
        id: 'client-frontend',
        name: 'SCIA Frontend SPA',
        subTitle: 'React 19 / Vite / Material UI',
        category: 'frontend',
        status: 'UP',
        isProcessing: isNodeActive('client-frontend'),
        metrics: [
          {
            label: 'Usuários Ativos',
            value: collabData?.connectedUsersCount ?? 0,
            highlight: true,
          },
          {
            label: 'Artigos em Edição',
            value: collabData?.activeDocumentsCount ?? 0,
          },
        ],
      },
    },

    // 2. Backend Gateway & OT Engine
    {
      id: 'backend-fastify',
      type: 'serviceNode',
      position: { x: COL_2_X, y: ROW_2_Y },
      data: {
        id: 'backend-fastify',
        name: 'Backend Gateway',
        subTitle: 'Fastify / Single-Writer OT / Node.js',
        category: 'gateway',
        status: services?.backendFastify?.status ?? 'UP',
        isProcessing: isNodeActive('backend-fastify'),
        metrics: [
          {
            label: 'Documentos (Owner)',
            value: `${collabData?.activeDocumentsCount ?? 0} salas OT`,
            highlight: true,
          },
          {
            label: 'Throughput',
            value: `${services?.backendFastify?.rps ?? 0} RPS`,
          },
          {
            label: 'Latência p95',
            value: `${services?.backendFastify?.latencyP95Ms ?? 0} ms`,
          },
          {
            label: 'Réplicas Pods',
            value:
              collabData?.documentsByPod && collabData.documentsByPod.length > 0
                ? `${collabData.documentsByPod.length} Pod(s) Ativo(s)`
                : '1 Pod K8s',
            highlight: true,
          },
          {
            label: 'Event Loop Lag',
            value: `${services?.backendFastify?.eventLoopLagMs ?? 0} ms`,
          },
        ],
      },
    },

    // 3. Compiler Worker
    {
      id: 'compiler-worker',
      type: 'serviceNode',
      position: { x: COL_1_X, y: ROW_3_Y },
      data: {
        id: 'compiler-worker',
        name: 'Compiler Worker',
        subTitle: 'TeX Live Sandbox / cgroups',
        category: 'service',
        status: services?.compiler?.status ?? 'UP',
        isProcessing: isNodeActive('compiler-worker'),
        metrics: [
          {
            label: 'Processando (Ativos)',
            value: isNodeActive('compiler-worker')
              ? `${Math.max(services?.compiler?.activeJobs ?? 1, 1)} job(s)`
              : `${services?.compiler?.activeJobs ?? 0} job(s)`,
            highlight: isNodeActive('compiler-worker') || (services?.compiler?.activeJobs ?? 0) > 0,
          },
          {
            label: 'Em Fila (Aguardando)',
            value: `${services?.compiler?.queueLength ?? 0} job(s)`,
            highlight: (services?.compiler?.queueLength ?? 0) > 3,
          },
          {
            label: 'Tempo Médio',
            value: `${((services?.compiler?.avgDurationMs ?? 0) / 1000).toFixed(1)}s`,
          },
          {
            label: 'Timeouts (24h)',
            value: services?.compiler?.timeoutsLast24h ?? 0,
          },
        ],
      },
    },

    // 4. PostgreSQL & PgBouncer
    {
      id: 'postgres-db',
      type: 'serviceNode',
      position: { x: COL_2_X, y: ROW_3_Y },
      data: {
        id: 'postgres-db',
        name: 'PostgreSQL & PgBouncer',
        subTitle: 'Postgres 16 / Pool :6543 (ADR-015)',
        category: 'storage',
        status: services?.postgres?.status ?? 'UP',
        isProcessing: isNodeActive('postgres-db'),
        metrics: [
          {
            label: 'Conexões Ativas',
            value: `${services?.postgres?.activeConnections ?? 0} / ${services?.postgres?.maxConnections ?? 50}`,
            highlight: true,
          },
          {
            label: 'Queries Lentas (>2s)',
            value: services?.postgres?.slowQueriesCount ?? 0,
          },
          {
            label: 'Checkpoints Pend.',
            value: collabData?.pendingCheckpointsCount ?? 0,
          },
        ],
      },
    },

    // 5. SciAI Engine
    {
      id: 'sciai-engine',
      type: 'serviceNode',
      position: { x: COL_3_X, y: ROW_3_Y },
      data: {
        id: 'sciai-engine',
        name: 'SciAI Engine',
        subTitle: 'FastAPI / LangGraph / Python',
        category: 'service',
        status: services?.aiService?.status ?? 'UP',
        isProcessing: isNodeActive('sciai-engine'),
        metrics: [
          {
            label: 'Processamento',
            value: isNodeActive('sciai-engine') ? 'Inferência Ativa' : 'Aguardando',
            highlight: isNodeActive('sciai-engine'),
          },
          {
            label: 'TTFT Médio',
            value: `${services?.aiService?.avgTtftMs ?? 0} ms`,
            highlight: true,
          },
          {
            label: 'Streams SSE',
            value: isNodeActive('sciai-engine')
              ? `${Math.max(services?.aiService?.activeSseStreams ?? 1, 1)} ativo(s)`
              : `${services?.aiService?.activeSseStreams ?? 0} ativos`,
            highlight: isNodeActive('sciai-engine'),
          },
          {
            label: 'Custo Mensal',
            value: `$${(services?.aiService?.monthlyEstimatedCostUsd ?? 0).toFixed(2)}`,
          },
        ],
      },
    },

    // 6. MinIO Object Storage
    {
      id: 'minio-storage',
      type: 'serviceNode',
      position: { x: COL_1_X, y: ROW_4_Y },
      data: {
        id: 'minio-storage',
        name: 'MinIO Storage (S3)',
        subTitle: 'Assets Privados, Figuras & PDFs',
        category: 'storage',
        status: 'UP',
        isProcessing: isNodeActive('minio-storage'),
        metrics: [
          {
            label: 'Acesso Compiler',
            value: 'minio:9000 (COR-01)',
          },
          {
            label: 'Uploads Navegador',
            value: 'Presigned URLs',
            highlight: true,
          },
        ],
      },
    },

    // 7. Redis Distributed Leases
    {
      id: 'redis-leases',
      type: 'serviceNode',
      position: { x: COL_2_X, y: ROW_4_Y },
      data: {
        id: 'redis-leases',
        name: 'Redis 7 (Distributed)',
        subTitle: 'Leases Fencing Monotônico (ADR-007.1)',
        category: 'storage',
        status: services?.redis?.status ?? 'UP',
        isProcessing: isNodeActive('redis-leases'),
        metrics: [
          {
            label: 'Memória Utilizada',
            value: `${services?.redis?.usedMemoryMb ?? 0} MB`,
            highlight: true,
          },
          {
            label: 'Leases Ativos',
            value: `${services?.redis?.activeLeasesCount ?? 0} salas`,
          },
          {
            label: 'Reconexões (1h)',
            value: collabData?.reconnectsLastHourCount ?? 0,
          },
        ],
      },
    },

    // 8. Opik LLMOps
    {
      id: 'opik-llmops',
      type: 'serviceNode',
      position: { x: COL_3_X, y: ROW_4_Y },
      data: {
        id: 'opik-llmops',
        name: 'Opik LLMOps Platform',
        subTitle: 'Tracing de Spans & Avaliação Contínua',
        category: 'observability',
        status: 'UP',
        isProcessing: isNodeActive('opik-llmops'),
        metrics: [
          {
            label: 'Rastreabilidade',
            value: 'LangGraph Spans',
            highlight: true,
          },
          {
            label: 'Trilhas M2M',
            value: 'W3C traceparent',
          },
        ],
      },
    },
  ];

  // Suporte dinâmico a escalonamento de Pods Kubernetes:
  // Se houver mais de 1 pod no cluster ou durante a simulação de escala, mapeia cada réplica ativa!
  const podEdges: CommunicationEdge[] = [];
  const effectivePods =
    collabData?.documentsByPod && collabData.documentsByPod.length > 1
      ? collabData.documentsByPod
      : activeTraceStep?.edgeId.includes('pod-sci-backend')
      ? [
          { podName: 'sci-backend-x1', documentsCount: 2, memoryUsageMb: 78 },
          { podName: 'sci-backend-x2', documentsCount: 1, memoryUsageMb: 82 },
          { podName: 'sci-backend-x3', documentsCount: 2, memoryUsageMb: 75 },
        ]
      : [];

  if (effectivePods.length > 0) {
    effectivePods.forEach((pod, index) => {
      const podNodeId = `pod-${pod.podName}`;
      const podOffset = (index - (effectivePods.length - 1) / 2) * 280;
      nodes.push({
        id: podNodeId,
        type: 'serviceNode',
        position: { x: COL_2_X + podOffset, y: ROW_2_Y + 160 },
        data: {
          id: podNodeId,
          name: `Pod: ${pod.podName}`,
          subTitle: `Instância K8s #${index + 1} (OT Single-Writer)`,
          category: 'gateway',
          status: 'UP',
          isProcessing: isNodeActive(podNodeId),
          metrics: [
            {
              label: 'Documentos (Owner)',
              value: `${pod.documentsCount} sala(s)`,
              highlight: true,
            },
            {
              label: 'Uso de Memória',
              value: `${pod.memoryUsageMb} MB`,
            },
          ],
        },
      });

      podEdges.push({
        id: `e-gateway-${podNodeId}`,
        source: 'backend-fastify',
        target: podNodeId,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'communicationEdge',
        data: {
          protocol: 'Round-Robin / OT Hash',
          description: `Réplica K8s ativa: ${pod.podName}`,
          throughput: `${pod.documentsCount} salas`,
          status: 'healthy',
          ...getEdgeTransmission(`e-gateway-${podNodeId}`),
        },
      });
    });
  }

  const getEdgeTransmission = (edgeId: string) => {
    const isTransmitting = activeTraceStep?.edgeId === edgeId;
    return {
      isTransmitting,
      activeDirection: isTransmitting
        ? activeTraceStep.direction
        : ('both' as const),
      particleColor: isTransmitting
        ? activeTraceStep.particleColor || '#38bdf8'
        : undefined,
      showParticles: isTransmitting,
    };
  };

  const edges: CommunicationEdge[] = [
    // Frontend -> Backend
    {
      id: 'e-frontend-backend',
      source: 'client-frontend',
      target: 'backend-fastify',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'communicationEdge',
      data: {
        protocol: 'HTTP / SSE / WS',
        description:
          'REST API, SSE Eventos e WebSockets para Colaboração em Tempo Real',
        throughput: `${collabData?.otOperationsPerSecond ?? 0} OT ops/s`,
        latency: `${services?.backendFastify?.latencyP95Ms ?? 0}ms p95`,
        status:
          services?.backendFastify?.status === 'DOWN'
            ? 'error'
            : services?.backendFastify?.status === 'DEGRADED'
            ? 'warning'
            : 'healthy',
        particleSpeedSeconds: 2.0,
        ...getEdgeTransmission('e-frontend-backend'),
      },
    },

    // Backend -> Compiler Worker
    {
      id: 'e-backend-compiler',
      source: 'backend-fastify',
      target: 'compiler-worker',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'communicationEdge',
      data: {
        protocol: 'M2M Token',
        description:
          'POST /compile com Manifesto Tipado de Assets e Sandbox TeX (COR-02)',
        throughput: `Fila: ${services?.compiler?.queueLength ?? 0}`,
        latency: `${((services?.compiler?.avgDurationMs ?? 0) / 1000).toFixed(1)}s`,
        status:
          services?.compiler?.status === 'DOWN'
            ? 'error'
            : services?.compiler?.status === 'DEGRADED'
            ? 'warning'
            : 'healthy',
        particleSpeedSeconds: 2.2,
        ...getEdgeTransmission('e-backend-compiler'),
      },
    },

    // Backend -> PostgreSQL
    {
      id: 'e-backend-postgres',
      source: 'backend-fastify',
      target: 'postgres-db',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'communicationEdge',
      data: {
        protocol: 'Pool :6543 (ACID)',
        description:
          'PgBouncer Transaction Pooling e Isolamento sci_latex_db (ADR-015)',
        throughput: `${services?.postgres?.activeConnections ?? 0} conns`,
        latency:
          (services?.postgres?.slowQueriesCount ?? 0) > 0
            ? `${services?.postgres?.slowQueriesCount} slow`
            : '< 2ms',
        status: services?.postgres?.status === 'DOWN' ? 'error' : 'healthy',
        particleSpeedSeconds: 1.8,
        ...getEdgeTransmission('e-backend-postgres'),
      },
    },

    // Backend -> SciAI Engine
    {
      id: 'e-backend-sciai',
      source: 'backend-fastify',
      target: 'sciai-engine',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'communicationEdge',
      data: {
        protocol: 'M2M JWT Assinado',
        description:
          'Autenticação Criptográfica com Delegação de Usuário (ADR-012)',
        throughput: `${services?.aiService?.activeSseStreams ?? 0} Streams`,
        latency: `${services?.aiService?.avgTtftMs ?? 0}ms TTFT`,
        status:
          services?.aiService?.status === 'DOWN'
            ? 'error'
            : services?.aiService?.status === 'DEGRADED'
            ? 'warning'
            : 'healthy',
        particleSpeedSeconds: 1.8,
        ...getEdgeTransmission('e-backend-sciai'),
      },
    },

    // Backend -> Redis
    {
      id: 'e-backend-redis',
      source: 'backend-fastify',
      target: 'redis-leases',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'communicationEdge',
      data: {
        protocol: 'Fencing Monotônico',
        description:
          'Coordenação Distribuída de Document Ownership Lease (ADR-007.1)',
        throughput: `${services?.redis?.activeLeasesCount ?? 0} Leases`,
        latency: `${services?.redis?.usedMemoryMb ?? 0} MB`,
        status: services?.redis?.status === 'DOWN' ? 'error' : 'healthy',
        particleSpeedSeconds: 1.6,
        ...getEdgeTransmission('e-backend-redis'),
      },
    },

    // Compiler -> MinIO
    {
      id: 'e-compiler-minio',
      source: 'compiler-worker',
      target: 'minio-storage',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'communicationEdge',
      data: {
        protocol: 'minio:9000 (COR-01)',
        description:
          'Download estrito de assets científicos com Anti-SSRF em rede interna',
        latency: 'Local S3',
        status: 'healthy',
        particleSpeedSeconds: 2.2,
        ...getEdgeTransmission('e-compiler-minio'),
      },
    },

    // Backend -> MinIO
    {
      id: 'e-backend-minio',
      source: 'backend-fastify',
      target: 'minio-storage',
      sourceHandle: 'left',
      targetHandle: 'right',
      type: 'communicationEdge',
      data: {
        protocol: 'S3 Presigned',
        description:
          'Geração de URLs pré-assinadas para uploads e evidências de tarefas (ADR-011)',
        status: 'healthy',
        particleSpeedSeconds: 2.5,
        ...getEdgeTransmission('e-backend-minio'),
      },
    },

    // SciAI -> Opik
    {
      id: 'e-sciai-opik',
      source: 'sciai-engine',
      target: 'opik-llmops',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'communicationEdge',
      data: {
        protocol: 'Opik Spans / OTel',
        description:
          'Rastreamento ponta a ponta com W3C Trace Context (COR-10)',
        throughput: `$${(services?.aiService?.monthlyEstimatedCostUsd ?? 0).toFixed(2)}`,
        status: 'healthy',
        particleSpeedSeconds: 1.8,
        ...getEdgeTransmission('e-sciai-opik'),
      },
    },
    ...podEdges,
  ];

  return { nodes, edges };
};

export const SIMULATION_SCENARIOS: RequestSimulationScenario[] = [
  {
    id: 'compile-flow',
    name: 'Compilação LaTeX (PDF)',
    iconName: 'compiler',
    description:
      'Frontend solicita PDF -> Fastify emite M2M -> Compiler processa TeX em Sandbox -> Retorna PDF',
    steps: [
      {
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'client-frontend',
        targetNodeId: 'backend-fastify',
        direction: 'forward',
        description: '1/5: Frontend envia POST /compile para o Backend Fastify',
        durationMs: 1400,
        particleColor: '#38bdf8',
        processingNodeIds: ['backend-fastify'],
      },
      {
        edgeId: 'e-backend-compiler',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'compiler-worker',
        direction: 'forward',
        description: '2/5: Fastify gera manifesto tipado e despacha M2M Token para o Compiler',
        durationMs: 1500,
        particleColor: '#f97316',
        processingNodeIds: ['compiler-worker'],
      },
      {
        edgeId: 'e-compiler-minio',
        sourceNodeId: 'compiler-worker',
        targetNodeId: 'minio-storage',
        direction: 'forward',
        description: '3/5: Sandbox TeX baixa imagens e pacotes LaTeX no MinIO interno (:9000)',
        durationMs: 1400,
        particleColor: '#10b981',
        processingNodeIds: ['compiler-worker', 'minio-storage'],
      },
      {
        edgeId: 'e-backend-compiler',
        sourceNodeId: 'compiler-worker',
        targetNodeId: 'backend-fastify',
        direction: 'backward',
        description: '4/5: Compilação concluída no cgroups; PDF entregue ao Fastify',
        durationMs: 1500,
        particleColor: '#22c55e',
        processingNodeIds: ['compiler-worker', 'backend-fastify'],
      },
      {
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'client-frontend',
        direction: 'backward',
        description: '5/5: Fastify responde ao Frontend com o PDF pronto para visualização',
        durationMs: 1400,
        particleColor: '#38bdf8',
        processingNodeIds: [],
      },
    ],
  },
  {
    id: 'sciai-flow',
    name: 'Agente SciAI (LangGraph)',
    iconName: 'sciai',
    description:
      'Pergunta no Chat -> Token JWT M2M -> Grafo LangGraph -> Spans no Opik -> Streaming SSE',
    steps: [
      {
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'client-frontend',
        targetNodeId: 'backend-fastify',
        direction: 'forward',
        description: '1/5: Autor envia instrução no chat do editor LaTeX',
        durationMs: 1300,
        particleColor: '#a855f7',
        processingNodeIds: ['backend-fastify'],
      },
      {
        edgeId: 'e-backend-sciai',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'sciai-engine',
        direction: 'forward',
        description: '2/5: Fastify assina JWT M2M com ator delegado e aciona SciAI Engine',
        durationMs: 1400,
        particleColor: '#8b5cf6',
        processingNodeIds: ['sciai-engine'],
      },
      {
        edgeId: 'e-sciai-opik',
        sourceNodeId: 'sciai-engine',
        targetNodeId: 'opik-llmops',
        direction: 'forward',
        description: '3/5: SciAI instrumenta execução de nós LangGraph e spans no Opik',
        durationMs: 1300,
        particleColor: '#d946ef',
        processingNodeIds: ['sciai-engine', 'opik-llmops'],
      },
      {
        edgeId: 'e-backend-sciai',
        sourceNodeId: 'sciai-engine',
        targetNodeId: 'backend-fastify',
        direction: 'backward',
        description: '4/5: SciAI transmite tokens gerados via Server-Sent Events (SSE)',
        durationMs: 1400,
        particleColor: '#8b5cf6',
        processingNodeIds: ['sciai-engine', 'backend-fastify'],
      },
      {
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'client-frontend',
        direction: 'backward',
        description: '5/5: Fastify faz stream dos tokens diretamente para o chat do autor',
        durationMs: 1300,
        particleColor: '#a855f7',
        processingNodeIds: [],
      },
    ],
  },
  {
    id: 'collab-flow',
    name: 'Colaboração em Tempo Real (OT)',
    iconName: 'collab',
    description:
      'Digitação no Manuscrito -> WebSocket OT -> Validação de Lease Redis -> Checkpoint PostgreSQL',
    steps: [
      {
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'client-frontend',
        targetNodeId: 'backend-fastify',
        direction: 'forward',
        description: '1/4: Autor digita caracteres no CodeMirror via WebSocket (/ws)',
        durationMs: 1200,
        particleColor: '#06b6d4',
        processingNodeIds: ['backend-fastify'],
      },
      {
        edgeId: 'e-backend-redis',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'redis-leases',
        direction: 'forward',
        description: '2/4: Pod dono valida Fencing Monotônico e renova Lease no Redis',
        durationMs: 1300,
        particleColor: '#ef4444',
        processingNodeIds: ['backend-fastify', 'redis-leases'],
      },
      {
        edgeId: 'e-backend-postgres',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'postgres-db',
        direction: 'forward',
        description: '3/4: Checkpoint atômico e AuditLog enfileirados no pool :6543 PgBouncer',
        durationMs: 1300,
        particleColor: '#0d9488',
        processingNodeIds: ['backend-fastify', 'postgres-db'],
      },
      {
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'client-frontend',
        direction: 'backward',
        description: '4/4: Broadcast imediato das transformações (OT) para coautores',
        durationMs: 1200,
        particleColor: '#06b6d4',
        processingNodeIds: [],
      },
    ],
  },
  {
    id: 'scale-flow',
    name: 'Escala Pods K8s (HPA)',
    iconName: 'collab',
    description:
      'HPA detecta aumento de tráfego -> Provisiona 3 réplicas Fastify -> Distribui Ownership de documentos entre os Pods',
    steps: [
      {
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'client-frontend',
        targetNodeId: 'backend-fastify',
        direction: 'forward',
        description: '1/4: HPA detecta 85% de CPU; escala Fastify para 3 réplicas',
        durationMs: 1400,
        particleColor: '#38bdf8',
        processingNodeIds: ['backend-fastify'],
      },
      {
        edgeId: 'e-gateway-pod-sci-backend-x1',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'pod-sci-backend-x1',
        direction: 'forward',
        description: '2/4: Gateway delega salas para Pod 1 (Owner de 2 salas)',
        durationMs: 1400,
        particleColor: '#22c55e',
        processingNodeIds: ['pod-sci-backend-x1'],
      },
      {
        edgeId: 'e-gateway-pod-sci-backend-x2',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'pod-sci-backend-x2',
        direction: 'forward',
        description: '3/4: Gateway delega salas para Pod 2 (Owner de 1 sala)',
        durationMs: 1400,
        particleColor: '#22c55e',
        processingNodeIds: ['pod-sci-backend-x2'],
      },
      {
        edgeId: 'e-gateway-pod-sci-backend-x3',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'pod-sci-backend-x3',
        direction: 'forward',
        description: '4/4: Gateway delega salas para Pod 3 (Owner de 2 salas)',
        durationMs: 1400,
        particleColor: '#22c55e',
        processingNodeIds: ['pod-sci-backend-x3'],
      },
    ],
  },
];
