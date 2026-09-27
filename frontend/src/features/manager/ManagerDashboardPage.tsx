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
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
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
  const [activeSection, setActiveSection] = useState<number>(0);

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

  // Colunas DataGrid 3: Gestão de Equipes
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
    <Box sx={{ display: "flex", gap: 3, minHeight: "calc(100vh - 120px)" }}>
      {/* SIDEBAR LATERAL NATIVA DO GERENTE */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          width: 250,
          flexShrink: 0,
          p: 2,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, px: 2, py: 1, letterSpacing: 0.5 }}
        >
          PAINEL DO GERENTE
        </Typography>

        <List component="nav" sx={{ pt: 1 }}>
          <ListItemButton
            selected={activeSection === 0}
            onClick={() => setActiveSection(0)}
            sx={{
              borderRadius: 1.5,
              mb: 1,
              "&.Mui-selected": {
                bgcolor: "warning.soft",
                color: "warning.main",
                fontWeight: 700,
                borderLeft: "4px solid",
                borderColor: "warning.main",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: activeSection === 0 ? "warning.main" : "text.secondary",
              }}
            >
              <AssessmentIcon />
            </ListItemIcon>
            <ListItemText
              primary="Home & Cotas"
              slotProps={{
                primary: {
                  variant: "body2",
                  sx: { fontWeight: activeSection === 0 ? 700 : 500 },
                },
              }}
            />
          </ListItemButton>

          <ListItemButton
            selected={activeSection === 1}
            onClick={() => setActiveSection(1)}
            sx={{
              borderRadius: 1.5,
              mb: 1,
              "&.Mui-selected": {
                bgcolor: "primary.soft",
                color: "primary.main",
                fontWeight: 700,
                borderLeft: "4px solid",
                borderColor: "primary.main",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: activeSection === 1 ? "primary.main" : "text.secondary",
              }}
            >
              <ArticleIcon />
            </ListItemIcon>
            <ListItemText
              primary="Artigos"
              slotProps={{
                primary: {
                  variant: "body2",
                  sx: { fontWeight: activeSection === 1 ? 700 : 500 },
                },
              }}
            />
          </ListItemButton>

          <ListItemButton
            selected={activeSection === 2}
            onClick={() => setActiveSection(2)}
            sx={{
              borderRadius: 1.5,
              mb: 1,
              "&.Mui-selected": {
                bgcolor: "info.soft",
                color: "info.main",
                fontWeight: 700,
                borderLeft: "4px solid",
                borderColor: "info.main",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: activeSection === 2 ? "info.main" : "text.secondary",
              }}
            >
              <GroupsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Gestão de Equipes"
              slotProps={{
                primary: {
                  variant: "body2",
                  sx: { fontWeight: activeSection === 2 ? 700 : 500 },
                },
              }}
            />
          </ListItemButton>
        </List>
      </Paper>

      {/* ÁREA DE CONTEÚDO PRINCIPAL EXIBIDA DE ACORDO COM O ITEM DA SIDEBAR */}
      <Box sx={{ flexGrow: 1 }}>
        {/* SEÇÃO 0: HOME & COTAS (Métricas e Desempenho do Ciclo) */}
        {activeSection === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Cabeçalho da Seção Home */}
            <Box
              sx={{
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Home & Cotas Institucionais
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Acompanhamento de metas do ciclo acadêmico e desempenho dos
                  laboratórios.
                </Typography>
              </Box>

              {/* Ações contextualizadas da Seção Home (Sem botões redundantes) */}
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
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
                  color="secondary"
                  size="small"
                  startIcon={<FlagIcon fontSize="small" />}
                  onClick={() => setIsSetGoalOpen(true)}
                >
                  Definir Cotas
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

            {/* Cards de KPIs da Home */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                    >
                      <ArticleIcon color="primary" />
                      <Typography variant="subtitle2" color="text.secondary">
                        Total de Artigos
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
                        Em Avaliação Gatekeeper
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
                        Laboratórios Ativos
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

            {/* Tabela DataGrid de Desempenho por Equipe e Cotas */}
            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2, bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Desempenho e Cumprimento de Cotas por Laboratório
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de entrega e artigos concluídos por equipe de pesquisa.
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
                    localeText={
                      ptBR.components.MuiDataGrid.defaultProps.localeText
                    }
                    disableRowSelectionOnClick
                    sx={{ border: "none" }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* SEÇÃO 1: ARTIGOS INSTITUCIONAIS */}
        {activeSection === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
              sx={{
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Artigos Científicos Institucionais
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Visão abrangente de todos os artigos em andamento e submetidos.
                </Typography>
              </Box>

              {/* Ação contextualizada da Seção Artigos (Novo Artigo) */}
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon fontSize="small" />}
                onClick={() => setIsCreateProjectOpen(true)}
              >
                Novo Artigo
              </Button>
            </Box>

            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2, bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Listagem Geral de Artigos Institucionais
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Artigos científicos e status de aprovação de governança.
                  </Typography>
                </Box>

                <Box sx={{ height: 480, width: "100%" }}>
                  <DataGrid
                    rows={projectRows}
                    columns={projectColumns}
                    loading={isLoadingProjects}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    localeText={
                      ptBR.components.MuiDataGrid.defaultProps.localeText
                    }
                    disableRowSelectionOnClick
                    sx={{ border: "none" }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* SEÇÃO 2: GESTÃO DE EQUIPES */}
        {activeSection === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
              sx={{
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Gestão de Equipes & Laboratórios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cadastre equipes, vincule pesquisadores e nomeie coordenadores.
                </Typography>
              </Box>

              {/* Ações contextualizadas da Seção Gestão de Equipes */}
              <Box sx={{ display: "flex", gap: 1.5 }}>
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

            {/* Cards de KPIs Dedicados de Equipes */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      TOTAL DE EQUIPES
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 800, color: "primary.main" }}
                    >
                      {totalTeamsCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      PESQUISADORES VINCULADOS
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 800, color: "info.main" }}
                    >
                      {totalMembersCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      COBERTURA DE LIDERANÇA
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 800, color: "warning.main" }}
                    >
                      {teamsWithCoordinatorCount}/{totalTeamsCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      ARTIGOS EM ANDAMENTO
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 800, color: "success.main" }}
                    >
                      {activeProjectsInTeamsCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabela DataGrid de Gestão de Equipes */}
            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2, bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {TEAM_MANAGEMENT_LABELS.TITLE}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {TEAM_MANAGEMENT_LABELS.SUBTITLE}
                  </Typography>
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
                    localeText={
                      ptBR.components.MuiDataGrid.defaultProps.localeText
                    }
                    disableRowSelectionOnClick
                    sx={{ border: "none" }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

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
