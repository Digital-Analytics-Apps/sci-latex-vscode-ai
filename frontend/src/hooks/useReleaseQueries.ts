import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateRCInput,
  releasesService,
} from "../services/releasesService";

export function useReleaseCandidatesQuery(projectId: string) {
  return useQuery({
    queryKey: ["release-candidates", projectId],
    queryFn: () => releasesService.getReleaseCandidates(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateRCMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: CreateRCInput) =>
      releasesService.createReleaseCandidate(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["release-candidates", projectId],
      });
    },
  });
}

export function usePublishReleaseMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionTag?: string) =>
      releasesService.publishRelease(projectId, versionTag),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["release-candidates", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}
