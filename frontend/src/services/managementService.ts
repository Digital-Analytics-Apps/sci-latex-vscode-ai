import { DeadlineStatus } from "../constants/status";
import { api } from "./api";

export { DeadlineStatus };

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
  status: DeadlineStatus;
}

const ACADEMIC_PERIODS_URL = "/academic-periods";
const MANAGER_REPORTS_URL = "/reports/manager";
const TASKS_URL = "/tasks";

export const managementService = {
  // Buscar a lista de Períodos Acadêmicos (ex: Ciclo 2026/2027)
  async getAcademicPeriods(): Promise<AcademicPeriod[]> {
    const response = await api.get(ACADEMIC_PERIODS_URL);
    return response.data;
  },

  // Buscar as métricas do Gerente filtradas por Período Acadêmico
  async getManagerMetrics(periodId?: string): Promise<ManagerMetrics> {
    const response = await api.get(MANAGER_REPORTS_URL, {
      params: { periodId },
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
