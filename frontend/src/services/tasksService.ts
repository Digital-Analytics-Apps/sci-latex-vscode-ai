import type { CreateTaskInput, TaskItem } from "../types/task.types";
import { api } from "./api";

export const tasksService = {
  // Buscar tarefas de um projeto diretamente da API REST real (/projects/:projectId/tasks)
  async getTasksByProject(
    projectId: string,
    params?: Record<string, any>,
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
};
