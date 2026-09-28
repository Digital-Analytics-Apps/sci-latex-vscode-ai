import { Box } from "@mui/material";
import React, { useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { AutoSizer } from "react-virtualized-auto-sizer";
import {
  useAcademicPeriods,
  useManagerDashboardQuery,
} from "../../hooks/useManagementQueries";
import { useProjectsList } from "../../hooks/useProjectQueries";
import { useTeamsQuery } from "../../hooks/useTeamQueries";
import type { AcademicPeriod } from "../../types/academic-period.types";
import type { ProjectListItem } from "../../types/project.types";
import type { TeamItem } from "../../types/team.types";
import { CreateProjectModal } from "../workspace/CreateProjectModal";
import { AcademicPeriodsSection } from "./components/AcademicPeriodsSection";
import { CreateAcademicPeriodModal } from "./components/CreateAcademicPeriodModal";
import { CreateUserModal } from "./components/CreateUserModal";
import { InstitutionalProjectsSection } from "./components/InstitutionalProjectsSection";
import { ManageTeamModal } from "./components/ManageTeamModal";
import { ManagerSidebar } from "./components/ManagerSidebar";
import { OverviewSection } from "./components/OverviewSection";
import { TeamsManagementSection } from "./components/TeamsManagementSection";

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
  allTeams: TeamItem[];
  isLoadingTeams: boolean;
  totalTeamsCount: number;
  totalMembersCount: number;
  teamsWithCoordinatorCount: number;
  activeProjectsInTeamsCount: number;
  onOpenCreatePeriod: () => void;
  onOpenCreateProject: () => void;
  onOpenCreateTeam: () => void;
  onOpenCreateUser: () => void;
  onManageTeam: (team: TeamItem) => void;
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
      isLoadingTeams={ctx.isLoadingTeams}
      totalTeamsCount={ctx.totalTeamsCount}
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

export const TeamsManagementView = () => {
  const ctx = useManagerContext();
  return (
    <TeamsManagementSection
      allTeams={ctx.allTeams}
      isLoadingTeams={ctx.isLoadingTeams}
      totalTeamsCount={ctx.totalTeamsCount}
      totalMembersCount={ctx.totalMembersCount}
      teamsWithCoordinatorCount={ctx.teamsWithCoordinatorCount}
      activeProjectsInTeamsCount={ctx.activeProjectsInTeamsCount}
      onOpenCreateTeam={ctx.onOpenCreateTeam}
      onOpenCreateUser={ctx.onOpenCreateUser}
      onManageTeam={ctx.onManageTeam}
    />
  );
};

export const ManagerDashboardPage = () => {
  const [selectedPeriod] = useState<string>("");

  // Modais de Criação e Gestão CRUD
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Estado para Modal Unificado de Gestão de Equipes
  const [managingTeam, setManagingTeam] = useState<TeamItem | null>(null);

  const { data: rawPeriods, isLoading: isLoadingPeriods } =
    useAcademicPeriods();
  const { data: rawProjects, isLoading: isLoadingProjects } = useProjectsList();
  const { data: rawTeams, isLoading: isLoadingTeams } = useTeamsQuery();

  const periods = React.useMemo(
    () => (Array.isArray(rawPeriods) ? rawPeriods : []),
    [rawPeriods],
  );
  const allProjects = React.useMemo(
    () => (Array.isArray(rawProjects) ? rawProjects : []),
    [rawProjects],
  );
  const allTeams = React.useMemo(
    () => (Array.isArray(rawTeams) ? rawTeams : []),
    [rawTeams],
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

  // Métricas Calculadas de Gestão de Equipes
  const totalTeamsCount = allTeams.length;
  const totalMembersCount = React.useMemo(
    () => allTeams.reduce((acc, t) => acc + (t._count?.members || 0), 0),
    [allTeams],
  );
  const teamsWithCoordinatorCount = React.useMemo(
    () => allTeams.filter((t) => !!t.coordinator?.email).length,
    [allTeams],
  );
  const activeProjectsInTeamsCount = React.useMemo(
    () => allTeams.reduce((acc, t) => acc + (t._count?.projects || 0), 0),
    [allTeams],
  );

  const contextValue: ManagerDashboardContext = {
    overview,
    isLoadingDashboard,
    activePeriod,
    periods,
    isLoadingPeriods,
    allProjects,
    isLoadingProjects,
    allTeams,
    isLoadingTeams,
    totalTeamsCount,
    totalMembersCount,
    teamsWithCoordinatorCount,
    activeProjectsInTeamsCount,
    onOpenCreatePeriod: () => setIsCreatePeriodOpen(true),
    onOpenCreateProject: () => setIsCreateProjectOpen(true),
    onOpenCreateTeam: () => {
      setManagingTeam(null);
      setIsManageTeamOpen(true);
    },
    onOpenCreateUser: () => setIsCreateUserOpen(true),
    onManageTeam: (team) => {
      setManagingTeam(team);
      setIsManageTeamOpen(true);
    },
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

      {/* Modal Unificado de Gestão de Equipe (Criação & Edição) */}
      <ManageTeamModal
        open={isManageTeamOpen}
        onClose={() => {
          setIsManageTeamOpen(false);
          setManagingTeam(null);
        }}
        team={managingTeam}
      />
    </Box>
  );
};
