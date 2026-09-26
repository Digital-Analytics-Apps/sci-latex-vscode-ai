import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export interface DashboardSummaryResponse {
  role: string;
  metrics: Record<string, any>;
}

export interface DashboardSummaryFilters {
  projectId?: string;
  academicPeriodId?: string;
  teamId?: string;
}

export function useDashboardSummaryQuery(filters?: DashboardSummaryFilters) {
  return useQuery<DashboardSummaryResponse>({
    queryKey: ["dashboard-summary", filters],
    queryFn: async () => {
      const cleanParams: Record<string, string> = {};
      if (filters?.projectId && filters.projectId !== "all") {
        cleanParams.projectId = filters.projectId;
      }
      if (filters?.academicPeriodId) {
        cleanParams.academicPeriodId = filters.academicPeriodId;
      }
      if (filters?.teamId) {
        cleanParams.teamId = filters.teamId;
      }

      const response = await api.get("/dashboard/summary", {
        params: cleanParams,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}
