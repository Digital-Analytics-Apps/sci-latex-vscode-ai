import { useQuery } from "@tanstack/react-query";
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
