export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
export type RcaClassification = 'INFRASTRUCTURE' | 'APPLICATION' | 'HYBRID';
export type AuditActionStatus = 'SUCCESS' | 'FAILED' | 'REJECTED';

export interface AiopsIncidentItem {
  id: string;
  serviceName: string;
  namespace: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  triggerSource: string;
  triggerMessage: string;
  traceId?: string | null;
  detectedAt: string;
  resolvedAt?: string | null;
}

export interface AiopsIncidentListResponse {
  incidents: AiopsIncidentItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AiopsRcaSuggestedAction {
  actionId: string;
  actionType: string;
  title: string;
  description: string;
  commandPreview: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresConfirmation: boolean;
  payloadParameters: Record<string, unknown>;
}

export interface AiopsRcaReport {
  id: string;
  incidentId: string;
  classification: RcaClassification;
  rootCauseSummary: string;
  fullMarkdownReport: string;
  evidencePayload: Record<string, unknown>;
  suggestedActions: AiopsRcaSuggestedAction[];
  createdAt: string;
}

export interface AiopsIncidentDetailResponse extends AiopsIncidentItem {
  rcaReports: AiopsRcaReport[];
}

export interface AiopsChatSendRequest {
  incidentId?: string;
  serviceContext?: string;
  content: string;
}

export interface AiopsChatMessage {
  id: string;
  incidentId?: string | null;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiopsChatResponse {
  message: string;
  rcaSummary?: string;
  suggestedActions?: AiopsRcaSuggestedAction[];
}

export interface AiopsActionExecutionRequest {
  incidentId?: string;
  actionType:
    'K8S_DEPLOYMENT_RESTART' | 'K8S_DEPLOYMENT_SCALE' | 'K8S_POD_DELETE' | 'CACHE_FLUSH_REDIS';
  targetResource: string;
  parameters?: Record<string, unknown>;
  userConfirmation: true;
}

export interface AiopsActionExecutionResponse {
  auditId: string;
  actionType: string;
  targetResource: string;
  executionStatus: AuditActionStatus;
  message: string;
  executedAt: string;
}
