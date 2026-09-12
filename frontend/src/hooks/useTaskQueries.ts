import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type CreateTaskInput, tasksService } from "../services/tasksService";

export function useTasksQuery(projectId: string) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => tasksService.getTasksByProject(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateTaskMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) =>
      tasksService.createTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useActivateTaskWorkspaceMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      tasksService.activateWorkspace(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}
