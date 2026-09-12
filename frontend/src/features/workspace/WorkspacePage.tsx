import MergeTypeIcon from "@mui/icons-material/MergeType";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { useTasksQuery } from "../../hooks/useTaskQueries";
import {
  useMergePRMutation,
  useProjectDetails,
  usePullRequestsList,
  useSaveProgressMutation,
} from "../../hooks/useProjectQueries";
import { useSSEEventSource } from "../../hooks/useSSEEventSource";
import { showNotification } from "../../store/slices/notificationSlice";
import { CodeServerIframe } from "./CodeServerIframe";
import { CreatePRModal } from "./CreatePRModal";

export const WorkspacePage: React.FC = () => {
  const { projectId = "demo-project-1" } = useParams<{ projectId: string }>();
  const dispatch = useDispatch();

  // Conecta ao canal SSE do projeto para monitorar a presença e alertas em tempo real
  useSSEEventSource(projectId);

  const { data: project, isLoading, refetch } = useProjectDetails(projectId);
  const { data: tasksList = [] } = useTasksQuery(projectId);
  const { data: pullRequests = [] } = usePullRequestsList(projectId);
  const saveProgressMutation = useSaveProgressMutation(projectId);
  const mergePRMutation = useMergePRMutation(projectId);

  const activeTask =
    tasksList.find((t) => t.status === "IN_PROGRESS") || tasksList[0];
  const [isPRModalOpen, setIsPRModalOpen] = useState<boolean>(false);

  const activePR = pullRequests.find(
    (pr: any) =>
      (activeTask && pr.taskId === activeTask.id) || pr.projectId === projectId,
  );
  const canSendForReview = !activePR || activePR.status === "DRAFT";
  const canMerge = activePR?.status === "APPROVED";

  const getSendReviewTooltip = () => {
    if (activePR?.status === "UNDER_REVIEW")
      return "Sob análise do Revisor";
    if (activePR?.status === "APPROVED")
      return "Revisão aprovada pelo Revisor";
    if (activePR?.status === "MERGED")
      return "Mesclado na branch dev";
    return "Enviar para análise do Revisor (converte Draft em Ready for Review)";
  };

  const getMergeTooltip = () => {
    if (canMerge)
      return "Realizar o merge da tarefa aprovada na branch dev oficial";
    if (activePR?.status === "MERGED")
      return "Merge já foi realizado nesta tarefa";
    return "O merge fica disponível somente após a aprovação da revisão pelo Revisor";
  };

  const handleSaveProgress = async () => {
    try {
      await saveProgressMutation.mutateAsync({
        taskId: activeTask?.id || "default-task",
        commitMessage: `Update progress on ${activeTask?.title || "article"}`,
      });
      dispatch(
        showNotification({
          message: `Progresso salvo! Branch atualizada e Draft PR gerado/mantido no GitHub.`,
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao salvar progresso do artigo.",
          severity: "error",
        }),
      );
    }
  };

  const handleExecuteMerge = async () => {
    if (!activePR?.id) return;
    try {
      await mergePRMutation.mutateAsync(activePR.id);
      dispatch(
        showNotification({
          message: "Merge concluído com sucesso! A branch foi integrada à dev.",
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message:
            "Erro ao realizar merge. Certifique-se de que a revisão foi aprovada.",
          severity: "error",
        }),
      );
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
          Carregando informações do projeto acadêmico...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <Paper
          square
          variant="outlined"
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {project?.name || "Workspace de Escrita Científica"}
            </Typography>
            <Divider orientation="vertical" flexItem />
            {activeTask && (
              <Chip
                label={`Tarefa Ativa: ${activeTask.title}`}
                size="small"
                color="primary"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
            )}
            {activePR && (
              <Chip
                label={`PR: ${activePR.status}`}
                size="small"
                color={
                  activePR.status === "APPROVED"
                    ? "success"
                    : activePR.status === "UNDER_REVIEW"
                      ? "warning"
                      : activePR.status === "MERGED"
                        ? "info"
                        : "default"
                }
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Atualizar tarefas e dados do projeto">
              <IconButton onClick={() => refetch()} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Salva as alterações no Git e cria/mantém o Draft PR no GitHub">
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={
                    saveProgressMutation.isPending ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <SaveIcon fontSize="small" />
                    )
                  }
                  onClick={handleSaveProgress}
                  disabled={saveProgressMutation.isPending}
                >
                  Salvar Progresso
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={getSendReviewTooltip()}>
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<SendIcon fontSize="small" />}
                  onClick={() => setIsPRModalOpen(true)}
                  disabled={!canSendForReview}
                >
                  Enviar p/ Revisão
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={getMergeTooltip()}>
              <span>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<MergeTypeIcon fontSize="small" />}
                  onClick={handleExecuteMerge}
                  disabled={!canMerge || mergePRMutation.isPending}
                >
                  Realizar Merge
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Paper>

        <Box
          sx={{
            flexGrow: 1,
            height: "100%",
            width: "100%",
            overflow: "hidden",
          }}
        >
          <CodeServerIframe projectId={projectId} />
        </Box>
      </Box>

      <CreatePRModal
        open={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        projectId={projectId}
        tasks={tasksList}
      />
    </Box>
  );
};
