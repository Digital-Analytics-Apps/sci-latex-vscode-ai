import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiopsApi } from '../api/aiopsApi';
import {
  AiopsActionExecutionRequest,
  AiopsChatSendRequest,
  IncidentSeverity,
  IncidentStatus,
} from '../types/aiops.types';

export const AIOPS_KEYS = {
  all: ['aiops'] as const,
  incidents: (filters?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    serviceName?: string;
  }) => [...AIOPS_KEYS.all, 'incidents', filters] as const,
  incidentDetail: (id: string) => [...AIOPS_KEYS.all, 'incident', id] as const,
  chatHistory: (incidentId?: string | null) =>
    [...AIOPS_KEYS.all, 'chat-history', incidentId] as const,
};

export function useAiopsIncidents(
  filters?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    serviceName?: string;
    limit?: number;
    page?: number;
  },
  autoRefresh = true
) {
  return useQuery({
    queryKey: AIOPS_KEYS.incidents(filters),
    queryFn: () => aiopsApi.listIncidents(filters),
    refetchInterval: autoRefresh ? 10000 : false,
    staleTime: 8000,
  });
}

export function useAiopsIncidentDetails(id?: string) {
  return useQuery({
    queryKey: AIOPS_KEYS.incidentDetail(id ?? ''),
    queryFn: () => aiopsApi.getIncidentById(id!),
    enabled: Boolean(id),
    staleTime: 15000,
  });
}

export function useAiopsChatHistory(
  params?: { incidentId?: string; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: AIOPS_KEYS.chatHistory(params?.incidentId),
    queryFn: () => aiopsApi.getChatMessages(params),
    enabled,
    staleTime: 10000,
  });
}

export function useAiopsDiagnosisMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (incidentId: string) => aiopsApi.runRcaDiagnosis(incidentId),
    onSuccess: (_, incidentId) => {
      queryClient.invalidateQueries({ queryKey: AIOPS_KEYS.incidentDetail(incidentId) });
      queryClient.invalidateQueries({ queryKey: AIOPS_KEYS.all });
    },
  });
}

export function useAiopsChatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AiopsChatSendRequest) => aiopsApi.sendChatMessage(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AIOPS_KEYS.chatHistory(variables.incidentId) });
      if (variables.incidentId) {
        queryClient.invalidateQueries({
          queryKey: AIOPS_KEYS.incidentDetail(variables.incidentId),
        });
      }
    },
  });
}

export function useAiopsExecuteActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AiopsActionExecutionRequest) =>
      aiopsApi.executeRemediationAction(payload),
    onSuccess: (_, variables) => {
      if (variables.incidentId) {
        queryClient.invalidateQueries({
          queryKey: AIOPS_KEYS.incidentDetail(variables.incidentId),
        });
      }
      queryClient.invalidateQueries({ queryKey: AIOPS_KEYS.all });
    },
  });
}
