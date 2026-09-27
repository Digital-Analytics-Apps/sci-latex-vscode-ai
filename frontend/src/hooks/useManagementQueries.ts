import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AcademicPeriod,
  managementService,
  type ManagerDashboardData,
  type ManagerMetrics,
} from "../services/managementService";

// Hook para buscar a lista de Períodos Acadêmicos (ex: Ciclo 2026/2027)
export function useAcademicPeriods() {
  return useQuery<AcademicPeriod[]>({
    queryKey: ["academic-periods"],
    queryFn: () => managementService.getAcademicPeriods(),
  });
}

// Hook para buscar o Dashboard Consolidado do Gerente (Prisma)
export function useManagerDashboardQuery(filters?: {
  academicPeriodId?: string;
  teamId?: string;
}) {
  return useQuery<ManagerDashboardData>({
    queryKey: ["manager-dashboard", filters],
    queryFn: () => managementService.getManagerDashboard(filters),
  });
}

// Hook para buscar as métricas do Gerente filtradas por Período Acadêmico (legacy fallback)
export function useManagerMetrics(periodId?: string) {
  return useQuery<ManagerMetrics>({
    queryKey: ["manager-metrics", periodId],
    queryFn: () => managementService.getManagerMetrics(periodId),
  });
}

// Hook para criar um novo Ciclo Acadêmico
export function useCreateAcademicPeriodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      startDate: string;
      endDate: string;
      targetArticlesCount?: number;
    }) => managementService.createAcademicPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });
}

// Hook para definir cota de artigos para uma equipe em um período acadêmico
export function useSetTeamGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      academicPeriodId: string;
      teamId: string;
      targetArticles: number;
    }) => managementService.setTeamAcademicGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
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
