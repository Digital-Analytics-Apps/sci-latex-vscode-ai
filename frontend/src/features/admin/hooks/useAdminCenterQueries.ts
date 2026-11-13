import { useQuery } from "@tanstack/react-query";
import { adminCenterApi } from "../api/adminCenterApi";

export const ADMIN_CENTER_KEYS = {
  all: ["admin-center"] as const,
  overview: () => [...ADMIN_CENTER_KEYS.all, "overview"] as const,
  workflow: () => [...ADMIN_CENTER_KEYS.all, "workflow"] as const,
  infrastructure: () => [...ADMIN_CENTER_KEYS.all, "infrastructure"] as const,
  collaboration: () => [...ADMIN_CENTER_KEYS.all, "collaboration"] as const,
  activity: () => [...ADMIN_CENTER_KEYS.all, "activity"] as const,
};

export function useAdminOverview(autoRefresh = true) {
  return useQuery({
    queryKey: ADMIN_CENTER_KEYS.overview(),
    queryFn: adminCenterApi.getOverview,
    refetchInterval: autoRefresh ? 15000 : false,
    staleTime: 10000,
  });
}

export function useAdminWorkflow(autoRefresh = true) {
  return useQuery({
    queryKey: ADMIN_CENTER_KEYS.workflow(),
    queryFn: adminCenterApi.getWorkflow,
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 20000,
  });
}

export function useAdminInfrastructure(autoRefresh = true) {
  return useQuery({
    queryKey: ADMIN_CENTER_KEYS.infrastructure(),
    queryFn: adminCenterApi.getInfrastructure,
    refetchInterval: autoRefresh ? 15000 : false,
    staleTime: 10000,
  });
}

export function useAdminCollaboration(autoRefresh = true) {
  return useQuery({
    queryKey: ADMIN_CENTER_KEYS.collaboration(),
    queryFn: adminCenterApi.getCollaboration,
    refetchInterval: autoRefresh ? 10000 : false,
    staleTime: 8000,
  });
}

export function useAdminActivity(autoRefresh = true) {
  return useQuery({
    queryKey: ADMIN_CENTER_KEYS.activity(),
    queryFn: adminCenterApi.getActivity,
    refetchInterval: autoRefresh ? 20000 : false,
    staleTime: 15000,
  });
}
