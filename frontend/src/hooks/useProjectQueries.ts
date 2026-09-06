import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePRFormData } from "../schemas/pr.schema";
import { api } from "../services/api";

export interface Section {
  id: string;
  title: string;
  filePath: string;
  branchName: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface ProjectDetails {
  id: string;
  name: string;
  description?: string;
  gitRepoPath: string;
  teamId: string;
  submissionStatus: string;
  sections: Section[];
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
  _count?: { sections: number; members: number };
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
    mutationFn: async (data: { sectionId: string; commitMessage?: string }) => {
      const response = await api.post(
        `/projects/${projectId}/sections/${data.sectionId}/commit`,
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
      const response = await api.post(
        `/projects/${projectId}/pull-requests`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
    },
  });
}

// Mutação para Realizar Merge da Seção (Liberada após aprovação do NIT)
export function useMergePRMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pullRequestId: string) => {
      const response = await api.post(
        `/projects/${projectId}/pull-requests/${pullRequestId}/merge`,
      );
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
    }) => {
      const response = await api.post("/projects", {
        name: data.name,
        targetConferenceName: data.targetConference,
        targetConferenceDate: data.submissionDeadline,
        teamId: data.teamId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
