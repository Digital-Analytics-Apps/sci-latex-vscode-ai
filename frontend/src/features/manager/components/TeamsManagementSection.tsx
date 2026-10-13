import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AutoSizer } from "react-virtualized-auto-sizer";
import {
  createBoldColumn,
  createChipColumn,
} from "../../../components/common/dataGridColumns";
import { Role } from "../../../constants/roles";
import {
  MEMBER_ROLE_COLORS,
  MEMBER_ROLE_LABELS,
  TEAM_MANAGEMENT_LABELS,
} from "../../../constants/teams";
import { useTeamsQuery } from "../../../hooks/useTeamQueries";
import { useUsersListQuery } from "../../../hooks/useUserQueries";
import type { TeamItem } from "../../../types/team.types";
import type { UserMemberItem } from "../../../types/user.types";

interface TeamsManagementSectionProps {
  allTeams: TeamItem[];
  isLoadingTeams: boolean;
  totalTeamsCount: number;
  totalMembersCount: number;
  teamsWithCoordinatorCount: number;
  activeProjectsInTeamsCount: number;
  onOpenCreateTeam: () => void;
  onOpenCreateUser: () => void;
  onManageTeam: (team: TeamItem) => void;
}

export const TeamsManagementSection = ({
  allTeams,
  isLoadingTeams,
  totalTeamsCount,
  totalMembersCount,
  teamsWithCoordinatorCount,
  activeProjectsInTeamsCount,
  onOpenCreateTeam,
  onOpenCreateUser,
  onManageTeam,
}: TeamsManagementSectionProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab ativa sincronizada com URL ("teams" ou "members")
  const activeTab = searchParams.get("tab") === "members" ? "members" : "teams";

  // Filtros sincronizados com a URL
  const searchQuery = searchParams.get("search") || "";
  const roleFilter = searchParams.get("role") || "ALL";
  const teamIdFilter = searchParams.get("teamId") || "ALL";

  // Buscar equipes filtradas quando no modo de busca por equipes
  const { data: filteredTeams, isLoading: isLoadingFilteredTeams } =
    useTeamsQuery(activeTab === "teams" ? searchQuery : "");

  // Buscar membros/usuários filtrados por busca, papel e equipe
  const { data: membersList, isLoading: isLoadingMembers } = useUsersListQuery({
    search: searchQuery,
    role: roleFilter,
    teamId: teamIdFilter,
  });

  // Handlers de sincronização com a URL
  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", newValue);
    setSearchParams(newParams);
  };

  const handleSearchChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      newParams.set("search", value);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams);
  };

  const handleRoleChange = (role: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (role && role !== "ALL") {
      newParams.set("role", role);
    } else {
      newParams.delete("role");
    }
    setSearchParams(newParams);
  };

  const handleTeamFilterChange = (teamId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (teamId && teamId !== "ALL") {
      newParams.set("teamId", teamId);
    } else {
      newParams.delete("teamId");
    }
    setSearchParams(newParams);
  };

  // Linhas para DataGrid Tab 1: Equipes
  const teamManagementRows = useMemo(() => {
    const teamsData = filteredTeams || allTeams || [];
    return teamsData.map((t) => ({
      id: t.id,
      name: t.name,
      coordinatorEmail: t.coordinator?.email || "Sem Coordenador",
      projectCount: t._count?.projects ?? 0,
      memberCount: t._count?.members ?? 0,
      originalTeam: t,
    }));
  }, [filteredTeams, allTeams]);

  // Colunas DataGrid Tab 1: Equipes
  const teamManagementColumns = useMemo<GridColDef[]>(
    () => [
      createBoldColumn({
        field: "name",
        headerName: "Nome da Equipe / Laboratório",
        flex: 1.5,
        minWidth: 220,
      }),
      createChipColumn(
        {
          field: "coordinatorEmail",
          headerName: "Coordenador Atribuído",
          flex: 1.5,
          minWidth: 200,
        },
        (params) => ({
          label: String(params.value || ""),
          color: params.value === "Sem Coordenador" ? "default" : "warning",
          variant: "outlined",
        }),
      ),
      createChipColumn(
        {
          field: "projectCount",
          headerName: "Projetos Ativos",
          flex: 1,
          minWidth: 130,
        },
        (params) => ({
          label: `${params.value} Artigos`,
          color: "primary",
        }),
      ),
      createChipColumn(
        {
          field: "memberCount",
          headerName: "Pesquisadores",
          flex: 1,
          minWidth: 130,
        },
        (params) => ({
          label: `${params.value} Membros`,
          color: "info",
        }),
      ),
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
            onClick={() => onManageTeam(params.row.originalTeam)}
          >
            Gerenciar Equipe
          </Button>
        ),
      },
    ],
    [onManageTeam],
  );

  // Linhas para DataGrid Tab 2: Membros & Pesquisadores
  const memberManagementRows = useMemo(() => {
    if (!membersList) return [];
    return membersList.map((m: UserMemberItem) => {
      const teamsText =
        m.teams && m.teams.length > 0
          ? m.teams.map((t) => t.name).join(", ")
          : "Sem Equipe";
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        teamsText,
        authoredProjectsCount: m.authoredProjectsCount ?? 0,
        originalUser: m,
      };
    });
  }, [membersList]);

  // Colunas DataGrid Tab 2: Membros & Pesquisadores
  const memberManagementColumns = useMemo<GridColDef[]>(
    () => [
      createBoldColumn({
        field: "name",
        headerName: "Pesquisador / Integrante",
        flex: 1.5,
        minWidth: 200,
      }),
      {
        field: "email",
        headerName: "E-mail Institucional",
        flex: 1.5,
        minWidth: 200,
      },
      createChipColumn(
        {
          field: "role",
          headerName: "Perfil no Sistema",
          flex: 1.2,
          minWidth: 160,
        },
        (params) => {
          const roleKey = String(
            params.value || "",
          ) as keyof typeof MEMBER_ROLE_LABELS;
          const label = MEMBER_ROLE_LABELS[roleKey] || String(params.value);
          const color = MEMBER_ROLE_COLORS[roleKey] || "default";
          return {
            label,
            color: color as any,
            variant: "outlined",
          };
        },
      ),
      createChipColumn(
        {
          field: "teamsText",
          headerName: "Equipe / Laboratório",
          flex: 1.5,
          minWidth: 180,
        },
        (params) => ({
          label: String(params.value),
          color: params.value === "Sem Equipe" ? "default" : "primary",
          variant: "outlined",
        }),
      ),
      createChipColumn(
        {
          field: "authoredProjectsCount",
          headerName: "Artigos Autoria",
          flex: 1,
          minWidth: 130,
        },
        (params) => ({
          label: `${params.value} Artigos`,
          color: "info",
        }),
      ),
    ],
    [],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
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
            Cadastre equipes, atribua cotas de publicação, vincule pesquisadores
            e nomeie coordenadores.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<GroupsIcon fontSize="small" />}
            onClick={onOpenCreateTeam}
          >
            {TEAM_MANAGEMENT_LABELS.NEW_TEAM_BUTTON}
          </Button>

          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<PersonAddIcon fontSize="small" />}
            onClick={onOpenCreateUser}
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

      {/* Painel Principal com Abas e DataGrid responsivo envolto por AutoSizer */}
      <Card variant="outlined">
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 2,
            pt: 1,
            bgcolor: "background.paper",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="Abas de Gestão de Equipes e Membros"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              value="teams"
              label="Equipes & Laboratórios"
              icon={<GroupsIcon fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              value="members"
              label="Membros & Pesquisadores"
              icon={<PersonIcon fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Barra de Filtros para Equipes */}
        {activeTab === "teams" && (
          <Box
            sx={{
              p: 2,
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
              bgcolor: "background.paper",
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar equipe por nome ou coordenador..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              sx={{ minWidth: 280, flexGrow: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        )}

        {/* Barra de Filtros Avançados para Membros */}
        {activeTab === "members" && (
          <Box
            sx={{
              p: 2,
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
              bgcolor: "background.paper",
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar por nome ou e-mail..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              sx={{ minWidth: 240, flexGrow: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="role-filter-label">Perfil no Sistema</InputLabel>
              <Select
                labelId="role-filter-label"
                value={roleFilter}
                label="Perfil no Sistema"
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <MenuItem value="ALL">Todos os Perfis</MenuItem>
                <MenuItem value={Role.AUTHOR}>
                  Pesquisador / Integrante
                </MenuItem>
                <MenuItem value={Role.COORDINATOR}>Coordenador</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="team-filter-label">
                Laboratório / Equipe
              </InputLabel>
              <Select
                labelId="team-filter-label"
                value={teamIdFilter}
                label="Laboratório / Equipe"
                onChange={(e) => handleTeamFilterChange(e.target.value)}
              >
                <MenuItem value="ALL">Todas as Equipes</MenuItem>
                {allTeams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <CardContent sx={{ p: 0 }}>
          <Box sx={{ width: "100%" }}>
            <AutoSizer
              renderProp={({ height, width }) => (
                <Box style={{ height, width }}>
                  {activeTab === "teams" ? (
                    <DataGrid
                      rows={teamManagementRows}
                      columns={teamManagementColumns}
                      loading={isLoadingTeams || isLoadingFilteredTeams}
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
                  ) : (
                    <DataGrid
                      rows={memberManagementRows}
                      columns={memberManagementColumns}
                      loading={isLoadingMembers}
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
                  )}
                </Box>
              )}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
