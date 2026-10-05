import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePRFormData } from "../schemas/pr.schema";
import {
  type ProjectDetails,
  type ProjectListItem,
  projectsService,
} from "../services/projectsService";
import type { CreateStageInput } from "../types/stage.types";

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

// Mutação para Criar Pull Request (Abertura de Revisão Acadêmica)
export function useCreatePRMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePRFormData) =>
      projectsService.createPullRequest(projectId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
    },
  });
}

// Mutações para gerenciamento dinâmico de etapas de escrita (stages)
export function useCreateStageMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStageInput) =>
      projectsService.createProjectStage(projectId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({
        queryKey: ["project-stages", projectId],
      });
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}

export function useUpdateStageMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      stageId: string;
      title?: string;
      order?: number;
      status?: any;
    }) =>
      projectsService.updateProjectStage(projectId, data.stageId, {
        title: data.title,
        order: data.order,
        status: data.status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({
        queryKey: ["project-stages", projectId],
      });
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}

export function useDeleteStageMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stageId: string) =>
      projectsService.deleteProjectStage(projectId, stageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({
        queryKey: ["project-stages", projectId],
      });
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
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
      stages?: Array<{
        title: string;
        description?: string;
        plannedCompletionDate?: string;
      }>;
    }) =>
      projectsService.createProject({
        name: data.name,
        targetConferenceName: data.targetConference,
        targetConferenceDate: data.submissionDeadline,
        teamId: data.teamId,
        coAuthorIds: data.coAuthorIds || [],
        reviewerId: data.reviewerId,
        stages: data.stages,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
      await queryClient.invalidateQueries({ queryKey: ["user-articles"] });
    },
  });
}

// Mutação para Adicionar Membro ao Artigo
export function useAddProjectMemberMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      projectsService.addProjectMember(projectId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["user-articles"] });
    },
  });
}
