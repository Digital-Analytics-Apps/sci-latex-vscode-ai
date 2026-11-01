import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { tasksService } from "../services/tasksService";
import type { CreateTaskInput } from "../types/task.types";

export function useTasksQuery(projectId: string, params?: Record<string, unknown>) {
  const paramsKey = JSON.stringify(params || {});
  return useQuery({
    queryKey: ["tasks", projectId, paramsKey],
    queryFn: () => tasksService.getTasksByProject(projectId, params),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTaskMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) =>
      tasksService.createTask(projectId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useActivateTaskWorkspaceMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      tasksService.activateWorkspace(projectId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useClaimTaskMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.claimTask(projectId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useUnclaimTaskMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.unclaimTask(projectId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useRequestReviewMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, notes }: { taskId: string; notes?: string }) =>
      tasksService.requestReview(projectId, taskId, notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useStartReviewMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.startReview(projectId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useReviewDecisionMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      decision,
      feedback,
    }: {
      taskId: string;
      decision: "APPROVED" | "CHANGES_REQUESTED";
      feedback?: string;
    }) => tasksService.reviewDecision(projectId, taskId, decision, feedback),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

/**
 * Hook para consultar a lista de evidências ativas de uma tarefa
 */
export function useTaskEvidencesQuery(
  projectId: string,
  taskId?: string | null,
) {
  return useQuery({
    queryKey: ["task-evidences", projectId, taskId],
    queryFn: () => {
      if (!projectId || !taskId) return [];
      return tasksService.getEvidences(projectId, taskId);
    },
    enabled: Boolean(projectId && taskId && !taskId.startsWith("stage-")),
  });
}

/**
 * Hook para orquestrar o upload direto de imagem ou PDF para o MinIO e confirmação no backend
 */
export function useUploadTaskEvidenceMutation(
  projectId: string,
  taskId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      title,
      onProgress,
    }: {
      file: File;
      title?: string;
      onProgress?: (percent: number) => void;
    }) => {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const evidenceType = isPdf ? "PDF" : "IMAGE";

      // 1. Obter a URL pré-assinada de PUT
      const presign = await tasksService.presignEvidenceUpload(projectId, taskId, {
        fileName: file.name,
        mimeType: file.type || (isPdf ? "application/pdf" : "image/png"),
        sizeBytes: file.size,
        type: evidenceType,
        title: title || file.name,
      });

      // 2. Upload direto para o MinIO via PUT com monitoramento de progresso
      await tasksService.uploadBinaryToMinio(presign.uploadUrl, file, onProgress);

      // 3. Confirmar a recepção no backend para promover de PENDING a CONFIRMED
      return tasksService.confirmEvidenceUpload(projectId, taskId, presign.evidenceId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["task-evidences", projectId, taskId],
      });
    },
  });
}

/**
 * Hook para adicionar um link externo como evidência da tarefa
 */
export function useAddLinkEvidenceMutation(
  projectId: string,
  taskId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; url: string }) =>
      tasksService.addLinkEvidence(projectId, taskId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["task-evidences", projectId, taskId],
      });
    },
  });
}

/**
 * Hook para deletar uma evidência da tarefa
 */
export function useDeleteTaskEvidenceMutation(
  projectId: string,
  taskId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) =>
      tasksService.deleteEvidence(projectId, taskId, evidenceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["task-evidences", projectId, taskId],
      });
    },
  });
}
