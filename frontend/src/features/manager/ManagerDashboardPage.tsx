import AddIcon from "@mui/icons-material/Add";
import ArticleIcon from "@mui/icons-material/Article";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
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
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { TEAM_MANAGEMENT_LABELS } from "../../constants/teams";
import {
  useAcademicPeriods,
  useManagerDashboardQuery,
} from "../../hooks/useManagementQueries";
import { useProjectsList } from "../../hooks/useProjectQueries";
import { useTeamsQuery } from "../../hooks/useTeamQueries";
import { showNotification } from "../../store/slices/notificationSlice";
import type { TeamItem } from "../../types/team.types";
import { CreateProjectModal } from "../workspace/CreateProjectModal";
import { CreateAcademicPeriodModal } from "./components/CreateAcademicPeriodModal";
import { CreateTeamModal } from "./components/CreateTeamModal";
import { CreateUserModal } from "./components/CreateUserModal";
import { ManageTeamModal } from "./components/ManageTeamModal";
import { SetTeamGoalModal } from "./components/SetTeamGoalModal";

export const ManagerDashboardPage = () => {
  const dispatch = useDispatch();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [activeTab, setActiveTab] = useState<number>(0);

  // Modais de Criação e Gestão CRUD
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [isSetGoalOpen, setIsSetGoalOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Estado para Modal Unificado com Abas MUI
  const [managingTeam, setManagingTeam] = useState<TeamItem | null>(null);

  const { data: rawPeriods } = useAcademicPeriods();
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

  // Colunas DataGrid 3: Gestão de Equipes (com Modal de Abas MUI)
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
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === "Sem Coordenador" ? "default" : "warning"}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        ),
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
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<GroupsIcon fontSize="small" />}
            onClick={() => setManagingTeam(params.row.originalTeam)}
          >
            Gerenciar Equipe
          </Button>
        ),
      },
    ],
    [],
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
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Central de Gestão e Governança
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Visão consolidada de produção científica, cotas institucionais e
            equipes de pesquisa.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {/* Seletor de Ciclo Acadêmico */}
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

          {/* Botões de Ação para o Gerente */}
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
            {TEAM_MANAGEMENT_LABELS.NEW_TEAM_BUTTON}
          </Button>

          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<PersonAddIcon fontSize="small" />}
            onClick={() => setIsCreateUserOpen(true)}
          >
            {TEAM_MANAGEMENT_LABELS.NEW_USER_BUTTON}
          </Button>

          <Button
            variant="outlined"
            color="secondary"
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
            color="inherit"
            size="small"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={handleExportReport}
            disabled={!dashboard}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      {/* Cards de KPIs Executivos de Governança Institucional */}
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
                  <CircularProgress size={28} />
                ) : (
                  overview.publishedProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Concluídos e submetidos ao congresso
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
                  Em Avaliação pelos Gatekeepers
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "warning.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} />
                ) : (
                  overview.inReviewProjects + overview.submittedProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Etapas NIT e submissões pendentes
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
                  Laboratórios & Equipes Ativas
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "info.main" }}
              >
                {isLoadingTeams ? (
                  <CircularProgress size={28} />
                ) : (
                  totalTeamsCount
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totalMembersCount} pesquisadores vinculados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navegação entre Visões da Central de Comando (Abas) */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          aria-label="Abas da Central de Comando"
        >
          <Tab
            icon={<AssessmentIcon fontSize="small" />}
            iconPosition="start"
            label="Cotas por Equipe"
          />
          <Tab
            icon={<ArticleIcon fontSize="small" />}
            iconPosition="start"
            label="Artigos Institucionais"
          />
          <Tab
            icon={<GroupsIcon fontSize="small" />}
            iconPosition="start"
            label={`Gestão de Equipes (${totalTeamsCount})`}
          />
        </Tabs>
      </Box>

      {/* CONTEÚDO DA ABA 0: PRODUÇÃO CIENTÍFICA POR EQUIPE & COTAS */}
      {activeTab === 0 && (
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: "background.paper" }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Desempenho e Metas por Laboratório
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Acompanhamento em tempo real da produção científica de cada
                equipe.
              </Typography>
            </Box>

            <Box sx={{ height: 420, width: "100%" }}>
              <DataGrid
                rows={teamRows}
                columns={teamColumns}
                loading={isLoadingDashboard}
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 5 } },
                }}
                localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
                disableRowSelectionOnClick
                sx={{ border: "none" }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* CONTEÚDO DA ABA 1: LISTAGEM GLOBAL DE ARTIGOS INSTITUCIONAIS */}
      {activeTab === 1 && (
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: "background.paper" }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Listagem Geral de Artigos da Instituição
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Todos os artigos científicos cadastrados e seus respectivos
                status de governança.
              </Typography>
            </Box>

            <Box sx={{ height: 420, width: "100%" }}>
              <DataGrid
                rows={projectRows}
                columns={projectColumns}
                loading={isLoadingProjects}
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 5 } },
                }}
                localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
                disableRowSelectionOnClick
                sx={{ border: "none" }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* CONTEÚDO DA ABA 2: GESTÃO COMPLETA DE EQUIPES (CRUD) */}
      {activeTab === 2 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Cards de KPIs Dedicados de Equipes */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    TOTAL DE EQUIPES
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main" }}>
                    {totalTeamsCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    PESQUISADORES VINCULADOS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "info.main" }}>
                    {totalMembersCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    COBERTURA DE LIDERANÇA
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "warning.main" }}>
                    {teamsWithCoordinatorCount}/{totalTeamsCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    ARTIGOS EM ANDAMENTO
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "success.main" }}>
                    {activeProjectsInTeamsCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabela DataGrid de Gestão de Equipes */}
          <Card variant="outlined">
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "background.paper",
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {TEAM_MANAGEMENT_LABELS.TITLE}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {TEAM_MANAGEMENT_LABELS.SUBTITLE}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<GroupsIcon fontSize="small" />}
                    onClick={() => setIsCreateTeamOpen(true)}
                  >
                    {TEAM_MANAGEMENT_LABELS.NEW_TEAM_BUTTON}
                  </Button>
                  <Button
                    variant="outlined"
                    color="info"
                    size="small"
                    startIcon={<PersonAddIcon fontSize="small" />}
                    onClick={() => setIsCreateUserOpen(true)}
                  >
                    {TEAM_MANAGEMENT_LABELS.NEW_USER_BUTTON}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ height: 420, width: "100%" }}>
                <DataGrid
                  rows={teamManagementRows}
                  columns={teamManagementColumns}
                  loading={isLoadingTeams}
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 5 } },
                  }}
                  localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
                  disableRowSelectionOnClick
                  sx={{ border: "none" }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Modais de Modificação & Gestão */}
      <CreateAcademicPeriodModal
        open={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
      />

      <CreateTeamModal
        open={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
      />

      <CreateUserModal
        open={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
      />

      <SetTeamGoalModal
        open={isSetGoalOpen}
        onClose={() => setIsSetGoalOpen(false)}
        defaultPeriodId={selectedPeriod}
      />

      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />

      {/* Modal Unificado com Abas MUI de Gestão de Equipe & Membros */}
      <ManageTeamModal
        open={Boolean(managingTeam)}
        onClose={() => setManagingTeam(null)}
        team={managingTeam}
      />
    </Box>
  );
};
