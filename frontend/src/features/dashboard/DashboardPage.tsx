import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArticleIcon from "@mui/icons-material/Article";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import LaunchIcon from "@mui/icons-material/Launch";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  Avatar,
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
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useProjectDetails,
  useProjectsList,
} from "../../hooks/useProjectQueries";
import { usePendingReviews } from "../../hooks/useReviewQueries";
import { useTasksQuery } from "../../hooks/useTaskQueries";
import type { RootState } from "../../store";
import {
  clearSelectedArticle,
  selectArticle,
} from "../../store/slices/articleSlice";
import { AddMemberModal } from "../workspace/AddMemberModal";
import { CreateProjectModal } from "../workspace/CreateProjectModal";
import { CreateTaskModal } from "../workspace/CreateTaskModal";
import { ReleaseCandidatesModal } from "../workspace/ReleaseCandidatesModal";

import { useUserArticlesQuery } from "../../hooks/useArticleQueries";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);
  const selectedArticleId = useSelector(
    (state: RootState) => state.article.selectedArticleId,
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const urlArticleId = searchParams.get("articleId");
  const effectiveSelectedArticleId = urlArticleId || selectedArticleId;

  // Sincroniza o parâmetro HTTP (URL query ?articleId=...) com o Redux ao carregar/recarregar a página (F5)
  useEffect(() => {
    if (urlArticleId && urlArticleId !== selectedArticleId) {
      dispatch(selectArticle(urlArticleId));
    }
  }, [urlArticleId, selectedArticleId, dispatch]);

  const handleSelectArticle = (id: string) => {
    setSearchParams({ articleId: id });
    dispatch(selectArticle(id));
  };

  const handleClearArticle = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("articleId");
    setSearchParams(newParams);
    dispatch(clearSelectedArticle());
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isRCModalOpen, setIsRCModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const { data: projects, isLoading } = useProjectsList();
  const { data: articles = [] } = useUserArticlesQuery();
  const { data: pendingReviews } = usePendingReviews();

  const activeProjectId = effectiveSelectedArticleId
    ? effectiveSelectedArticleId === "art-2"
      ? "demo-project-2"
      : effectiveSelectedArticleId === "art-3"
        ? "demo-project-3"
        : effectiveSelectedArticleId
    : projects?.[0]?.id || "";

  const { data: currentProjectDetails } = useProjectDetails(activeProjectId);

  const selectedArticleFromList = articles.find(
    (a) => a.id === effectiveSelectedArticleId,
  );
  const selectedArticle =
    selectedArticleFromList ||
    (effectiveSelectedArticleId && currentProjectDetails
      ? {
          id: currentProjectDetails.id,
          projectId: currentProjectDetails.id,
          title: currentProjectDetails.name,
          conference:
            (currentProjectDetails as any).targetConferenceName ||
            "Conferência TeX",
          repo:
            currentProjectDetails.gitRepoPath ||
            `github.com/org/${currentProjectDetails.id.slice(0, 8)}`,
          role: (currentProjectDetails.members?.[0]?.role === "REVIEWER"
            ? "Revisor de Par"
            : currentProjectDetails.members?.[0]?.role === "CO_AUTHOR"
              ? "Co-Autor"
              : "Autor Principal") as
            "Autor Principal" | "Co-Autor" | "Revisor de Par",
          status:
            (currentProjectDetails as any).submissionStatus ||
            "RC-1 em Andamento",
          progress: 0,
          tasks: [],
          members: currentProjectDetails.members || [],
        }
      : null);

  const currentMembers =
    currentProjectDetails?.members || selectedArticle?.members || [];

  const { data: fetchedTasks = [] } = useTasksQuery(activeProjectId);

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

      {/* Visão Adaptativa para o AUTOR (Navegação Despoluída em 2 Níveis - ADR-003) */}
      {user?.role === "AUTHOR" && (
        <Box>
          {!selectedArticle ? (
            /* NIVEL 1: LISTA LIMPA DOS ARTIGOS DO AUTOR */
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Meus Artigos Científicos ({articles.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione um artigo para gerenciar suas tarefas e acessar o
                  workspace de desenvolvimento.
                </Typography>
              </Box>

              <Grid container spacing={3}>
                {articles.map((article) => (
                  <Grid key={article.id} size={{ xs: 12, md: 6, lg: 4 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxShadow: 1,
                        borderRadius: 2,
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 4,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1.5,
                          }}
                        >
                          <Chip
                            label={article.role}
                            color={
                              article.role === "Autor Principal"
                                ? "primary"
                                : article.role === "Co-Autor"
                                  ? "secondary"
                                  : "default"
                            }
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                          <Chip
                            label={article.status}
                            variant="outlined"
                            color={
                              article.status.includes("Aprovado") ||
                              article.status.includes("Publicado")
                                ? "success"
                                : "info"
                            }
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>

                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            mb: 1,
                            color: "text.primary",
                            lineHeight: 1.3,
                          }}
                        >
                          {article.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {article.conference}
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Progresso da Escrita
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700 }}
                            >
                              {article.progress}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={article.progress}
                            color={
                              article.role === "Autor Principal"
                                ? "primary"
                                : "secondary"
                            }
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </Box>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          📋{" "}
                          <strong>
                            {article.tasks.length} Tarefa(s) Ativa(s)
                          </strong>
                        </Typography>
                      </CardContent>

                      <Box sx={{ p: 2, pt: 0 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          size="small"
                          endIcon={<ArrowForwardIcon />}
                          onClick={() => handleSelectArticle(article.id)}
                        >
                          Ver Tarefas do Artigo
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            /* NIVEL 2: TELA INTERNA DO ARTIGO SELECIONADO & SUAS TAREFAS */
            <Box>
              <Button
                variant="text"
                color="primary"
                startIcon={<ArrowBackIcon />}
                onClick={() => handleClearArticle()}
                sx={{ mb: 2, fontWeight: 700 }}
              >
                Voltar para Meus Artigos
              </Button>

              <Card
                variant="outlined"
                sx={{ mb: 3, boxShadow: 1, borderRadius: 2 }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <ArticleIcon color="primary" fontSize="medium" />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {selectedArticle?.title || "Artigo Selecionado"}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        component="div"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        Conferência-Alvo:{" "}
                        <strong>
                          {selectedArticle?.conference || "IEEE Transactions"}
                        </strong>{" "}
                        | Papel:{" "}
                        <Chip
                          label={selectedArticle?.role || "Autor Principal"}
                          size="small"
                          color="primary"
                          sx={{ ml: 0.5, fontWeight: 700 }}
                        />
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Repositório Git:{" "}
                        <code>
                          {selectedArticle?.repo || "github.com/org/latex-repo"}
                        </code>{" "}
                        | Branch Base: <code>dev</code>
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setIsCreateTaskOpen(true)}
                      >
                        + Nova Tarefa
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        startIcon={<ArticleIcon />}
                        onClick={() => setIsRCModalOpen(true)}
                      >
                        Release Candidates
                      </Button>
                    </Box>
                  </Box>

                  {/* SEÇÃO DE MEMBROS PERTENCENTES AO ARTIGO */}
                  <Box
                    sx={{
                      mt: 2,
                      pt: 1.5,
                      borderTop: "1px dashed rgba(255, 255, 255, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: "text.secondary",
                          mr: 0.5,
                        }}
                      >
                        👥 Membros do Artigo ({currentMembers.length}):
                      </Typography>
                      {currentMembers.length > 0 ? (
                        currentMembers.map((m: any) => {
                          const u = m.user || { name: "Membro", email: "" };
                          const roleColor =
                            m.role === "REVIEWER"
                              ? "secondary"
                              : m.role === "CO_AUTHOR"
                                ? "info"
                                : "primary";
                          const roleLabel =
                            m.role === "REVIEWER"
                              ? "Revisor"
                              : m.role === "CO_AUTHOR"
                                ? "Co-Autor"
                                : "Autor";
                          return (
                            <Chip
                              key={m.id || m.userId}
                              avatar={
                                <Avatar
                                  sx={{ width: 22, height: 22, fontSize: 11 }}
                                >
                                  {u.name?.[0] || "U"}
                                </Avatar>
                              }
                              label={`${u.name} (${roleLabel})`}
                              size="small"
                              variant="outlined"
                              color={roleColor}
                              sx={{ fontWeight: 600, fontSize: 12 }}
                            />
                          );
                        })
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Nenhum membro adicional associado.
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<PersonAddIcon fontSize="small" />}
                      onClick={() => setIsAddMemberOpen(true)}
                      sx={{
                        fontWeight: 700,
                        textTransform: "none",
                        fontSize: 13,
                      }}
                    >
                      + Adicionar Membro
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* LISTA LIMPA DE TAREFAS DO ARTIGO SELECIONADO */}
              {(() => {
                const activeTasksList =
                  fetchedTasks.length > 0
                    ? fetchedTasks
                    : selectedArticle?.tasks || [];
                return (
                  <>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      Tarefas do Artigo ({activeTasksList.length})
                    </Typography>

                    <Grid container spacing={2}>
                      {activeTasksList.map((task) => (
                        <Grid key={task.id} size={{ xs: 12, md: 6 }}>
                          <Card
                            variant="outlined"
                            sx={{ boxShadow: 1, borderRadius: 2 }}
                          >
                            <CardContent sx={{ p: 2.5 }}>
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
                                  sx={{
                                    fontWeight: 700,
                                    color: "primary.main",
                                  }}
                                >
                                  {task.title}
                                </Typography>
                                <Chip
                                  label={task.status}
                                  size="small"
                                  color={
                                    task.status === "IN_PROGRESS"
                                      ? "primary"
                                      : task.status === "CHANGES_REQUESTED"
                                        ? "warning"
                                        : "success"
                                  }
                                  sx={{ fontWeight: 700 }}
                                />
                              </Box>

                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mb: 2 }}
                              >
                                Branch Git: <code>{task.branchName}</code>
                                {task.dueDate ? (
                                  <>
                                    {" | "}Prazo:{" "}
                                    <strong>
                                      {new Date(
                                        task.dueDate,
                                      ).toLocaleDateString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </strong>
                                  </>
                                ) : null}
                              </Typography>

                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Responsável:{" "}
                                  <strong>
                                    {typeof task.assignee === "object" &&
                                    task.assignee
                                      ? (task.assignee as any).name ||
                                        (task.assignee as any).email ||
                                        "Não atribuído"
                                      : task.assignee || "Não atribuído"}
                                  </strong>
                                </Typography>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  size="small"
                                  startIcon={<LaunchIcon />}
                                  onClick={() =>
                                    navigate(`/workspace/${task.projectId}`)
                                  }
                                >
                                  🚀 Iniciar Workspace
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                );
              })()}
            </Box>
          )}
        </Box>
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
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {pr.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
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
                              Nenhum Pull Request pendente para revisão no
                              momento.
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
        onArticleCreated={(articleId) => handleSelectArticle(articleId)}
      />

      {/* Modal de Criação de Tarefa */}
      <CreateTaskModal
        open={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        projectId={activeProjectId}
        members={currentMembers}
      />

      {/* Modal de Gestão de Release Candidates */}
      <ReleaseCandidatesModal
        open={isRCModalOpen}
        onClose={() => setIsRCModalOpen(false)}
        projectId={activeProjectId}
      />

      {/* Modal de Adicionar Novo Membro ao Artigo */}
      <AddMemberModal
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        projectId={activeProjectId}
      />
    </Box>
  );
};
