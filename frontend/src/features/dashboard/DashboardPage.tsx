import AddIcon from "@mui/icons-material/Add";
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
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useProjectsList } from "../../hooks/useProjectQueries";
import { usePendingReviews } from "../../hooks/useReviewQueries";
import type { RootState } from "../../store";
import { CreateProjectModal } from "../workspace/CreateProjectModal";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: projects, isLoading } = useProjectsList();
  const { data: pendingReviews } = usePendingReviews();

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
            Olá, {user?.name || "Pesquisador"} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Seja bem-vindo à Plataforma de Escrita Científica. Seu perfil atual
            é <strong>{user?.role}</strong>.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip
            icon={<ArticleIcon fontSize="small" />}
            label={`Perfil Ativo: ${user?.role}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />

          {(user?.role === "AUTHOR" ||
            user?.role === "COORDINATOR" ||
            user?.role === "ADMIN") && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Novo Artigo Científico
            </Button>
          )}
        </Box>
      </Box>

      {/* Indicador de Carregamento de Projetos */}
      {isLoading && (
        <Box sx={{ width: "100%", mb: 3 }}>
          <LinearProgress color="primary" />
        </Box>
      )}

      {/* Visão Adaptativa para o AUTOR */}
      {user?.role === "AUTHOR" && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Meus Artigos em Escrita ({projects?.length || 0})
              </Typography>
            </Box>

            {projects && projects.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {projects.map((project) => (
                  <Card key={project.id} variant="outlined">
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, color: "primary.main" }}
                        >
                          {project.name}
                        </Typography>
                        <Chip
                          label={project.submissionStatus || "IN_PROGRESS"}
                          size="small"
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1.5 }}
                      >
                        Congresso Alvo:{" "}
                        <strong>
                          {project.targetConferenceName || "Não especificado"}
                        </strong>
                      </Typography>

                      <LinearProgress
                        variant="determinate"
                        value={65}
                        sx={{ height: 6, borderRadius: 3, mb: 2 }}
                      />

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Criado em:{" "}
                          {new Date(project.createdAt).toLocaleDateString()}
                        </Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<LaunchIcon />}
                          onClick={() => navigate(`/workspace/${project.id}`)}
                        >
                          Abrir VS Code Workspace
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                <ArticleIcon
                  sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
                />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Nenhum Artigo Encontrado
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Você ainda não possui artigos científicos cadastrados no seu
                  repositório.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Criar Meu Primeiro Artigo
                </Button>
              </Paper>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
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
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                  Solicitações de Revisão Pendentes (Pull Requests)
                </Typography>
                <Paper variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>PR ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Artigo / Seção
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Autor</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Status NIT
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Ações
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingReviews && pendingReviews.length > 0 ? (
                        pendingReviews.map((pr) => (
                          <TableRow key={pr.id} hover>
                            <TableCell sx={{ fontWeight: 600 }}>
                              #{pr.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {pr.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {pr.section?.title || pr.sectionId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {pr.author?.name || pr.author?.email || "Autor"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={pr.nitStatus}
                                color={
                                  pr.nitStatus === "APPROVED_NIT"
                                    ? "success"
                                    : pr.nitStatus === "REJECTED_NIT"
                                      ? "error"
                                      : "warning"
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                variant="contained"
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/reviews/${pr.id}`)}
                              >
                                Avaliar Diff & PDF
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhum Pull Request pendente para revisão no momento.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
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
            <Card
              variant="outlined"
              sx={{ cursor: "pointer" }}
              onClick={() =>
                navigate(
                  user?.role === "COORDINATOR" ? "/coordinator" : "/manager",
                )
              }
            >
              <CardContent>
                <Box
                  sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ArticleIcon color="primary" />
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Artigos em Andamento
                  </Typography>
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
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Pareceres NIT Concluídos
                  </Typography>
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
            <Card
              variant="outlined"
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/manager")}
            >
              <CardContent>
                <Box
                  sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ScheduleIcon color="warning" />
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Submissões no Alvo
                  </Typography>
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

      {/* Modal de Criação de Novo Projeto / Artigo */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </Box>
  );
};
