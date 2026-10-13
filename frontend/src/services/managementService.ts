import type {
  AcademicPeriod,
  ManagerDashboardData,
  ManagerMetrics,
  TeamAcademicGoal,
} from "../types/academic-period.types";
import { api } from "./api";

export type {
  AcademicPeriod,
  ManagerDashboardData,
  ManagerDashboardTeamSummary,
  ManagerMetrics,
  TeamAcademicGoal,
} from "../types/academic-period.types";

const ACADEMIC_PERIODS_URL = "/academic-periods";
const DASHBOARD_MANAGER_URL = "/dashboard/manager";
const TASKS_URL = "/tasks";

export const managementService = {
  // Buscar a lista de Períodos Acadêmicos (ex: Ciclo 2026/2027)
  async getAcademicPeriods(managerId?: string): Promise<AcademicPeriod[]> {
    const response = await api.get(ACADEMIC_PERIODS_URL, {
      params: { managerId },
    });
    return response.data.academicPeriods || response.data || [];
  },

  // Criar novo ciclo acadêmico com meta global de artigos
  async createAcademicPeriod(data: {
    name: string;
    startDate: string;
    endDate: string;
    targetArticlesCount?: number;
    managerId?: string;
  }): Promise<AcademicPeriod> {
    const response = await api.post(ACADEMIC_PERIODS_URL, data);
    return response.data.academicPeriod || response.data;
  },

  // Definir ou atualizar cota/meta de artigos para um laboratório/time específico
  async setTeamAcademicGoal(data: {
    academicPeriodId: string;
    teamId: string;
    targetArticles: number;
  }): Promise<TeamAcademicGoal> {
    const response = await api.post(
      `${ACADEMIC_PERIODS_URL}/${data.academicPeriodId}/goals`,
      {
        teamId: data.teamId,
        targetArticles: data.targetArticles,
      },
    );
    return response.data.teamGoal || response.data;
  },

  // Obter cotas distribuídas por time para um período acadêmico
  async getTeamAcademicGoals(
    academicPeriodId: string,
  ): Promise<TeamAcademicGoal[]> {
    const response = await api.get(
      `${ACADEMIC_PERIODS_URL}/${academicPeriodId}/goals`,
    );
    return response.data.teamGoals || response.data || [];
  },

  // Buscar o dashboard consolidado do Gerente no backend (Prisma)
  async getManagerDashboard(filters?: {
    academicPeriodId?: string;
    teamId?: string;
  }): Promise<ManagerDashboardData> {
    const response = await api.get(DASHBOARD_MANAGER_URL, {
      params: filters,
    });
    return response.data;
  },

  // Buscar as métricas do Gerente filtradas por Período Acadêmico (fallback/legacy)
  async getManagerMetrics(periodId?: string): Promise<ManagerMetrics> {
    const response = await api.get(DASHBOARD_MANAGER_URL, {
      params: { academicPeriodId: periodId },
    });
    return response.data;
  },

  // Alterar a data limite de uma tarefa da equipe (Coordenador)
  async updateTaskDeadline(taskId: string, newDueDate: string) {
    const response = await api.patch(`${TASKS_URL}/${taskId}/deadline`, {
      dueDate: newDueDate,
    });
    return response.data;
  },
};
