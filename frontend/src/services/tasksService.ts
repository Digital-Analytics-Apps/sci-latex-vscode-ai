import { api } from "./api";

export interface TaskItem {
  id: string;
  projectId: string;
  projectName?: string;
  sectionTitle?: string;
  title: string;
  branchName: string;
  status:
    "TODO" | "IN_PROGRESS" | "UNDER_PEER_REVIEW" | "CHANGES_REQUESTED" | "DONE";
  dueDate: string;
  assignee: string;
  assignedToId?: string;
}

export interface CreateTaskInput {
  title: string;
  assignedToId: string;
  dueDate?: string;
}

export const tasksService = {
  // Buscar tarefas de um projeto diretamente da API REST real (/projects/:projectId/tasks)
  async getTasksByProject(projectId: string): Promise<TaskItem[]> {
    if (!projectId) return [];
    const response = await api.get(`/projects/${projectId}/tasks`);
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
};
