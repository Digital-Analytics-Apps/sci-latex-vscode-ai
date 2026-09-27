import AddIcon from "@mui/icons-material/Add";
import ArticleIcon from "@mui/icons-material/Article";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupsIcon from "@mui/icons-material/Groups";
import HomeIcon from "@mui/icons-material/Home";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PublicIcon from "@mui/icons-material/Public";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React, { useState } from "react";
import { TEAM_MANAGEMENT_LABELS } from "../../constants/teams";
import {
  useAcademicPeriods,
  useManagerDashboardQuery,
} from "../../hooks/useManagementQueries";
import { useProjectsList } from "../../hooks/useProjectQueries";
import { useTeamsQuery } from "../../hooks/useTeamQueries";
import type { TeamItem } from "../../types/team.types";
import { CreateProjectModal } from "../workspace/CreateProjectModal";
import { CreateAcademicPeriodModal } from "./components/CreateAcademicPeriodModal";
import { CreateUserModal } from "./components/CreateUserModal";
import { ManageTeamModal } from "./components/ManageTeamModal";

export const ManagerDashboardPage = () => {
  const [selectedPeriod] = useState<string>("");
  const [activeSection, setActiveSection] = useState<number>(0);

  // Modais de Criação e Gestão CRUD
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Estado para Modal Unificado de Gestão de Equipes (Abas: Dados, Integrantes, Cotas)
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
            onClick={() => {
              setManagingTeam(params.row.originalTeam);
              setIsManageTeamOpen(true);
            }}
          >
            Gerenciar Equipe
          </Button>
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
                color: activeSection === 0 ? "primary.main" : "text.secondary",
              }}
            >
              <HomeIcon />
            </ListItemIcon>
            <ListItemText
              primary="Home / Visão Geral"
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
                color: activeSection === 1 ? "warning.main" : "text.secondary",
              }}
            >
              <CalendarTodayIcon />
            </ListItemIcon>
            <ListItemText
              primary="Ciclos Acadêmicos"
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
                bgcolor: "success.soft",
                color: "success.main",
                fontWeight: 700,
                borderLeft: "4px solid",
                borderColor: "success.main",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: activeSection === 2 ? "success.main" : "text.secondary",
              }}
            >
              <ArticleIcon />
            </ListItemIcon>
            <ListItemText
              primary="Artigos"
              slotProps={{
                primary: {
                  variant: "body2",
                  sx: { fontWeight: activeSection === 2 ? 700 : 500 },
                },
              }}
            />
          </ListItemButton>

          <ListItemButton
            selected={activeSection === 3}
            onClick={() => setActiveSection(3)}
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
                color: activeSection === 3 ? "info.main" : "text.secondary",
              }}
            >
              <GroupsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Gestão de Equipes"
              slotProps={{
                primary: {
                  variant: "body2",
                  sx: { fontWeight: activeSection === 3 ? 700 : 500 },
                },
              }}
            />
          </ListItemButton>
        </List>
      </Paper>

      {/* ÁREA DE CONTEÚDO PRINCIPAL DAS SEÇÕES */}
      <Box sx={{ flexGrow: 1 }}>
        {/* SEÇÃO 0: HOME / VISÃO GERAL (APENAS CARDS DE MÉTRICAS - SEM TABELA) */}
        {activeSection === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                Visão Geral Institucional
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Painel consolidado com os principais indicadores de produção e
                governança científica.
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
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
                        : "Meta Consolidada do Período"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
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
                      Concluídos e submetidos com aprovação
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
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
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
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
                      {totalMembersCount} pesquisadores cadastrados
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* SEÇÃO 1: GESTÃO DO CICLO ACADÊMICO */}
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
                  Gestão dos Ciclos Acadêmicos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cadastre novos ciclos e acompanhe as metas institucionais de
                  publicação.
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<CalendarTodayIcon fontSize="small" />}
                onClick={() => setIsCreatePeriodOpen(true)}
              >
                Novo Ciclo Acadêmico
              </Button>
            </Box>

            {/* Listagem de Ciclos Acadêmicos Cadastrados */}
            <Grid container spacing={3}>
              {isLoadingPeriods ? (
                <Box
                  sx={{
                    p: 4,
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <CircularProgress size={32} />
                </Box>
              ) : periods.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 4, textAlign: "center" }} variant="outlined">
                    <Typography variant="body1" color="text.secondary">
                      Nenhum ciclo acadêmico cadastrado até o momento.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                periods.map((p) => (
                  <Grid key={p.id} size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 1.5,
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {p.name}
                          </Typography>
                          <Chip
                            label={p.status || "ATIVO"}
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          Período:{" "}
                          {new Date(p.startDate).toLocaleDateString("pt-BR")}{" "}
                          até {new Date(p.endDate).toLocaleDateString("pt-BR")}
                        </Typography>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: "background.default",
                            borderRadius: 1,
                            display: "flex",
                            justify: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 700 }}
                          >
                            META GLOBAL DE ARTIGOS
                          </Typography>
                          <Typography
                            variant="h6"
                            color="warning.main"
                            sx={{ fontWeight: 800 }}
                          >
                            {p.targetArticlesCount} Artigos Concluídos
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
        )}

        {/* SEÇÃO 2: ARTIGOS INSTITUCIONAIS */}
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
                  Artigos Científicos Institucionais
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Visão abrangente de todos os artigos em andamento e
                  submetidos.
                </Typography>
              </Box>

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

        {/* SEÇÃO 3: GESTÃO DE EQUIPES */}
        {activeSection === 3 && (
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
                  Cadastre equipes, atribua cotas de publicação, vincule
                  pesquisadores e nomeie coordenadores.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  startIcon={<GroupsIcon fontSize="small" />}
                  onClick={() => {
                    setManagingTeam(null);
                    setIsManageTeamOpen(true);
                  }}
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

      <CreateUserModal
        open={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
      />

      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />

      {/* Modal Unificado com Abas MUI de Gestão de Equipe (Criação & Edição) */}
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
