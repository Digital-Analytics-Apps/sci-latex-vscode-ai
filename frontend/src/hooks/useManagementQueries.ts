import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AcademicPeriod,
  managementService,
  type ManagerMetrics,
} from "../services/managementService";

// Hook para buscar a lista de Períodos Acadêmicos (ex: Ciclo 2026/2027)
export function useAcademicPeriods() {
  return useQuery<AcademicPeriod[]>({
    queryKey: ["academic-periods"],
    queryFn: () => managementService.getAcademicPeriods(),
  });
}

// Hook para buscar as métricas do Gerente filtradas por Período Acadêmico
export function useManagerMetrics(periodId?: string) {
  return useQuery<ManagerMetrics>({
    queryKey: ["manager-metrics", periodId],
    queryFn: () => managementService.getManagerMetrics(periodId),
  });
}

// Hook para o Coordenador alterar a data limite de uma tarefa da equipe
export function useUpdateDeadlineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; newDueDate: string }) =>
      managementService.updateTaskDeadline(data.taskId, data.newDueDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinator-deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}
