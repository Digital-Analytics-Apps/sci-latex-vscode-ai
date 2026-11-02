import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { templateKeys } from "../api/queryKeys";
import { templatesService } from "../services/templatesService";
import type { UploadTemplateInput } from "../types/template.types";

export function useTemplatesQuery() {
  return useQuery({
    queryKey: templateKeys.lists(),
    queryFn: () => templatesService.getTemplatesList(),
    staleTime: 1000 * 60 * 5, // 5 min de cache
  });
}

export function useUploadTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadTemplateInput) =>
      templatesService.uploadTemplate(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}
