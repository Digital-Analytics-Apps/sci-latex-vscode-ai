import { z } from 'zod';

export const AdminOverviewResponseSchema = z.object({
  systemStatus: z.enum(['OPERATIONAL', 'DEGRADED', 'CRITICAL']),
  activeUsersCount: z.number(),
  activeProjectsCount: z.number(),
  activeWebSocketsCount: z.number(),
  errorsLastHourCount: z.number(),
  hourlyActivity: z.array(
    z.object({
      hour: z.string(),
      requestsCount: z.number(),
      collaborativeOpsCount: z.number(),
    })
  ),
});

export const AdminWorkflowResponseSchema = z.object({
  totalProjects: z.number(),
  stagesDistribution: z.array(
    z.object({
      stageNumber: z.number(),
      stageName: z.string(),
      projectsCount: z.number(),
    })
  ),
  bottlenecks: z.object({
    delayedProjectsCount: z.number(),
    stagnantProjectsCount: z.number(),
    pendingNitValidationsCount: z.number(),
    upcomingDeadlinesCount: z.number(),
  }),
  averageDaysPerStage: z.record(z.string(), z.number()),
});

export const AdminInfrastructureResponseSchema = z.object({
  services: z.object({
    backendFastify: z.object({
      status: z.enum(['UP', 'DEGRADED', 'DOWN']),
      rps: z.number(),
      latencyP95Ms: z.number(),
      errorRate5xx: z.number(),
      eventLoopLagMs: z.number(),
      grafanaUrl: z.string(),
    }),
    aiService: z.object({
      status: z.enum(['UP', 'DEGRADED', 'DOWN']),
      avgTtftMs: z.number(),
      activeSseStreams: z.number(),
      monthlyEstimatedCostUsd: z.number(),
      opikUrl: z.string(),
    }),
    compiler: z.object({
      status: z.enum(['UP', 'DEGRADED', 'DOWN']),
      queueLength: z.number(),
      activeJobs: z.number(),
      avgDurationMs: z.number(),
      timeoutsLast24h: z.number(),
      grafanaUrl: z.string(),
    }),
    postgres: z.object({
      status: z.enum(['UP', 'DOWN']),
      activeConnections: z.number(),
      maxConnections: z.number(),
      slowQueriesCount: z.number(),
    }),
    redis: z.object({
      status: z.enum(['UP', 'DOWN']),
      usedMemoryMb: z.number(),
      activeLeasesCount: z.number(),
    }),
    kubernetes: z.object({
      healthyPodsCount: z.number(),
      totalPodsCount: z.number(),
      recentRestartsCount: z.number(),
    }),
  }),
});

export const AdminCollaborationResponseSchema = z.object({
  activeDocumentsCount: z.number(),
  connectedUsersCount: z.number(),
  otOperationsPerSecond: z.number(),
  avgMemoryProcessingMs: z.number(),
  pendingCheckpointsCount: z.number(),
  reconnectsLastHourCount: z.number(),
  documentsByPod: z.array(
    z.object({
      podName: z.string(),
      documentsCount: z.number(),
      memoryUsageMb: z.number(),
    })
  ),
});

export const AdminActivityResponseSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      category: z.enum(['EDITORIAL', 'COLLABORATION', 'COMPILER', 'SECURITY']),
      title: z.string(),
      description: z.string(),
      severity: z.enum(['INFO', 'WARNING', 'ERROR']),
      entityId: z.string().optional(),
    })
  ),
});

export type AdminOverviewResponse = z.infer<typeof AdminOverviewResponseSchema>;
export type AdminWorkflowResponse = z.infer<typeof AdminWorkflowResponseSchema>;
export type AdminInfrastructureResponse = z.infer<typeof AdminInfrastructureResponseSchema>;
export type AdminCollaborationResponse = z.infer<typeof AdminCollaborationResponseSchema>;
export type AdminActivityResponse = z.infer<typeof AdminActivityResponseSchema>;
