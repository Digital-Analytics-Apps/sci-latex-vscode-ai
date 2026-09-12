import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export interface AcademicPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface ManagerMetrics {
  totalProjects: number;
  publishedCount: number;
  onTimeCount: number;
  warningCount: number;
  overdueCount: number;
  targetSuccessRate: number;
  nitApprovalRate: number;
}

export interface TeamDeadlineItem {
  id: string;
  projectName: string;
  taskTitle: string;
  authorName: string;
  dueDate: string;
  status: "ON_TIME" | "WARNING_SOON" | "OVERDUE";
}

// Hook para buscar a lista de Períodos Acadêmicos (ex: Ciclo 2026/2027)
export function useAcademicPeriods() {
  return useQuery<AcademicPeriod[]>({
    queryKey: ["academic-periods"],
    queryFn: async () => {
      const response = await api.get("/academic-periods");
      return response.data;
    },
  });
}

// Hook para buscar as métricas do Gerente filtradas por Período Acadêmico
export function useManagerMetrics(periodId?: string) {
  return useQuery<ManagerMetrics>({
    queryKey: ["manager-metrics", periodId],
    queryFn: async () => {
      const response = await api.get("/reports/manager", {
        params: { periodId },
      });
      return response.data;
    },
  });
}

// Hook para o Coordenador alterar a data limite de uma tarefa da equipe
export function useUpdateDeadlineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { taskId: string; newDueDate: string }) => {
      const response = await api.patch(`/tasks/${data.taskId}/deadline`, {
        dueDate: data.newDueDate,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinator-deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}
