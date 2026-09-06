import ArticleIcon from "@mui/icons-material/Article";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import LaunchIcon from "@mui/icons-material/Launch";
import ScheduleIcon from "@mui/icons-material/Schedule";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export const DashboardPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

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
          <Typography variant="h2" component="h1">
            Olá, {user?.name || "Pesquisador"} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Seja bem-vindo à Plataforma de Escrita Científica. Seu perfil atual
            é <strong>{user?.role}</strong>.
          </Typography>
        </Box>
        <Chip
          icon={<ArticleIcon fontSize="small" />}
          label={`Perfil Ativo: ${user?.role}`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {/* Visão Adaptativa para o AUTOR */}
      {user?.role === "AUTHOR" && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h4" sx={{ mb: 2 }}>
                  Meu Artigo em Escrita
                </Typography>
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "background.default",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Metodologia Científica em Redes Neutras
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Congresso Alvo: IEEE International Symposium (Data limite:
                    15/10/2026)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={65}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 2 }}
                >
                  Seção Ativa: Seção 2 - Resultados Experimentais (Prazo: 🟢 No
                  prazo)
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<LaunchIcon />}
                >
                  Abrir VS Code Workspace
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  Próximas Tarefas
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  - Finalizar revisão dos gráficos de desvio padrão
                  <br />- Abrir Pull Request para o Revisor
                </Typography>
                <Chip label="2 dias restantes" color="warning" size="small" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Visão Adaptativa para REVISOR */}
      {user?.role === "REVIEWER" && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h4" sx={{ mb: 2 }}>
                  Solicitações de Revisão Pendentes (Pull Requests)
                </Typography>
                <Paper variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>PR ID</TableCell>
                        <TableCell>Artigo / Seção</TableCell>
                        <TableCell>Autor</TableCell>
                        <TableCell>Status NIT</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>#102</TableCell>
                        <TableCell>
                          Introdução & Trabalhos Relacionados
                        </TableCell>
                        <TableCell>author@sci-latex.org</TableCell>
                        <TableCell>
                          <Chip
                            label="WAITING_NIT"
                            color="warning"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                          >
                            Avaliar Diff & PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Visão Adaptativa para COORDENADOR e GERENTE */}
      {(user?.role === "COORDINATOR" ||
        user?.role === "MANAGER" ||
        user?.role === "ADMIN") && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ArticleIcon color="primary" />
                  <Typography variant="h5">Artigos em Andamento</Typography>
                </Box>
                <Typography
                  variant="h2"
                  color="primary.main"
                  sx={{ fontWeight: 700 }}
                >
                  12
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  8 no prazo 🟢 | 3 atenção 🟡 | 1 atrasado 🔴
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <AssignmentTurnedInIcon color="success" />
                  <Typography variant="h5">Pareceres NIT Concluídos</Typography>
                </Box>
                <Typography
                  variant="h2"
                  color="success.main"
                  sx={{ fontWeight: 700 }}
                >
                  24
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Taxa de aprovação: 92%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ScheduleIcon color="warning" />
                  <Typography variant="h5">Submissões no Alvo</Typography>
                </Box>
                <Typography
                  variant="h2"
                  color="warning.main"
                  sx={{ fontWeight: 700 }}
                >
                  95%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ciclo Acadêmico 2026/2027
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
