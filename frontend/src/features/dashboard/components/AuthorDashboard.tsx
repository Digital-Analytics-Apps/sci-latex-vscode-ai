import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArticleIcon from "@mui/icons-material/Article";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Role } from "../../../constants/roles";
import { StageStatus } from "../../../constants/status";
import type { ArticleItem } from "../../../services/articlesService";
import { projectsService } from "../../../services/projectsService";
import { showNotification } from "../../../store/slices/notificationSlice";
import { ArticleTimelineHeader } from "../../../components/common/ArticleTimelineHeader";
import { AuthorTasksTable } from "../../workspace/components/AuthorTasksTable";
import { CreateStageModal } from "../../workspace/CreateStageModal";
import { ProjectSettingsModal } from "../../workspace/ProjectSettingsModal";
import type { TaskItem } from "../../../types/task.types";

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
  const dispatch = useDispatch();
  const currentMembers = selectedArticle?.members || [];
  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedStageFilterId, setSelectedStageFilterId] = useState<string | null>(null);

  const { data: stages = [], refetch: refetchStages } = useQuery({
    queryKey: ["project-stages", activeProjectId],
    queryFn: () => projectsService.getProjectStages(activeProjectId),
    enabled: Boolean(activeProjectId && !activeProjectId.startsWith("demo-")),
  });

  const handleUpdateStageStatus = async (
    stageId: string,
    status: StageStatus,
  ) => {
    try {
      await projectsService.updateProjectStage(activeProjectId, stageId, {
        status,
      });
      refetchStages();
      dispatch(
        showNotification({
          message: "Status da etapa de escrita atualizado com sucesso!",
          severity: "success",
        }),
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Erro ao atualizar etapa.";
      dispatch(showNotification({ message: msg, severity: "error" }));
    }
  };

  const handleReorderStages = async (
    reorderedList: { id: string; order: number }[],
  ) => {
    try {
      await projectsService.reorderProjectStages(
        activeProjectId,
        reorderedList,
      );
      refetchStages();
      dispatch(
        showNotification({
          message: "Ordem das etapas de escrita atualizada com sucesso!",
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao reordenar etapas de escrita.",
          severity: "error",
        }),
      );
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    const targetStage = stages.find((s: any) => s.id === stageId);
    if (targetStage?.tasks && targetStage.tasks.length > 0) {
      dispatch(
        showNotification({
          message: `Não é possível excluir a etapa "${targetStage.title}" porque ela possui tarefas vinculadas. Remova ou reatribua as tarefas primeiro.`,
          severity: "warning",
        }),
      );
      return;
    }

    try {
      await projectsService.deleteProjectStage(activeProjectId, stageId);
      refetchStages();
      dispatch(
        showNotification({
          message: "Etapa excluída com sucesso!",
          severity: "success",
        }),
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Erro ao excluir etapa.";
      dispatch(showNotification({ message: msg, severity: "error" }));
    }
  };

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
          {/* CABEÇALHO DENSO E COMPACTO DO ARTIGO */}
          <Card
            variant="outlined"
            sx={{ mb: 2, boxShadow: 1, borderRadius: 2, bgcolor: "background.paper" }}
          >
            <CardContent sx={{ p: 1.8, pb: "14px !important" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                {/* LADO ESQUERDO: NAVEGAÇÃO E METADADOS DO ARTIGO */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", flex: 1 }}>
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                    onClick={onClearArticle}
                    sx={{ fontWeight: 700, px: 1, py: 0.2, minWidth: "auto", fontSize: "0.8rem" }}
                  >
                    Voltar
                  </Button>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ArticleIcon color="primary" sx={{ fontSize: 22 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>
                      {selectedArticle?.title || "Artigo Selecionado"}
                    </Typography>
                    <Chip
                      label={selectedArticle?.role || "Autor"}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700, height: 20, fontSize: "0.7rem" }}
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: "0.75rem" }}>
                    • Conferência: <strong>{selectedArticle?.conference || "IEEE Transactions"}</strong> • Git: <code>{selectedArticle?.repo || "repo"}</code> (dev)
                  </Typography>
                </Box>

                {/* LADO DIREITO: BARRA UNIFICADA DE AÇÕES E MEMBROS */}
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  {/* AVATARES COMPACTOS DOS MEMBROS */}
                  {currentMembers.length > 0 && (
                    <Stack direction="row" spacing={-0.8} sx={{ mr: 0.5 }}>
                      {currentMembers.map((m: any) => {
                        const u = m.user || { name: "Membro", email: "" };
                        const roleLabel = m.role === Role.REVIEWER ? "Revisor" : "Autor";
                        return (
                          <Tooltip key={m.id || m.userId} title={`${u.name} (${roleLabel})`}>
                            <Avatar
                              sx={{
                                width: 26,
                                height: 26,
                                fontSize: 11,
                                fontWeight: 700,
                                border: "2px solid #1e1e2d",
                                bgcolor: m.role === Role.REVIEWER ? "secondary.main" : "primary.main",
                              }}
                            >
                              {u.name?.[0] || "U"}
                            </Avatar>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  )}

                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<SettingsIcon sx={{ fontSize: 15 }} />}
                    onClick={() => setIsSettingsOpen(true)}
                    sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.75rem", height: 28 }}
                  >
                    ⚙️ Configurações
                  </Button>

                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<PersonAddIcon sx={{ fontSize: 15 }} />}
                    onClick={onOpenAddMember}
                    sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.75rem", height: 28 }}
                  >
                    + Membro
                  </Button>

                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                    onClick={onOpenCreateTask}
                    sx={{ fontWeight: 700, fontSize: "0.75rem", height: 28 }}
                  >
                    + Nova Tarefa
                  </Button>

                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<ArticleIcon sx={{ fontSize: 15 }} />}
                    onClick={onOpenRCModal}
                    sx={{ fontWeight: 700, fontSize: "0.75rem", height: 28 }}
                  >
                    Release Candidates
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* RÉGUA DE TIMELINE E GATEKEEPERS DA ETAPA DE ESCRITA */}
          {stages.length > 0 && (
            <ArticleTimelineHeader
              stages={stages}
              selectedStageId={selectedStageFilterId}
              onSelectStage={(stageId) => setSelectedStageFilterId(stageId)}
              onUpdateStageStatus={handleUpdateStageStatus}
              onDeleteStage={handleDeleteStage}
              onOpenCreateStage={() => setIsCreateStageOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onReorderStages={handleReorderStages}
            />
          )}

          {/* LISTA DE TAREFAS EM DATAGRID DO ARTIGO SELECIONADO */}
          <AuthorTasksTable
            projectId={activeProjectId}
            provisioningTaskId={provisioningTaskId}
            currentUserId={currentUserId}
            onStartWorkspace={onStartWorkspace}
          />

          {/* MODAL PARA ADICIONAR NOVA ETAPA DE ESCRITA (FEATURE BRANCH) */}
          <CreateStageModal
            open={isCreateStageOpen}
            onClose={() => setIsCreateStageOpen(false)}
            projectId={activeProjectId}
            nextOrder={stages.length + 1}
          />

          {/* MODAL DE CONFIGURAÇÕES DO PROJETO (CRUD DE ETAPAS, D&D E METADADOS) */}
          <ProjectSettingsModal
            open={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            projectId={activeProjectId}
            projectDetails={selectedArticle}
            stages={stages}
            onRefetchStages={refetchStages}
            onOpenCreateStage={() => setIsCreateStageOpen(true)}
            onUpdateStageStatus={handleUpdateStageStatus}
            onDeleteStage={handleDeleteStage}
            onReorderStages={handleReorderStages}
          />
        </Box>
      )}
    </Box>
  );
};
