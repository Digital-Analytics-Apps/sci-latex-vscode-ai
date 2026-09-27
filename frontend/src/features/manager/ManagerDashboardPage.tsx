import AddIcon from "@mui/icons-material/Add";
import ArticleIcon from "@mui/icons-material/Article";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import FlagIcon from "@mui/icons-material/Flag";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PublicIcon from "@mui/icons-material/Public";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  useAcademicPeriods,
  useManagerDashboardQuery,
} from "../../hooks/useManagementQueries";
import { useProjectsList } from "../../hooks/useProjectQueries";
import {
  useDeleteTeamMutation,
  useTeamsQuery,
} from "../../hooks/useTeamQueries";
import { showNotification } from "../../store/slices/notificationSlice";
import type { TeamItem } from "../../types/team.types";
import { CreateProjectModal } from "../workspace/CreateProjectModal";
import { CreateAcademicPeriodModal } from "./components/CreateAcademicPeriodModal";
import { CreateTeamModal } from "./components/CreateTeamModal";
import { EditTeamModal } from "./components/EditTeamModal";
import { SetTeamGoalModal } from "./components/SetTeamGoalModal";
import { TeamMembersDrawer } from "./components/TeamMembersDrawer";

export const ManagerDashboardPage = () => {
  const dispatch = useDispatch();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [activeTab, setActiveTab] = useState<number>(0);

  // Modais e Drawers de Criação e Gestão CRUD
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [isSetGoalOpen, setIsSetGoalOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Estado para Edição de Equipe e Gestão de Membros
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);
  const [membersTeam, setMembersTeam] = useState<TeamItem | null>(null);

  const deleteTeamMutation = useDeleteTeamMutation();

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

  const handleDeleteTeam = React.useCallback(
    async (teamId: string, teamName: string) => {
      if (
        !window.confirm(
          `Tem certeza que deseja excluir a equipe "${teamName}"?`,
        )
      ) {
        return;
      }
      try {
        await deleteTeamMutation.mutateAsync(teamId);
        dispatch(
          showNotification({
            message: `Equipe "${teamName}" excluída com sucesso.`,
            severity: "success",
          }),
        );
      } catch {
        dispatch(
          showNotification({
            message: `Erro ao excluir a equipe "${teamName}".`,
            severity: "error",
          }),
        );
      }
    },
    [deleteTeamMutation, dispatch],
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

  const deadlines = dashboard?.deadlines || {
    onTimeCount: 0,
    warningSoonCount: 0,
    overdueCount: 0,
  };

  const activePeriod = periods.find((p) => p.id === selectedPeriod);

  const handleExportReport = () => {
    if (!dashboard) return;

    const csvContent = [
      "Equipe,Coordenador,Total de Artigos,Publicados,Em Andamento",
      ...dashboard.teams.map(
        (t) =>
          `"${t.teamName}","${t.coordinator?.email || "Sem Coordenador"}",${t.totalProjects},${t.publishedCount},${t.totalProjects - t.publishedCount}`,
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `relatorio_gerencial_${activePeriod?.name || selectedPeriod || "consolidado"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    dispatch(
      showNotification({
        message: `Relatório do Período Acadêmico exportado com sucesso!`,
        severity: "success",
      }),
    );
  };

  const dashboardTeams = dashboard?.teams;

  // Linhas para DataGrid 1: Produção Científica por Equipe
  const teamRows = React.useMemo(() => {
    if (!dashboardTeams) return [];
    return dashboardTeams.map((team) => {
      const inProgress = team.totalProjects - team.publishedCount;
      const onTimeRate =
        team.totalProjects > 0
          ? Math.round((team.publishedCount / team.totalProjects) * 100)
          : 0;

      return {
        id: team.teamId,
        teamName: team.teamName,
        coordinatorEmail: team.coordinator?.email || "Não atribuído",
        completedCount: team.publishedCount,
        inProgressCount: Math.max(inProgress, 0),
        totalProjects: team.totalProjects,
        onTimeRate,
      };
    });
  }, [dashboardTeams]);

  // Linhas para DataGrid 2: Listagem Global de Artigos Institucionais
  const projectRows = React.useMemo(() => {
    if (!allProjects) return [];
    return allProjects.map((p) => ({
      id: p.id,
      name: p.name,
      teamName: p.team?.name || "Sem Equipe",
      submissionStatus: p.submissionStatus || "DRAFT",
      targetConference: p.targetConferenceName || "Não definida",
      targetDate: p.targetConferenceDate
        ? new Date(p.targetConferenceDate).toLocaleDateString("pt-BR")
        : "Sem prazo",
    }));
  }, [allProjects]);

  // Linhas para DataGrid 3: Gestão de Equipes / Laboratórios
  const teamManagementRows = React.useMemo(() => {
    if (!allTeams) return [];
    return allTeams.map((t) => ({
      id: t.id,
      name: t.name,
      coordinatorEmail: t.coordinator?.email || "Sem Coordenador",
      projectCount: t._count?.projects ?? 0,
      memberCount: t._count?.members ?? 0,
      originalTeam: t,
    }));
  }, [allTeams]);

  // Colunas DataGrid 3: Gestão de Equipes (com CRUD)
  const teamManagementColumns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "name",
        headerName: "Nome da Equipe / Laboratório",
        flex: 1.5,
        minWidth: 220,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: "coordinatorEmail",
        headerName: "Coordenador Atribuído",
        flex: 1.5,
        minWidth: 200,
      },
      {
        field: "projectCount",
        headerName: "Projetos Ativos",
        flex: 1,
        minWidth: 130,
        renderCell: (params) => (
          <Chip
            label={`${params.value} Artigos`}
            size="small"
            color="primary"
          />
        ),
      },
      {
        field: "memberCount",
        headerName: "Pesquisadores",
        flex: 1,
        minWidth: 130,
        renderCell: (params) => (
          <Chip label={`${params.value} Membros`} size="small" color="info" />
        ),
      },
      {
        field: "actions",
        headerName: "Ações Gerenciais",
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        flex: 1.5,
        minWidth: 180,
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Gerenciar Membros da Equipe">
              <IconButton
                size="small"
                color="info"
                onClick={() => setMembersTeam(params.row.originalTeam)}
              >
                <PersonAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Editar Equipe">
              <IconButton
                size="small"
                color="warning"
                onClick={() => setEditingTeam(params.row.originalTeam)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Excluir Equipe">
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  handleDeleteTeam(params.row.id, params.row.name)
                }
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleDeleteTeam],
  );

  // Colunas DataGrid 1: Equipes & Cotas
  const teamColumns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "teamName",
        headerName: "Equipe / Laboratório",
        flex: 1.5,
        minWidth: 220,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: "coordinatorEmail",
        headerName: "Coordenador Responsável",
        flex: 1.5,
        minWidth: 200,
      },
      {
        field: "completedCount",
        headerName: "Artigos Concluídos",
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <Chip
            label={`${params.value} Publicados`}
            size="small"
            color="success"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        ),
      },
      {
        field: "inProgressCount",
        headerName: "Em Andamento",
        flex: 1,
        minWidth: 140,
        renderCell: (params) => (
          <Chip
            label={`${params.value} Em Andamento`}
            size="small"
            color="info"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        ),
      },
      {
        field: "onTimeRate",
        headerName: "Taxa de Cumprimento de Prazos",
        flex: 1.3,
        minWidth: 200,
        renderCell: (params) => (
          <Chip
            label={`${params.value}% Concluídos`}
            size="small"
            color={params.value >= 70 ? "success" : "warning"}
            variant="filled"
            sx={{ fontWeight: 700 }}
          />
        ),
      },
    ],
    [],
  );

  // Colunas DataGrid 2: Artigos Institucionais
  const projectColumns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "name",
        headerName: "Título do Artigo Científico",
        flex: 1.8,
        minWidth: 260,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: "teamName",
        headerName: "Equipe",
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: "targetConference",
        headerName: "Congresso Alvo",
        flex: 1.2,
        minWidth: 160,
      },
      {
        field: "submissionStatus",
        headerName: "Status de Governança",
        flex: 1.3,
        minWidth: 180,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            color={
              params.value === "COMPLETED_PUBLISHED"
                ? "success"
                : params.value.includes("SUBMITTED")
                  ? "info"
                  : "warning"
            }
            sx={{ fontWeight: 600 }}
          />
        ),
      },
      {
        field: "targetDate",
        headerName: "Data Limite Alvo",
        flex: 1,
        minWidth: 140,
      },
    ],
    [],
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Principal do Gerente com Ações Rápidas */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
            Centro de Comando & Governança Acadêmica
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão de Ciclos Acadêmicos, alocação de cotas, equipes de pesquisa
            e monitoramento de artigos.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={selectedPeriod}
              displayEmpty
              onChange={(e) => setSelectedPeriod(e.target.value)}
              sx={{ fontWeight: 600 }}
            >
              <MenuItem value="">Todos os Ciclos</MenuItem>
              {periods?.map((period) => (
                <MenuItem key={period.id} value={period.id}>
                  {period.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Botões de Ação de Criação para o Gerente */}
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<CalendarTodayIcon fontSize="small" />}
            onClick={() => setIsCreatePeriodOpen(true)}
          >
            Novo Ciclo
          </Button>

          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<GroupsIcon fontSize="small" />}
            onClick={() => setIsCreateTeamOpen(true)}
          >
            Nova Equipe
          </Button>

          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<FlagIcon fontSize="small" />}
            onClick={() => setIsSetGoalOpen(true)}
          >
            Definir Cotas
          </Button>

          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setIsCreateProjectOpen(true)}
          >
            Novo Artigo
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            size="small"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={handleExportReport}
            disabled={!dashboard}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      {/* Cards de KPIs Executivos */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <ArticleIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Total de Artigos Institucionais
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "primary.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} />
                ) : (
                  overview.totalProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activePeriod
                  ? `Meta Global: ${activePeriod.targetArticlesCount} artigos`
                  : "Todos os Períodos"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <PublicIcon color="success" />
                <Typography variant="subtitle2" color="text.secondary">
                  Publicados com DOI
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "success.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} color="success" />
                ) : (
                  overview.publishedProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Finalizados & Registrados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <AssessmentIcon color="warning" />
                <Typography variant="subtitle2" color="text.secondary">
                  Em Revisão / Submetidos
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "warning.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} color="warning" />
                ) : (
                  overview.inReviewProjects + overview.submittedProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {overview.submittedProjects} Submetidos /{" "}
                {overview.inReviewProjects} Em Revisão
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <CheckCircleIcon color="info" />
                <Typography variant="subtitle2" color="text.secondary">
                  Indicadores de Prazo
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "info.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} color="info" />
                ) : (
                  deadlines.onTimeCount
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {deadlines.onTimeCount} No Prazo / {deadlines.warningSoonCount}{" "}
                Atenção / {deadlines.overdueCount} Atrasados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navegação por Abas (Tabs): Cotas por Equipe | Todos os Artigos | Gestão de Equipes */}
      <Card variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ px: 2 }}
          >
            <Tab
              label="Produção Científica & Cotas das Equipes"
              sx={{ fontWeight: 700 }}
            />
            <Tab
              label={`Listagem Global de Artigos (${allProjects?.length || 0})`}
              sx={{ fontWeight: 700 }}
            />
            <Tab
              label={`Gestão de Equipes (${allTeams?.length || 0})`}
              sx={{ fontWeight: 700 }}
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* Aba 0: Produção Científica & Cotas */}
          {activeTab === 0 && (
            <Box sx={{ width: "100%", minHeight: 320 }}>
              {isLoadingDashboard || isLoadingPeriods ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={teamRows}
                  columns={teamColumns}
                  getRowId={(row) => row.id}
                  rowHeight={56}
                  pageSizeOptions={[5, 10]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 5, page: 0 } },
                  }}
                  disableRowSelectionOnClick
                  localeText={
                    ptBR?.components?.MuiDataGrid?.defaultProps?.localeText
                  }
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor: "action.hover",
                      fontWeight: 700,
                    },
                  }}
                />
              )}
            </Box>
          )}

          {/* Aba 1: Listagem Global de Artigos da Instituição */}
          {activeTab === 1 && (
            <Box sx={{ width: "100%", minHeight: 320 }}>
              {isLoadingProjects ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={projectRows}
                  columns={projectColumns}
                  getRowId={(row) => row.id}
                  rowHeight={56}
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10, page: 0 } },
                  }}
                  disableRowSelectionOnClick
                  localeText={
                    ptBR?.components?.MuiDataGrid?.defaultProps?.localeText
                  }
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor: "action.hover",
                      fontWeight: 700,
                    },
                  }}
                />
              )}
            </Box>
          )}

          {/* Aba 2: Gestão de Equipes e Laboratórios */}
          {activeTab === 2 && (
            <Box sx={{ width: "100%", minHeight: 320 }}>
              {isLoadingTeams ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={teamManagementRows}
                  columns={teamManagementColumns}
                  getRowId={(row) => row.id}
                  rowHeight={56}
                  pageSizeOptions={[5, 10]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 5, page: 0 } },
                  }}
                  disableRowSelectionOnClick
                  localeText={
                    ptBR?.components?.MuiDataGrid?.defaultProps?.localeText
                  }
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor: "action.hover",
                      fontWeight: 700,
                    },
                  }}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Modais Globais de Gestão do Gerente */}
      <CreateAcademicPeriodModal
        open={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
      />

      <SetTeamGoalModal
        open={isSetGoalOpen}
        onClose={() => setIsSetGoalOpen(false)}
        defaultPeriodId={selectedPeriod}
      />

      <CreateTeamModal
        open={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
      />

      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />

      <EditTeamModal
        open={Boolean(editingTeam)}
        onClose={() => setEditingTeam(null)}
        team={editingTeam}
      />

      <TeamMembersDrawer
        open={Boolean(membersTeam)}
        onClose={() => setMembersTeam(null)}
        team={membersTeam}
      />
    </Box>
  );
};
