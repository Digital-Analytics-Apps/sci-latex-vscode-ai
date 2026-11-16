import { z } from 'zod';

export const IncidentSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const IncidentStatusSchema = z.enum(['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED']);
export const RcaClassificationSchema = z.enum(['INFRASTRUCTURE', 'APPLICATION', 'HYBRID']);

// -------------------------------------------------------------
// INCIDENT SCHEMAS
// -------------------------------------------------------------

export const AiopsIncidentItemSchema = z.object({
  id: z.string().uuid(),
  serviceName: z.string(),
  namespace: z.string(),
  severity: IncidentSeveritySchema,
  status: IncidentStatusSchema,
  triggerSource: z.string(),
  triggerMessage: z.string(),
  traceId: z.string().nullable().optional(),
  detectedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable().optional(),
});

export const AiopsIncidentListQuerySchema = z.object({
  status: IncidentStatusSchema.optional(),
  severity: IncidentSeveritySchema.optional(),
  serviceName: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

export const AiopsIncidentListResponseSchema = z.object({
  incidents: z.array(AiopsIncidentItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// -------------------------------------------------------------
// RCA REPORT SCHEMAS
// -------------------------------------------------------------

export const AiopsRcaSuggestedActionSchema = z.object({
  actionId: z.string(),
  actionType: z.string(),
  title: z.string(),
  description: z.string(),
  commandPreview: z.string(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  requiresConfirmation: z.boolean().default(true),
  payloadParameters: z.record(z.unknown()),
});

export const AiopsRcaReportResponseSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  classification: RcaClassificationSchema,
  rootCauseSummary: z.string(),
  fullMarkdownReport: z.string(),
  evidencePayload: z.record(z.unknown()),
  suggestedActions: z.array(AiopsRcaSuggestedActionSchema),
  createdAt: z.string().datetime(),
});

export const AiopsIncidentDetailResponseSchema = AiopsIncidentItemSchema.extend({
  rcaReports: z.array(AiopsRcaReportResponseSchema),
});

// -------------------------------------------------------------
// CHAT SCHEMAS
// -------------------------------------------------------------

export const AiopsChatSendRequestSchema = z.object({
  incidentId: z.string().uuid().optional(),
  serviceContext: z.string().optional(),
  content: z.string().min(1, 'A mensagem não pode ser vazia.'),
});

export const AiopsChatHistoryQuerySchema = z.object({
  incidentId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const AiopsChatMessageResponseSchema = z.object({
  id: z.string(),
  incidentId: z.string().uuid().nullable().optional(),
  userId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  toolCalls: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string(),
});

export const AiopsChatHistoryResponseSchema = z.array(AiopsChatMessageResponseSchema);

// -------------------------------------------------------------
// ACTION EXECUTION & AUDIT SCHEMAS (HUMAN-IN-THE-LOOP)
// -------------------------------------------------------------

export const AiopsActionExecutionRequestSchema = z.object({
  incidentId: z.string().uuid().optional(),
  actionType: z.enum([
    'K8S_DEPLOYMENT_RESTART',
    'K8S_DEPLOYMENT_SCALE',
    'K8S_POD_DELETE',
    'CACHE_FLUSH_REDIS',
  ]),
  targetResource: z.string().min(1),
  parameters: z.record(z.unknown()).default({}),
  userConfirmation: z.literal(true, {
    errorMap: () => ({ message: 'A confirmação explícita do administrador é obrigatória.' }),
  }),
});

export const AiopsActionExecutionResponseSchema = z.object({
  auditId: z.string().uuid(),
  actionType: z.string(),
  targetResource: z.string(),
  executionStatus: z.enum(['SUCCESS', 'FAILED', 'REJECTED']),
  message: z.string(),
  executedAt: z.string().datetime(),
});

export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type RcaClassification = z.infer<typeof RcaClassificationSchema>;
export type AiopsIncidentItem = z.infer<typeof AiopsIncidentItemSchema>;
export type AiopsRcaSuggestedAction = z.infer<typeof AiopsRcaSuggestedActionSchema>;
export type AiopsIncidentListQuery = z.infer<typeof AiopsIncidentListQuerySchema>;
export type AiopsIncidentListResponse = z.infer<typeof AiopsIncidentListResponseSchema>;
export type AiopsRcaReportResponse = z.infer<typeof AiopsRcaReportResponseSchema>;
export type AiopsIncidentDetailResponse = z.infer<typeof AiopsIncidentDetailResponseSchema>;
export type AiopsChatSendRequest = z.infer<typeof AiopsChatSendRequestSchema>;
export type AiopsChatHistoryQuery = z.infer<typeof AiopsChatHistoryQuerySchema>;
export type AiopsChatMessageResponse = z.infer<typeof AiopsChatMessageResponseSchema>;
export type AiopsChatHistoryResponse = z.infer<typeof AiopsChatHistoryResponseSchema>;
export type AiopsActionExecutionRequest = z.infer<typeof AiopsActionExecutionRequestSchema>;
export type AiopsActionExecutionResponse = z.infer<typeof AiopsActionExecutionResponseSchema>;
