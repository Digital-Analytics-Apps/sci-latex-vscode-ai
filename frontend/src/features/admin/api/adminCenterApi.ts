import { api } from "../../../services/api";

export interface AdminOverviewData {
  systemStatus: "OPERATIONAL" | "DEGRADED" | "CRITICAL";
  activeUsersCount: number;
  activeProjectsCount: number;
  activeWebSocketsCount: number;
  errorsLastHourCount: number;
  hourlyActivity: Array<{
    hour: string;
    requestsCount: number;
    collaborativeOpsCount: number;
  }>;
}

export interface AdminWorkflowData {
  totalProjects: number;
  stagesDistribution: Array<{
    stageNumber: number;
    stageName: string;
    projectsCount: number;
  }>;
  bottlenecks: {
    delayedProjectsCount: number;
    stagnantProjectsCount: number;
    pendingNitValidationsCount: number;
    upcomingDeadlinesCount: number;
  };
  averageDaysPerStage: Record<string, number>;
}

export interface AdminInfrastructureData {
  services: {
    backendFastify: {
      status: "UP" | "DEGRADED" | "DOWN";
      rps: number;
      latencyP95Ms: number;
      errorRate5xx: number;
      eventLoopLagMs: number;
      grafanaUrl: string;
    };
    aiService: {
      status: "UP" | "DEGRADED" | "DOWN";
      avgTtftMs: number;
      activeSseStreams: number;
      monthlyEstimatedCostUsd: number;
      opikUrl: string;
    };
    compiler: {
      status: "UP" | "DEGRADED" | "DOWN";
      queueLength: number;
      activeJobs: number;
      avgDurationMs: number;
      timeoutsLast24h: number;
      grafanaUrl: string;
    };
    postgres: {
      status: "UP" | "DOWN";
      activeConnections: number;
      maxConnections: number;
      slowQueriesCount: number;
    };
    redis: {
      status: "UP" | "DOWN";
      usedMemoryMb: number;
      activeLeasesCount: number;
    };
    kubernetes: {
      healthyPodsCount: number;
      totalPodsCount: number;
      recentRestartsCount: number;
    };
  };
}

export interface AdminCollaborationData {
  activeDocumentsCount: number;
  connectedUsersCount: number;
  otOperationsPerSecond: number;
  avgMemoryProcessingMs: number;
  pendingCheckpointsCount: number;
  reconnectsLastHourCount: number;
  documentsByPod: Array<{
    podName: string;
    documentsCount: number;
    memoryUsageMb: number;
  }>;
}

export interface AdminActivityData {
  events: Array<{
    id: string;
    timestamp: string;
    category: "EDITORIAL" | "COLLABORATION" | "COMPILER" | "SECURITY";
    title: string;
    description: string;
    severity: "INFO" | "WARNING" | "ERROR";
    entityId?: string;
  }>;
}

export const adminCenterApi = {
  async getOverview(): Promise<AdminOverviewData> {
    const { data } = await api.get<AdminOverviewData>("/api/v1/admin/dashboard/overview");
    return data;
  },

  async getWorkflow(): Promise<AdminWorkflowData> {
    const { data } = await api.get<AdminWorkflowData>("/api/v1/admin/dashboard/workflow");
    return data;
  },

  async getInfrastructure(): Promise<AdminInfrastructureData> {
    const { data } = await api.get<AdminInfrastructureData>("/api/v1/admin/dashboard/infrastructure");
    return data;
  },

  async getCollaboration(): Promise<AdminCollaborationData> {
    const { data } = await api.get<AdminCollaborationData>("/api/v1/admin/dashboard/collaboration");
    return data;
  },

  async getActivity(): Promise<AdminActivityData> {
    const { data } = await api.get<AdminActivityData>("/api/v1/admin/dashboard/activity");
    return data;
  },
};
