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
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
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

      {/* Tabela de Resumo de Produção por Equipe */}
      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Resumo de Produção Científica por Equipe ({selectedPeriod})
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ border: "none" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Equipe</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Coordenador Responsável
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Artigos Concluídos
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Em Andamento</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Taxa de Cumprimento de Prazos
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Inteligência Artificial & ML
                  </TableCell>
                  <TableCell>coordinator@sci-latex.org</TableCell>
                  <TableCell>
                    <Chip label="7 Publicados" size="small" color="success" />
                  </TableCell>
                  <TableCell>3 Artigos</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "success.main" }}>
                    94%
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Engenharia de Software Self-Hosted
                  </TableCell>
                  <TableCell>coord.eng@sci-latex.org</TableCell>
                  <TableCell>
                    <Chip label="5 Publicados" size="small" color="success" />
                  </TableCell>
                  <TableCell>3 Artigos</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "warning.main" }}>
                    86%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};
