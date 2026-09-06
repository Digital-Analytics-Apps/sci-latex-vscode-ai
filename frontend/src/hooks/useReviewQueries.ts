import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NITParecerFormData } from "../schemas/nit.schema";
import { api } from "../services/api";

export interface PullRequestDetail {
  id: string;
  title: string;
  description?: string;
  status:
    | "DRAFT"
    | "UNDER_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "MERGED"
    | "CANCELLED";
  nitStatus: "NOT_REQUIRED" | "WAITING_NIT" | "APPROVED_NIT" | "REJECTED_NIT";
  nitNotes?: string;
  sectionId: string;
  authorId: string;
  reviewerId?: string;
  projectId: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
  reviewer?: { id: string; name: string; email: string };
  section: { id: string; title: string; filePath: string };
  diffContent?: string;
  pdfUrl?: string;
}

// Hook para buscar a lista de PRs pendentes para o Revisor/Coordenador
export function usePendingReviews() {
  return useQuery<PullRequestDetail[]>({
    queryKey: ["pull-requests", "pending"],
    queryFn: async () => {
      const response = await api.get("/pull-requests");
      return response.data;
    },
  });
}

// Hook para buscar os detalhes completos de um PR específico (Diff + PDF Url)
export function usePRDetails(prId: string) {
  return useQuery<PullRequestDetail>({
    queryKey: ["pull-request", prId],
    queryFn: async () => {
      const response = await api.get(`/pull-requests/${prId}`);
      return response.data;
    },
    enabled: Boolean(prId),
  });
}

// Mutação para o Revisor registrar o Parecer do NIT
export function useSubmitNITParecerMutation(prId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NITParecerFormData) => {
      const response = await api.patch(`/pull-requests/${prId}/nit`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pull-request", prId] });
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
    },
  });
}
