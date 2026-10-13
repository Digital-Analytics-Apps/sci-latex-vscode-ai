import type { CreatePRFormData } from "../schemas/pr.schema";
import type { StageStatus } from "../constants/status";
import type {
  CreateProjectInput,
  ProjectDetails,
  ProjectListItem,
} from "../types/project.types";
import type { CreateStageInput, ProjectStage } from "../types/stage.types";
import { api } from "./api";

export type { ProjectMember } from "../types/user.types";
export type { ProjectStage } from "../types/stage.types";
export type {
  CreateProjectInput,
  ProjectDetails,
  ProjectListItem,
} from "../types/project.types";

const PROJETCT_URL = "/projects";
const PULL_REQUESTS_URL = "/pull-requests";

export const projectsService = {
  // Buscar lista de projetos/artigos aos quais o usuário tem acesso
  async getProjectsList(filters?: {
    teamId?: string;
    academicPeriodId?: string;
  }): Promise<ProjectListItem[]> {
    const response = await api.get(PROJETCT_URL, { params: filters });
    return response.data.projects || [];
  },

  // Buscar detalhes do projeto e seus membros/seções
  async getProjectDetails(projectId: string): Promise<ProjectDetails> {
    const response = await api.get(`${PROJETCT_URL}/${projectId}`);
    return response.data.project || response.data;
  },

  // Salvar Progresso (Commit Silencioso do Autor via Service Token)
  async saveProgress(
    projectId: string,
    taskId: string,
    commitMessage?: string,
  ) {
    const response = await api.post(
      `${PROJETCT_URL}/${projectId}/tasks/${taskId}/commit`,
      {
        commitMessage,
      },
    );
    return response.data;
  },

  // Obter Resumo Acadêmico de Alterações do Rascunho (Desde o último salvamento)
  async getTaskDiffSummary(projectId: string, taskId: string) {
    const response = await api.get(
      `${PROJETCT_URL}/${projectId}/tasks/${taskId}/diff-summary`,
    );
    return response.data;
  },

  // Criar Pull Request (Abertura de Revisão Acadêmica)
  async createPullRequest(projectId: string, data: CreatePRFormData) {
    const response = await api.post(PULL_REQUESTS_URL, {
      ...data,
      projectId,
    });
    return response.data;
  },

  // Listar Pull Requests filtrados por projeto
  async getPullRequestsList(projectId?: string) {
    const response = await api.get(PULL_REQUESTS_URL, {
      params: { projectId },
    });
    return response.data.pullRequests || [];
  },

  // Realizar Merge da Seção
  async mergePullRequest(pullRequestId: string) {
    const response = await api.post(
      `${PULL_REQUESTS_URL}/${pullRequestId}/merge`,
    );
    return response.data;
  },

  // Criar Novo Projeto / Artigo Científico
  async createProject(data: CreateProjectInput) {
    const response = await api.post(PROJETCT_URL, data);
    return response.data;
  },

  // Atualizar Metadados do Projeto / Artigo
  async updateProject(projectId: string, data: Partial<CreateProjectInput>) {
    const response = await api.patch(`${PROJETCT_URL}/${projectId}`, data);
    return response.data;
  },

  // Obter etapas de escrita do artigo
  async getProjectStages(projectId: string): Promise<ProjectStage[]> {
    const response = await api.get(`${PROJETCT_URL}/${projectId}/stages`);
    return response.data;
  },

  // Criar nova etapa customizada de escrita
  async createProjectStage(
    projectId: string,
    data: CreateStageInput,
  ): Promise<ProjectStage> {
    const response = await api.post(
      `${PROJETCT_URL}/${projectId}/stages`,
      data,
    );
    return response.data;
  },

  // Atualizar status ou metadados de uma etapa de escrita (com trava de Gatekeepers)
  async updateProjectStage(
    projectId: string,
    stageId: string,
    data: {
      title?: string;
      description?: string;
      order?: number;
      status?: StageStatus;
      plannedCompletionDate?: string | null;
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
    },
  ): Promise<ProjectStage> {
    const response = await api.patch(
      `${PROJETCT_URL}/${projectId}/stages/${stageId}`,
      data,
    );
    return response.data;
  },

  // Reordenar etapas do artigo em lote
  async reorderProjectStages(
    projectId: string,
    stages: { id: string; order: number }[],
  ): Promise<ProjectStage[]> {
    const response = await api.put(
      `${PROJETCT_URL}/${projectId}/stages/reorder`,
      { stages },
    );
    return response.data;
  },

  // Excluir etapa de escrita customizada (Etapas Gatekeeper são protegidas)
  async deleteProjectStage(projectId: string, stageId: string): Promise<void> {
    await api.delete(`${PROJETCT_URL}/${projectId}/stages/${stageId}`);
  },

  // Obter apontamentos de revisão agrupados por etapa
  async getReviewCommentsByStage(projectId: string): Promise<any[]> {
    const response = await api.get(
      `${PROJETCT_URL}/${projectId}/review-comments-by-stage`,
    );
    return response.data;
  },

  // Adicionar membro ao projeto / artigo
  async addProjectMember(
    projectId: string,
    data: { userId: string; role: string },
  ) {
    const response = await api.post(
      `${PROJETCT_URL}/${projectId}/members`,
      data,
    );
    return response.data;
  },
};
