import GroupsIcon from "@mui/icons-material/Groups";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React from "react";
import {
  createBoldColumn,
  createChipColumn,
} from "../../../components/common/dataGridColumns";
import { TEAM_MANAGEMENT_LABELS } from "../../../constants/teams";
import type { TeamItem } from "../../../types/team.types";

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
              localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
              disableRowSelectionOnClick
              sx={{ border: "none" }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
