import axios from "axios";
import type {
  AddLinkEvidenceInput,
  CreateTaskInput,
  PresignUploadInput,
  PresignUploadResponse,
  TaskEvidenceItem,
  TaskItem,
} from "../types/task.types";
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

  /**
   * Busca a lista de evidências confirmadas de uma tarefa
   */
  async getEvidences(
    projectId: string,
    taskId: string,
  ): Promise<TaskEvidenceItem[]> {
    const response = await api.get(
      `/projects/${projectId}/tasks/${taskId}/evidences`,
    );
    return response.data.evidences || [];
  },

  /**
   * Solicita ao backend uma URL pré-assinada de upload para imagem ou PDF
   */
  async presignEvidenceUpload(
    projectId: string,
    taskId: string,
    data: PresignUploadInput,
  ): Promise<PresignUploadResponse> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/evidences/presign`,
      data,
    );
    return response.data;
  },

  /**
   * Transmite o arquivo binário diretamente para o MinIO via HTTP PUT na URL pré-assinada.
   * Usa axios puro (sem cabeçalho Bearer) para respeitar a assinatura S3 e reportar progresso.
   */
  async uploadBinaryToMinio(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percent);
        }
      },
    });
  },

  /**
   * Avisa o backend que o upload no MinIO terminou para validação e promoção a CONFIRMED
   */
  async confirmEvidenceUpload(
    projectId: string,
    taskId: string,
    evidenceId: string,
  ): Promise<TaskEvidenceItem> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/evidences/${evidenceId}/confirm`,
    );
    return response.data;
  },

  /**
   * Adiciona um link externo como evidência (ex: Colab, GitHub, Zenodo)
   */
  async addLinkEvidence(
    projectId: string,
    taskId: string,
    data: AddLinkEvidenceInput,
  ): Promise<TaskEvidenceItem> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/evidences/link`,
      data,
    );
    return response.data;
  },

  /**
   * Exclui uma evidência e remove o binário associado do MinIO
   */
  async deleteEvidence(
    projectId: string,
    taskId: string,
    evidenceId: string,
  ): Promise<void> {
    await api.delete(
      `/projects/${projectId}/tasks/${taskId}/evidences/${evidenceId}`,
    );
  },
};
