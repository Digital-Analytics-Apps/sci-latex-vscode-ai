import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePRFormData } from "../schemas/pr.schema";
import { api } from "../services/api";

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
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string };
  }>;
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

// Hook para buscar a lista de projetos/artigos aos quais o usuário tem acesso
export function useProjectsList(filters?: {
  teamId?: string;
  academicPeriodId?: string;
}) {
  return useQuery<ProjectListItem[]>({
    queryKey: ["projects", filters],
    queryFn: async () => {
      const response = await api.get("/projects", { params: filters });
      return response.data.projects;
    },
  });
}

// Hook para buscar dados do projeto e suas seções
export function useProjectDetails(projectId: string) {
  return useQuery<ProjectDetails>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
    enabled: Boolean(projectId),
  });
}

// Mutação para Salvar Progresso (Commit Silencioso do Autor via Service Token)
export function useSaveProgressMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { taskId: string; commitMessage?: string }) => {
      const response = await api.post(
        `/projects/${projectId}/tasks/${data.taskId}/commit`,
        {
          commitMessage:
            data.commitMessage || "Progress update: LaTeX content edit",
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

// Mutação para Criar Pull Request (Abertura de Revisão Acadêmica)
export function useCreatePRMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePRFormData) => {
      const response = await api.post("/pull-requests", {
        ...data,
        projectId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
    },
  });
}

// Hook para listar Pull Requests filtrados por projeto
export function usePullRequestsList(projectId?: string) {
  return useQuery({
    queryKey: ["pull-requests", projectId],
    queryFn: async () => {
      const response = await api.get("/pull-requests", {
        params: { projectId },
      });
      return response.data.pullRequests || [];
    },
    enabled: Boolean(projectId),
  });
}

// Mutação para Realizar Merge da Seção
export function useMergePRMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pullRequestId: string) => {
      const response = await api.post(`/pull-requests/${pullRequestId}/merge`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
    },
  });
}

// Mutação para Criar Novo Projeto / Artigo Científico
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      targetConference?: string;
      submissionDeadline?: string;
      template?: string;
      teamId?: string;
      coAuthorIds?: string[];
      reviewerId?: string;
    }) => {
      const response = await api.post("/projects", {
        name: data.name,
        targetConferenceName: data.targetConference,
        targetConferenceDate: data.submissionDeadline,
        teamId: data.teamId,
        coAuthorIds: data.coAuthorIds || [],
        reviewerId: data.reviewerId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["user-articles"] });
    },
  });
}
