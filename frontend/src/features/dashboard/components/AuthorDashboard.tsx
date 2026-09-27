import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArticleIcon from "@mui/icons-material/Article";
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
  Typography,
} from "@mui/material";
import { Role } from "../../../constants/roles";
import type { ArticleItem } from "../../../services/articlesService";
import type { TaskItem } from "../../../services/tasksService";
import { AuthorTasksTable } from "../../workspace/components/AuthorTasksTable";

interface AuthorDashboardProps {
  articles: ArticleItem[];
  selectedArticle: ArticleItem | null;
  activeProjectId: string;
  provisioningTaskId: string | null;
  currentUserId?: string;
  onSelectArticle: (id: string) => void;
  onClearArticle: () => void;
  onStartWorkspace: (task: TaskItem) => void;
  onOpenCreateTask: () => void;
  onOpenRCModal: () => void;
  onOpenAddMember: () => void;
}

export const AuthorDashboard = ({
  articles,
  selectedArticle,
  activeProjectId,
  provisioningTaskId,
  currentUserId,
  onSelectArticle,
  onClearArticle,
  onStartWorkspace,
  onOpenCreateTask,
  onOpenRCModal,
  onOpenAddMember,
}: AuthorDashboardProps) => {
  const currentMembers = selectedArticle?.members || [];

  return (
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
                        color="primary"
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
                        <Typography variant="caption" color="text.secondary">
                          Progresso da Escrita
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {article.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={article.progress}
                        color={
                          article.role === "Autor" ? "primary" : "secondary"
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
                      <strong>{article.tasks.length} Tarefa(s) Ativa(s)</strong>
                    </Typography>
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => onSelectArticle(article.id)}
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
            onClick={onClearArticle}
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
                      label={selectedArticle?.role || "Autor"}
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
                    onClick={onOpenCreateTask}
                  >
                    + Nova Tarefa
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<ArticleIcon />}
                    onClick={onOpenRCModal}
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
                        m.role === Role.REVIEWER ? "secondary" : "primary";
                      const roleLabel =
                        m.role === Role.REVIEWER ? "Revisor" : "Autor";
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
                  onClick={onOpenAddMember}
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

          {/* LISTA DE TAREFAS EM DATAGRID DO ARTIGO SELECIONADO */}
          <AuthorTasksTable
            projectId={activeProjectId}
            provisioningTaskId={provisioningTaskId}
            currentUserId={currentUserId}
            onStartWorkspace={onStartWorkspace}
          />
        </Box>
      )}
    </Box>
  );
};
