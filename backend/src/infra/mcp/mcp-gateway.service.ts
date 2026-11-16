import * as k8s from '@kubernetes/client-node';
import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';

export interface K8sPodEvidence {
  podName: string;
  namespace: string;
  status: string;
  restartCount: number;
  lastTerminationReason?: string;
  lastTerminationExitCode?: number;
  nodeName?: string;
  isReady: boolean;
  events: Array<{
    type: string;
    reason: string;
    message: string;
    count: number;
    lastTimestamp?: string;
  }>;
}

export interface K8sNodePressureEvidence {
  nodeName: string;
  isReady: boolean;
  memoryPressure: boolean;
  diskPressure: boolean;
  pidPressure: boolean;
}

export interface PrometheusMetricEvidence {
  metricName: string;
  query: string;
  resultType: string;
  values: Array<{
    labels: Record<string, string>;
    value: [number, string];
  }>;
}

export interface LokiLogEvidence {
  streamLabels: Record<string, string>;
  entries: Array<{
    timestamp: string;
    line: string;
    level: string;
  }>;
}

export interface GlitchTipIssueEvidence {
  issueId: string;
  title: string;
  culprit?: string;
  count: number;
  lastSeen: string;
  firstSeen: string;
}

export interface OpikTraceEvidence {
  traceId: string;
  name: string;
  durationMs?: number;
  totalTokens?: number;
  status?: string;
  error?: string;
}

export class McpGatewayService {
  private k8sCoreApi: k8s.CoreV1Api | null = null;
  private k8sAppsApi: k8s.AppsV1Api | null = null;
  private promHttpClient: AxiosInstance;
  private lokiHttpClient: AxiosInstance;
  private opikHttpClient: AxiosInstance;
  private glitchTipHttpClient: AxiosInstance;

  constructor() {
    this.initK8sClient();

    this.promHttpClient = axios.create({
      baseURL: env.PROMETHEUS_URL,
      timeout: 5000,
    });

    this.lokiHttpClient = axios.create({
      baseURL: env.LOKI_URL,
      timeout: 5000,
    });

    this.opikHttpClient = axios.create({
      baseURL: env.OPIK_URL,
      timeout: 5000,
    });

    this.glitchTipHttpClient = axios.create({
      baseURL: env.GLITCHTIP_URL,
      timeout: 5000,
    });
  }

  private initK8sClient(): void {
    try {
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      this.k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
      this.k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
    } catch {
      // Caso não esteja em cluster ou sem ~/.kube/config local, registra nulo de forma controlada
      this.k8sCoreApi = null;
      this.k8sAppsApi = null;
    }
  }

  // -------------------------------------------------------------
  // KUBERNETES MCP TOOLS
  // -------------------------------------------------------------

  async queryK8sPods(namespace = 'default', labelSelector?: string): Promise<K8sPodEvidence[]> {
    if (!this.k8sCoreApi) {
      throw new Error('Kubernetes API client não está disponível (verifique o KubeConfig).');
    }

    const podsRes = await this.k8sCoreApi.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );

    const evidences: K8sPodEvidence[] = [];

    for (const pod of podsRes.body.items) {
      const podName = pod.metadata?.name ?? 'unknown-pod';
      const containerStatuses = pod.status?.containerStatuses ?? [];
      const primaryStatus = containerStatuses[0];

      const restartCount = primaryStatus?.restartCount ?? 0;
      const lastTerm = primaryStatus?.lastState?.terminated;

      // Busca eventos vinculados a este pod
      const eventsRes = await this.k8sCoreApi
        .listNamespacedEvent(
          namespace,
          undefined,
          undefined,
          undefined,
          `involvedObject.name=${podName}`
        )
        .catch(() => ({ body: { items: [] } }));

      const events = eventsRes.body.items.map((ev) => ({
        type: ev.type ?? 'Normal',
        reason: ev.reason ?? 'Unknown',
        message: ev.message ?? '',
        count: ev.count ?? 1,
        lastTimestamp: ev.lastTimestamp?.toISOString(),
      }));

      evidences.push({
        podName,
        namespace,
        status: pod.status?.phase ?? 'Unknown',
        restartCount,
        lastTerminationReason: lastTerm?.reason,
        lastTerminationExitCode: lastTerm?.exitCode,
        nodeName: pod.spec?.nodeName,
        isReady: containerStatuses.every((c) => c.ready),
        events,
      });
    }

    return evidences;
  }

  async queryK8sNodes(): Promise<K8sNodePressureEvidence[]> {
    if (!this.k8sCoreApi) {
      throw new Error('Kubernetes API client não está disponível.');
    }

    const nodesRes = await this.k8sCoreApi.listNode();
    const result: K8sNodePressureEvidence[] = [];

    for (const node of nodesRes.body.items) {
      const nodeName = node.metadata?.name ?? 'unknown-node';
      const conditions = node.status?.conditions ?? [];

      const isReady = conditions.find((c) => c.type === 'Ready')?.status === 'True';
      const memoryPressure = conditions.find((c) => c.type === 'MemoryPressure')?.status === 'True';
      const diskPressure = conditions.find((c) => c.type === 'DiskPressure')?.status === 'True';
      const pidPressure = conditions.find((c) => c.type === 'PIDPressure')?.status === 'True';

      result.push({
        nodeName,
        isReady,
        memoryPressure,
        diskPressure,
        pidPressure,
      });
    }

    return result;
  }

  async restartK8sDeployment(namespace: string, deploymentName: string): Promise<boolean> {
    if (!this.k8sAppsApi) {
      throw new Error('Kubernetes Apps API client não está disponível.');
    }

    // Rollout restart via patch de annotations
    const patch = {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
            },
          },
        },
      },
    };

    const options = {
      headers: { 'Content-Type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH },
    };

    await this.k8sAppsApi.patchNamespacedDeployment(
      deploymentName,
      namespace,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      options
    );

    return true;
  }

  // -------------------------------------------------------------
  // PROMETHEUS MCP TOOLS
  // -------------------------------------------------------------

  async queryPrometheusInstant(query: string): Promise<PrometheusMetricEvidence> {
    const response = await this.promHttpClient.get('/api/v1/query', {
      params: { query },
    });

    const data = response.data?.data;
    if (!data) {
      throw new Error(`Prometheus query retornou resposta sem corpo 'data' para a query: ${query}`);
    }

    return {
      metricName: query,
      query,
      resultType: data.resultType ?? 'vector',
      values: (data.result ?? []).map(
        (item: { metric: Record<string, string>; value: [number, string] }) => ({
          labels: item.metric,
          value: item.value,
        })
      ),
    };
  }

  // -------------------------------------------------------------
  // LOKI MCP TOOLS
  // -------------------------------------------------------------

  async queryLokiLogs(query: string, limit = 50, minutesAgo = 30): Promise<LokiLogEvidence[]> {
    const start = (Date.now() - minutesAgo * 60 * 1000) * 1000000; // Nanosegundos para o Loki
    const end = Date.now() * 1000000;

    const response = await this.lokiHttpClient.get('/loki/api/v1/query_range', {
      params: {
        query,
        limit,
        start,
        end,
        direction: 'BACKWARD',
      },
    });

    const result = response.data?.data?.result ?? [];
    const evidences: LokiLogEvidence[] = [];

    for (const stream of result) {
      const streamLabels: Record<string, string> = stream.stream ?? {};
      const rawValues: Array<[string, string]> = stream.values ?? [];

      const entries = rawValues.map(([nsTimestamp, logLine]) => {
        let level = 'INFO';
        const lower = logLine.toLowerCase();
        if (lower.includes('error') || lower.includes('exception') || lower.includes('fatal')) {
          level = 'ERROR';
        } else if (lower.includes('warn')) {
          level = 'WARN';
        } else if (lower.includes('debug')) {
          level = 'DEBUG';
        }

        const dateIso = new Date(parseInt(nsTimestamp.slice(0, 13), 10)).toISOString();

        return {
          timestamp: dateIso,
          line: logLine,
          level,
        };
      });

      evidences.push({
        streamLabels,
        entries,
      });
    }

    return evidences;
  }

  // -------------------------------------------------------------
  // GLITCHTIP / SENTRY MCP TOOLS
  // -------------------------------------------------------------

  async queryGlitchTipIssues(organizationSlug = 'default'): Promise<GlitchTipIssueEvidence[]> {
    try {
      const response = await this.glitchTipHttpClient.get(
        `/api/0/organizations/${organizationSlug}/issues/`,
        {
          params: { query: 'is:unresolved' },
        }
      );

      const items = Array.isArray(response.data) ? response.data : [];
      return items.map(
        (item: {
          id: string;
          title: string;
          culprit?: string;
          count?: number;
          lastSeen?: string;
          firstSeen?: string;
        }) => ({
          issueId: String(item.id),
          title: item.title,
          culprit: item.culprit,
          count: item.count ?? 1,
          lastSeen: item.lastSeen ?? new Date().toISOString(),
          firstSeen: item.firstSeen ?? new Date().toISOString(),
        })
      );
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------
  // OPIK (LLMOPS) MCP TOOLS
  // -------------------------------------------------------------

  async queryOpikTraces(projectName = 'sci-latex-sciai'): Promise<OpikTraceEvidence[]> {
    try {
      const response = await this.opikHttpClient.get('/api/v1/private/traces', {
        params: { projectName, limit: 10 },
      });

      const content = response.data?.content ?? [];
      return content.map(
        (trace: {
          id: string;
          name?: string;
          duration?: number;
          totalTokens?: number;
          status?: string;
          error?: string;
        }) => ({
          traceId: trace.id,
          name: trace.name ?? 'langgraph-run',
          durationMs: trace.duration,
          totalTokens: trace.totalTokens,
          status: trace.status,
          error: trace.error,
        })
      );
    } catch {
      return [];
    }
  }
}
