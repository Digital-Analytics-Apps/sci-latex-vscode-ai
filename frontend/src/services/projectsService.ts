import type { CreatePRFormData } from "../schemas/pr.schema";
import { api } from "./api";

export interface ProjectMember {
  id?: string;
  userId?: string;
  role?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface ProjectDetails {
  id: string;
  name: string;
  description?: string;
  gitRepoPath: string;
  teamId: string;
  submissionStatus: string;
  tasks?: Array<{
    id: string;
    title: string;
    branchName: string;
    status: string;
  }>;
  members: ProjectMember[];
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string | null;
  submissionStatus: string;
  targetConferenceName?: string | null;
  targetConferenceDate?: string | null;
  backupConferenceName?: string | null;
  backupConferenceDate?: string | null;
  createdAt: string;
  updatedAt: string;
  team?: { id: string; name: string };
  _count?: { tasks: number; members: number };
}

export interface CreateProjectInput {
  name: string;
  targetConferenceName?: string;
  targetConferenceDate?: string;
  teamId?: string;
  coAuthorIds?: string[];
  reviewerId?: string;
}

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
};
