import { Box } from "@mui/material";
import React, { useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { AutoSizer } from "react-virtualized-auto-sizer";
import {
  useAcademicPeriods,
  useManagerDashboardQuery,
} from "../../hooks/useManagementQueries";
import { useProjectsList } from "../../hooks/useProjectQueries";
import { useUsersListQuery } from "../../hooks/useUserQueries";
import type { AcademicPeriod } from "../../types/academic-period.types";
import type { ProjectListItem } from "../../types/project.types";
import { CreateProjectModal } from "../author/modals/CreateProjectModal";
import { AcademicPeriodsSection } from "./components/AcademicPeriodsSection";
import { CreateAcademicPeriodModal } from "./components/CreateAcademicPeriodModal";
import { CreateUserModal } from "./components/CreateUserModal";
import { InstitutionalProjectsSection } from "./components/InstitutionalProjectsSection";
import { ManagerSidebar } from "./components/ManagerSidebar";
import { OverviewSection } from "./components/OverviewSection";

export interface ManagerDashboardContext {
  overview: {
    totalProjects: number;
    publishedProjects: number;
    inReviewProjects: number;
    submittedProjects: number;
    rejectedProjects: number;
  };
  isLoadingDashboard: boolean;
  activePeriod?: AcademicPeriod | null;
  periods: AcademicPeriod[];
  isLoadingPeriods: boolean;
  allProjects: ProjectListItem[];
  isLoadingProjects: boolean;
  totalMembersCount: number;
  onOpenCreatePeriod: () => void;
  onOpenCreateProject: () => void;
  onOpenCreateUser: () => void;
}
export function useManagerContext() {
  return useOutletContext<ManagerDashboardContext>();
}

// Componentes de Visão para as Rotas Filhas (Children Routes)
export const ManagerOverviewView = () => {
  const ctx = useManagerContext();
  return (
    <OverviewSection
      overview={ctx.overview}
      isLoadingDashboard={ctx.isLoadingDashboard}
      activePeriod={ctx.activePeriod}
      totalMembersCount={ctx.totalMembersCount}
    />
  );
};

export const AcademicPeriodsView = () => {
  const ctx = useManagerContext();
  return (
    <AcademicPeriodsSection
      periods={ctx.periods}
      isLoadingPeriods={ctx.isLoadingPeriods}
      onOpenCreatePeriod={ctx.onOpenCreatePeriod}
    />
  );
};

export const InstitutionalProjectsView = () => {
  const ctx = useManagerContext();
  return (
    <InstitutionalProjectsSection
      allProjects={ctx.allProjects}
      isLoadingProjects={ctx.isLoadingProjects}
      onOpenCreateProject={ctx.onOpenCreateProject}
    />
  );
};


export const ManagerDashboardPage = () => {
  const [selectedPeriod] = useState<string>("");

  // Modais de Criação e Gestão CRUD
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const { data: rawPeriods, isLoading: isLoadingPeriods } =
    useAcademicPeriods();
  const { data: rawProjects, isLoading: isLoadingProjects } = useProjectsList();
  const { data: rawUsers } = useUsersListQuery();

  const periods = React.useMemo(
    () => (Array.isArray(rawPeriods) ? rawPeriods : []),
    [rawPeriods],
  );
  const allProjects = React.useMemo(
    () => (Array.isArray(rawProjects) ? rawProjects : []),
    [rawProjects],
  );

  const { data: dashboard, isLoading: isLoadingDashboard } =
    useManagerDashboardQuery({
      academicPeriodId: selectedPeriod || undefined,
    });

  const overview = dashboard?.overview || {
    totalProjects: 0,
    publishedProjects: 0,
    inReviewProjects: 0,
    submittedProjects: 0,
    rejectedProjects: 0,
  };

  const activePeriod = periods.find((p) => p.id === selectedPeriod);

  const totalMembersCount = Array.isArray(rawUsers) ? rawUsers.length : 0;

  const contextValue: ManagerDashboardContext = {
    overview,
    isLoadingDashboard,
    activePeriod,
    periods,
    isLoadingPeriods,
    allProjects,
    isLoadingProjects,
    totalMembersCount,
    onOpenCreatePeriod: () => setIsCreatePeriodOpen(true),
    onOpenCreateProject: () => setIsCreateProjectOpen(true),
    onOpenCreateUser: () => setIsCreateUserOpen(true),
  };

  return (
    <Box sx={{ display: "flex", gap: 3, minHeight: "calc(100vh - 120px)" }}>
      {/* SIDEBAR LATERAL NATIVA DO GERENTE */}
      <AutoSizer
        renderProp={({ height = 600 }) => (
          <ManagerSidebar height={height - 80} width={250} />
        )}
      />

      {/* ÁREA DE CONTEÚDO PRINCIPAL COM ROTA FILHA (OUTLET) */}
      <Box sx={{ flexGrow: 1 }}>
        <Outlet context={contextValue} />
      </Box>

      {/* Modais de Modificação & Gestão */}
      <CreateAcademicPeriodModal
        open={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
      />

      <CreateUserModal
        open={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
      />

      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />

    </Box>
  );
};
