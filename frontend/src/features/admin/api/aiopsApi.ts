import { api } from '../../../services/api';
import {
  AiopsActionExecutionRequest,
  AiopsActionExecutionResponse,
  AiopsChatMessage,
  AiopsChatResponse,
  AiopsChatSendRequest,
  AiopsIncidentDetailResponse,
  AiopsIncidentListResponse,
  AiopsRcaReport,
  IncidentSeverity,
  IncidentStatus,
} from '../types/aiops.types';

export const aiopsApi = {
  async listIncidents(params?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    serviceName?: string;
    limit?: number;
    page?: number;
  }): Promise<AiopsIncidentListResponse> {
    const response = await api.get<AiopsIncidentListResponse>('/admin/aiops/incidents', {
      params,
    });
    return response.data;
  },

  async getIncidentById(id: string): Promise<AiopsIncidentDetailResponse> {
    const response = await api.get<AiopsIncidentDetailResponse>(`/admin/aiops/incidents/${id}`);
    return response.data;
  },

  async runRcaDiagnosis(incidentId: string): Promise<AiopsRcaReport> {
    const response = await api.post<AiopsRcaReport>(
      `/admin/aiops/incidents/${incidentId}/diagnose`
    );
    return response.data;
  },

  async sendChatMessage(payload: AiopsChatSendRequest): Promise<AiopsChatResponse> {
    const response = await api.post<AiopsChatResponse>('/admin/aiops/chat', payload);
    return response.data;
  },

  async getChatMessages(params?: {
    incidentId?: string;
    limit?: number;
  }): Promise<AiopsChatMessage[]> {
    const response = await api.get<AiopsChatMessage[]>('/admin/aiops/chat/messages', {
      params,
    });
    return response.data;
  },

  async executeRemediationAction(
    payload: AiopsActionExecutionRequest
  ): Promise<AiopsActionExecutionResponse> {
    const response = await api.post<AiopsActionExecutionResponse>(
      '/admin/aiops/actions/execute',
      payload
    );
    return response.data;
  },
};
