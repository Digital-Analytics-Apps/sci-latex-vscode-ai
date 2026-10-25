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
