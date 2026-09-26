import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePRFormData } from "../schemas/pr.schema";
import {
  type ProjectDetails,
  type ProjectListItem,
  projectsService,
} from "../services/projectsService";

// Hook para buscar a lista de projetos/artigos aos quais o usuário tem acesso
export function useProjectsList(filters?: {
  teamId?: string;
  academicPeriodId?: string;
}) {
  return useQuery<ProjectListItem[]>({
    queryKey: ["projects", filters],
    queryFn: () => projectsService.getProjectsList(filters),
  });
}

// Hook para buscar dados do projeto e suas seções
export function useProjectDetails(projectId: string) {
  return useQuery<ProjectDetails>({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.getProjectDetails(projectId),
    enabled: Boolean(projectId),
  });
}

// Hook para obter o resumo acadêmico de alterações no rascunho
export function useTaskDiffSummary(
  projectId: string,
  taskId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["task-diff-summary", projectId, taskId],
    queryFn: () => projectsService.getTaskDiffSummary(projectId, taskId!),
    enabled: Boolean(projectId && taskId && enabled),
  });
}

// Mutação para Salvar Progresso (Commit Silencioso do Autor via Service Token)
export function useSaveProgressMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; commitMessage?: string }) =>
      projectsService.saveProgress(projectId, data.taskId, data.commitMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

// Mutação para Criar Pull Request (Abertura de Revisão Acadêmica)
export function useCreatePRMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePRFormData) =>
      projectsService.createPullRequest(projectId, data),
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
    queryFn: () => projectsService.getPullRequestsList(projectId),
    enabled: Boolean(projectId),
  });
}

// Mutação para Realizar Merge da Seção
export function useMergePRMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pullRequestId: string) =>
      projectsService.mergePullRequest(pullRequestId),
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
    mutationFn: (data: {
      name: string;
      targetConference?: string;
      submissionDeadline?: string;
      template?: string;
      teamId?: string;
      coAuthorIds?: string[];
      reviewerId?: string;
    }) =>
      projectsService.createProject({
        name: data.name,
        targetConferenceName: data.targetConference,
        targetConferenceDate: data.submissionDeadline,
        teamId: data.teamId,
        coAuthorIds: data.coAuthorIds || [],
        reviewerId: data.reviewerId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["user-articles"] });
    },
  });
}
