import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NITStatus, PRStatus } from "../constants/status";
import type { NITParecerFormData } from "../schemas/nit.schema";
import { api } from "../services/api";

export { NITStatus, PRStatus };

export interface ReviewCommentItem {
  id: string;
  userId: string;
  lineNumer?: number;
  comment: string;
  createdAt: string;
  user?: { name: string; email?: string };
}

export interface PullRequestDetail {
  id: string;
  title: string;
  description?: string;
  status: PRStatus;
  nitStatus: NITStatus;
  sentToNitAt?: string;
  sentToNitNotes?: string;
  nitApprovedAt?: string;
  nitNotes?: string;
  taskId?: string;
  authorId: string;
  reviewerId?: string;
  projectId: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
  reviewer?: { id: string; name: string; email: string };
  task?: { id: string; title: string; branchName: string };
  project?: { id: string; name: string };
  comments?: ReviewCommentItem[];
  diffContent?: string;
  pdfUrl?: string;
}

// Hook para buscar a lista de PRs pendentes para o Revisor/Coordenador
export function usePendingReviews() {
  return useQuery<PullRequestDetail[]>({
    queryKey: ["pull-requests", "pending"],
    queryFn: async () => {
      const response = await api.get("/pull-requests");
      return response.data.pullRequests || [];
    },
  });
}

// Hook para buscar os detalhes completos de um PR específico (Diff + PDF Url)
export function usePRDetails(prId: string) {
  return useQuery<PullRequestDetail>({
    queryKey: ["pull-request", prId],
    queryFn: async () => {
      const response = await api.get(`/pull-requests/${prId}`);
      return response.data.pullRequest;
    },
    enabled: Boolean(prId),
  });
}

// Mutação para o Revisor avaliar o PR (Aprovar ou Solicitar Ajustes)
export function useReviewPRMutation(prId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      status?:
        | typeof PRStatus.APPROVED
        | typeof PRStatus.CHANGES_REQUESTED
        | typeof PRStatus.UNDER_REVIEW;
      comment?: string;
      lineNumer?: number;
    }) => {
      const response = await api.post(`/pull-requests/${prId}/review`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pull-request", prId] });
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
    },
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

export interface ClassifiedFileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  category: 'section' | 'bibliography' | 'figure' | 'other';
  label: string;
}

export interface ReviewDiffData {
  pullRequestId: string;
  roundNumber: number;
  overview: {
    baseCommitHash: string;
    targetCommitHash: string;
    classifiedFiles: ClassifiedFileDiff[];
    hasChangesInOtherFiles: boolean;
  };
  roundChanges?: {
    previousSubmittedCommitHash: string;
    currentSubmittedCommitHash: string;
    classifiedFiles: ClassifiedFileDiff[];
    hasChangesInOtherFiles: boolean;
  } | null;
  roundsCount: number;
  rounds?: Array<{
    id: string;
    roundNumber: number;
    baseCommitHash: string;
    submittedCommitHash: string;
    previousSubmittedCommitHash?: string;
    createdAt: string;
  }>;
}

// Hook para buscar a estrutura de diffs da revisão (ReviewDiff)
export function usePRDiffQuery(prId: string) {
  return useQuery<ReviewDiffData>({
    queryKey: ["pull-request-diff", prId],
    queryFn: async () => {
      const response = await api.get(`/pull-requests/${prId}/diff`);
      return response.data;
    },
    enabled: Boolean(prId),
  });
}
