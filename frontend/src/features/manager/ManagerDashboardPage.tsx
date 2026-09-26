import ArticleIcon from "@mui/icons-material/Article";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import PublicIcon from "@mui/icons-material/Public";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useManagerMetrics } from "../../hooks/useManagementQueries";
import { showNotification } from "../../store/slices/notificationSlice";

export const ManagerDashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-2027");
  const { data: metrics } = useManagerMetrics(selectedPeriod);

  const mockMetrics = metrics || {
    totalProjects: 18,
    publishedCount: 12,
    onTimeCount: 14,
    warningCount: 3,
    overdueCount: 1,
    targetSuccessRate: 88,
    nitApprovalRate: 96,
  };

  const handleExportReport = () => {
    dispatch(
      showNotification({
        message: `Relatório do Período Acadêmico ${selectedPeriod} gerado e pronto para download!`,
        severity: "success",
      }),
    );
  };

  const teamRows = React.useMemo(
    () => [
      {
        id: "team-1",
        teamName: "Inteligência Artificial & ML",
        coordinatorEmail: "coordinator@sci-latex.org",
        completedCount: 7,
        inProgressCount: 3,
        onTimeRate: 94,
      },
      {
        id: "team-2",
        teamName: "Engenharia de Software Self-Hosted",
        coordinatorEmail: "coord.eng@sci-latex.org",
        completedCount: 5,
        inProgressCount: 3,
        onTimeRate: 86,
      },
    ],
    [],
  );

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "teamName",
        headerName: "Equipe",
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
            label={`${params.value}% No Prazo`}
            size="small"
            color={params.value >= 90 ? "success" : "warning"}
            variant="filled"
            sx={{ fontWeight: 700 }}
          />
        ),
      },
    ],
    [],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
            Dashboard Executivo por Período Acadêmico
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Métricas de produção científica, taxa de aprovação nos congressos
            alvos e consolidação com DOI.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              sx={{ fontWeight: 600 }}
            >
              <MenuItem value="2026-2027">Ciclo Acadêmico 2026/2027</MenuItem>
              <MenuItem value="2025-2026">Ciclo Acadêmico 2025/2026</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={handleExportReport}
          >
            Exportar Relatório
          </Button>
        </Box>
      </Box>

      {/* Cards de Métricas do Período Acadêmico */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
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
                {mockMetrics.totalProjects}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ativos no Período
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
                {mockMetrics.publishedCount}
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
                  Sucesso no Alvo
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "warning.main" }}
              >
                {mockMetrics.targetSuccessRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aceitos na 1ª Opção
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
                  Aprovação no NIT
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "info.main" }}
              >
                {mockMetrics.nitApprovalRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Propriedade Intelectual OK
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Resumo de Produção por Equipe com MUI DataGrid */}
      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Resumo de Produção Científica por Equipe ({selectedPeriod})
            </Typography>
          </Box>
          <Box sx={{ width: "100%", minHeight: 280 }}>
            <DataGrid
              rows={teamRows}
              columns={columns}
              getRowId={(row) => row.id}
              rowHeight={56}
              pageSizeOptions={[5, 10]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 5, page: 0 },
                },
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
                "& .MuiDataGrid-cell": {
                  display: "flex",
                  alignItems: "center",
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
