import { useQuery } from "@tanstack/react-query";
import { articlesService } from "../services/articlesService";

export function useUserArticlesQuery() {
  return useQuery({
    queryKey: ["articles"],
    queryFn: () => articlesService.getUserArticles(),
  });
}
