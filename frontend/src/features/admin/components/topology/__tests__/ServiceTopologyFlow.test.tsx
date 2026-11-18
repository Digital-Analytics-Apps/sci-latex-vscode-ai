import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminCollaborationData, AdminInfrastructureData } from '../../../api/adminCenterApi';
import { store } from '../../../../../store';
import { ServiceTopologyTab } from '../../../tabs/ServiceTopologyTab';
import { LiveCommunicationEdge } from '../LiveCommunicationEdge';
import { ServiceTopologyNode } from '../ServiceTopologyNode';
import { buildTopologyNodesAndEdges } from '../topologyConfig';

// Mock do AutoSizer para testes em ambiente JSDOM
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ renderProp, children }: any) => {
    const fn = renderProp || children;
    return fn ? fn({ width: 1200, height: 800 }) : null;
  },
}));

// Mock do hook de stream SSE para testes
vi.mock('../../../hooks/useAdminTrafficStream', () => ({
  useAdminTrafficStream: vi.fn().mockReturnValue({
    isConnected: true,
    lastLiveEvent: null,
  }),
}));

// Mock do React Flow para testes em ambiente JSDOM
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    Handle: () => <div data-testid="flow-handle" />,
    EdgeLabelRenderer: ({ children }: any) => (
      <div data-testid="edge-label-renderer">{children}</div>
    ),
    BaseEdge: ({ id, path, style }: any) => (
      <path data-testid={`base-edge-${id}`} d={path} style={style} />
    ),
    ReactFlow: ({ children, nodes }: any) => (
      <div data-testid="react-flow-container">
        {nodes?.map((node: any) => (
          <div key={node.id} data-testid={`node-${node.id}`}>
            {node.data.name}
          </div>
        ))}
        {children}
      </div>
    ),
    Controls: () => <div data-testid="flow-controls" />,
    MiniMap: () => <div data-testid="flow-minimap" />,
    Background: () => <div data-testid="flow-background" />,
  };
});

// Mock da API do Admin Center
vi.mock('../../../api/adminCenterApi', async () => {
  const actual = await vi.importActual('../../../api/adminCenterApi');
  return {
    ...actual,
    adminCenterApi: {
      getInfrastructure: vi.fn().mockResolvedValue({
        services: {
          backendFastify: {
            status: 'UP',
            rps: 42,
            latencyP95Ms: 15,
            errorRate5xx: 0.1,
            eventLoopLagMs: 2.4,
            grafanaUrl: 'http://grafana/fastify',
          },
          aiService: {
            status: 'UP',
            avgTtftMs: 310,
            activeSseStreams: 4,
            monthlyEstimatedCostUsd: 18.5,
            opikUrl: 'http://opik:5174',
          },
          compiler: {
            status: 'UP',
            queueLength: 0,
            activeJobs: 1,
            avgDurationMs: 1200,
            timeoutsLast24h: 0,
            grafanaUrl: 'http://grafana/compiler',
          },
          postgres: {
            status: 'UP',
            activeConnections: 12,
            maxConnections: 50,
            slowQueriesCount: 0,
          },
          redis: {
            status: 'UP',
            usedMemoryMb: 64,
            activeLeasesCount: 8,
          },
          kubernetes: {
            healthyPodsCount: 6,
            totalPodsCount: 6,
            recentRestartsCount: 0,
          },
        },
      }),
      getCollaboration: vi.fn().mockResolvedValue({
        activeDocumentsCount: 3,
        connectedUsersCount: 5,
        otOperationsPerSecond: 28,
        avgMemoryProcessingMs: 1.2,
        pendingCheckpointsCount: 0,
        reconnectsLastHourCount: 1,
        documentsByPod: [
          { podName: 'backend-pod-1', documentsCount: 3, memoryUsageMb: 85 },
        ],
      }),
    },
  };
});

const defaultNodeProps = {
  selected: false,
  zIndex: 1,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  dragging: false,
  draggable: true,
  deletable: true,
  selectable: true,
};

describe('Service Topology Flow & Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('buildTopologyNodesAndEdges builds all 8 standard SCIA nodes and communication edges', () => {
    const mockInfra: AdminInfrastructureData = {
      services: {
        backendFastify: {
          status: 'UP',
          rps: 55,
          latencyP95Ms: 12,
          errorRate5xx: 0,
          eventLoopLagMs: 1.8,
          grafanaUrl: 'http://grafana',
        },
        aiService: {
          status: 'UP',
          avgTtftMs: 250,
          activeSseStreams: 2,
          monthlyEstimatedCostUsd: 12.0,
          opikUrl: 'http://opik',
        },
        compiler: {
          status: 'UP',
          queueLength: 2,
          activeJobs: 1,
          avgDurationMs: 900,
          timeoutsLast24h: 0,
          grafanaUrl: 'http://compiler',
        },
        postgres: {
          status: 'UP',
          activeConnections: 15,
          maxConnections: 50,
          slowQueriesCount: 0,
        },
        redis: {
          status: 'UP',
          usedMemoryMb: 48,
          activeLeasesCount: 5,
        },
        kubernetes: {
          healthyPodsCount: 5,
          totalPodsCount: 5,
          recentRestartsCount: 0,
        },
      },
    };

    const mockCollab: AdminCollaborationData = {
      activeDocumentsCount: 5,
      connectedUsersCount: 9,
      otOperationsPerSecond: 45,
      avgMemoryProcessingMs: 1.5,
      pendingCheckpointsCount: 2,
      reconnectsLastHourCount: 0,
      documentsByPod: [],
    };

    const { nodes, edges } = buildTopologyNodesAndEdges(mockInfra, mockCollab);

    expect(nodes).toHaveLength(8);
    expect(edges.length).toBeGreaterThanOrEqual(7);

    // Valida IDs dos nós fundamentais
    const nodeIds = nodes.map((n) => n.id);
    expect(nodeIds).toContain('client-frontend');
    expect(nodeIds).toContain('backend-fastify');
    expect(nodeIds).toContain('sciai-engine');
    expect(nodeIds).toContain('compiler-worker');
    expect(nodeIds).toContain('postgres-db');
    expect(nodeIds).toContain('redis-leases');
    expect(nodeIds).toContain('minio-storage');
    expect(nodeIds).toContain('opik-llmops');

    // Valida métricas mapeadas
    const fastifyNode = nodes.find((n) => n.id === 'backend-fastify');
    expect(fastifyNode?.data.metrics.find((m) => m.label === 'Throughput')?.value).toBe('55 RPS');
  });

  it('renders ServiceTopologyNode as clean informational card with status badge and metrics', () => {
    const nodeData = {
      id: 'sciai-engine',
      name: 'SciAI Engine',
      subTitle: 'FastAPI / LangGraph / Python',
      category: 'service' as const,
      status: 'UP' as const,
      metrics: [
        { label: 'TTFT Médio', value: '310 ms', highlight: true },
        { label: 'Streams SSE', value: '4 ativos' },
      ],
      grafanaUrl: 'http://opik:5174',
    };

    render(
      <ServiceTopologyNode
        id="sciai-engine"
        data={nodeData}
        type="serviceNode"
        {...defaultNodeProps}
      />
    );

    expect(screen.getByText('SciAI Engine')).toBeDefined();
    expect(screen.getByText('FastAPI / LangGraph / Python')).toBeDefined();
    expect(screen.getByText('Operacional')).toBeDefined();
    expect(screen.getByText('TTFT Médio')).toBeDefined();
    expect(screen.getByText('310 ms')).toBeDefined();

    // Valida que o card é limpo e não contém botões intrusivos dentro do nó
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders LiveCommunicationEdge with animated particles when isTransmitting is active', () => {
    const edgeData = {
      protocol: 'M2M Token',
      description: 'Compilação TeX em Sandbox',
      latency: '1.2s',
      throughput: 'Fila: 0',
      status: 'healthy' as const,
      isTransmitting: true,
      activeDirection: 'forward' as const,
      particleColor: '#f97316',
    };

    const { container } = render(
      <svg>
        <LiveCommunicationEdge
          id="e-test-transmit"
          source="backend-fastify"
          target="compiler-worker"
          sourceX={100}
          sourceY={100}
          targetX={200}
          targetY={200}
          sourcePosition={anyPosition('bottom')}
          targetPosition={anyPosition('top')}
          data={edgeData}
          type="communicationEdge"
        />
      </svg>
    );

    expect(screen.getByText('M2M Token')).toBeDefined();
    expect(screen.getByText('1.2s')).toBeDefined();

    // Valida que círculos SVG com animateMotion foram criados
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });

  it('does NOT render particles when isTransmitting is false (clean idle state)', () => {
    const idleEdgeData = {
      protocol: 'TCP / Pool',
      description: 'Conexão PgBouncer',
      status: 'healthy' as const,
      isTransmitting: false,
    };

    const { container } = render(
      <svg>
        <LiveCommunicationEdge
          id="e-test-idle"
          source="backend-fastify"
          target="postgres-db"
          sourceX={100}
          sourceY={100}
          targetX={200}
          targetY={200}
          sourcePosition={anyPosition('bottom')}
          targetPosition={anyPosition('top')}
          data={idleEdgeData}
          type="communicationEdge"
        />
      </svg>
    );

    // Sem partículas quando inativo
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(0);
  });

  it('renders compiler-worker node showing Processando (Ativos) and Em Fila (Aguardando)', () => {
    const mockInfra: any = {
      services: {
        compiler: {
          status: 'UP',
          queueLength: 3,
          activeJobs: 2,
          avgDurationMs: 1500,
          timeoutsLast24h: 0,
        },
      },
    };

    const { nodes } = buildTopologyNodesAndEdges(
      mockInfra,
      undefined,
      null
    );

    const compilerNode = nodes.find((n) => n.id === 'compiler-worker');
    expect(compilerNode).toBeDefined();

    const processingMetric = compilerNode?.data.metrics.find((m) =>
      m.label.includes('Processando')
    );
    const queueMetric = compilerNode?.data.metrics.find((m) =>
      m.label.includes('Fila')
    );

    expect(processingMetric).toBeDefined();
    expect(processingMetric?.value).toContain('2 job(s)');
    expect(queueMetric).toBeDefined();
    expect(queueMetric?.value).toContain('3 job(s)');
  });

  it('renders ServiceTopologyTab and triggers request flow simulation', async () => {
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ServiceTopologyTab autoRefresh={false} />
        </QueryClientProvider>
      </Provider>
    );

    // Aguarda carregar dados
    const headerTitle = await screen.findByText(/Malha de Serviços/i);
    expect(headerTitle).toBeDefined();

    const flowContainer = screen.getByTestId('react-flow-container');
    expect(flowContainer).toBeDefined();

    // Dispara a simulação de fluxo de Compilação
    const compileButton = screen.getByRole('button', { name: /Compilação LaTeX/i });
    expect(compileButton).toBeDefined();
    fireEvent.click(compileButton);

    // Verifica que a barra de progresso da simulação e o botão Parar foram ativados
    expect(screen.getByText(/Passo 1\/5/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Parar/i })).toBeDefined();
  });
});

function anyPosition(pos: string): any {
  return pos;
}
