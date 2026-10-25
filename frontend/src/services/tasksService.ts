import type { CreateTaskInput, TaskItem } from "../types/task.types";
import { api } from "./api";

export const tasksService = {
  // Buscar tarefas de um projeto diretamente da API REST real (/projects/:projectId/tasks)
  async getTasksByProject(
    projectId: string,
    params?: Record<string, unknown>,
  ): Promise<TaskItem[]> {
    if (!projectId) return [];
    const response = await api.get(`/projects/${projectId}/tasks`, { params });
    return response.data.tasks || [];
  },

  // Criar nova tarefa
  async createTask(
    projectId: string,
    data: CreateTaskInput,
  ): Promise<TaskItem> {
    const response = await api.post(`/projects/${projectId}/tasks`, data);
    return response.data.task || response.data;
  },

  // Ativar workspace da tarefa no Pod Kubernetes
  async activateWorkspace(projectId: string, taskId: string) {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/workspace`,
    );
    return response.data;
  },

  // Assinar tarefa (Claim)
  async claimTask(projectId: string, taskId: string): Promise<TaskItem> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/claim`,
    );
    return response.data.task || response.data;
  },

  // Desassinar tarefa (Unclaim)
  async unclaimTask(projectId: string, taskId: string): Promise<TaskItem> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/unclaim`,
    );
    return response.data.task || response.data;
  },

  // Solicitar revisão de tarefa (Autor -> REVIEW_REQUESTED)
  async requestReview(
    projectId: string,
    taskId: string,
    notes?: string,
  ): Promise<TaskItem> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/request-review`,
      { notes },
    );
    return response.data.task || response.data;
  },

  // Revisor assume inspeção (Revisor -> IN_REVIEW)
  async startReview(projectId: string, taskId: string): Promise<TaskItem> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/start-review`,
    );
    return response.data.task || response.data;
  },

  // Decisão do revisor (APPROVED ou CHANGES_REQUESTED)
  async reviewDecision(
    projectId: string,
    taskId: string,
    decision: "APPROVED" | "CHANGES_REQUESTED",
    feedback?: string,
  ): Promise<TaskItem> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/decision`,
      { decision, feedback },
    );
    return response.data.task || response.data;
  },
};
