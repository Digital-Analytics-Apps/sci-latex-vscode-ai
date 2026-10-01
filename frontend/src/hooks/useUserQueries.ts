import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "../services/usersService";

export function useUserSearchQuery(search: string = "", role?: string) {
  const queryText = search.trim();
  const isEnabled = queryText.length >= 3;

  return useQuery({
    queryKey: ["users", "search", queryText, role || "ALL"],
    queryFn: () => usersService.searchUsers(queryText, role),
    enabled: isEnabled,
    staleTime: 60 * 1000,
  });
}

export function useUsersListQuery(filters?: {
  search?: string;
  role?: string;
  teamId?: string;
}) {
  const search = filters?.search || "";
  const role = filters?.role || "";
  const teamId = filters?.teamId || "";

  return useQuery({
    queryKey: ["users", "list", search, role, teamId],
    queryFn: () => usersService.searchUsers(search, role, teamId),
  });
}

export function useCoAuthorsQuery() {
  return useQuery({
    queryKey: ["users", "co-authors"],
    queryFn: () => usersService.getCoAuthors(),
  });
}

export function useReviewersQuery() {
  return useQuery({
    queryKey: ["users", "reviewers"],
    queryFn: () => usersService.getReviewers(),
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role?: string;
    }) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
