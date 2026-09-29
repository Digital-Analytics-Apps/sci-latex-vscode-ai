import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateTeamInput,
  teamsService,
  type UpdateTeamInput,
} from "../services/teamsService";

export function useTeamsQuery(search?: string) {
  return useQuery({
    queryKey: ["teams", search || ""],
    queryFn: () => teamsService.getTeams(search),
  });
}

export function useTeamDetailsQuery(teamId: string) {
  return useQuery({
    queryKey: ["team", teamId],
    queryFn: () => teamsService.getTeamById(teamId),
    enabled: Boolean(teamId),
  });
}

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTeamInput) => teamsService.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });
}

export function useUpdateTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: UpdateTeamInput }) =>
      teamsService.updateTeam(payload.id, payload.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });
}

export function useDeleteTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => teamsService.deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });
}

export function useAddTeamMemberMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { userId: string; role?: string } | string) => {
      if (typeof payload === "string") {
        return teamsService.addMember(teamId, payload);
      }
      return teamsService.addMember(teamId, payload.userId, payload.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });
}

export function useRemoveTeamMemberMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => teamsService.removeMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
    },
  });
}
