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
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import { PRStatus } from "../../constants/status";
import { useTasksQuery } from "../../hooks/useTaskQueries";
import {
  useMergePRMutation,
  useProjectDetails,
  usePullRequestsList,
  useSaveProgressMutation,
} from "../../hooks/useProjectQueries";
import { useSSEEventSource } from "../../hooks/useSSEEventSource";
import { tasksService } from "../../services/tasksService";
import { showNotification } from "../../store/slices/notificationSlice";
import { CodeServerIframe } from "./CodeServerIframe";
import { CreatePRModal } from "./CreatePRModal";
import { SaveProgressModal } from "./SaveProgressModal";

import { categorizeProjectMembers } from "../../utils/memberUtils";

export const WorkspacePage = () => {
  const { projectId = "demo-project-1", taskId } = useParams<{
    projectId: string;
    taskId?: string;
  }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: project, isLoading, refetch } = useProjectDetails(projectId);
  const { data: tasksList = [] } = useTasksQuery(projectId);
  const { data: pullRequests = [] } = usePullRequestsList(projectId);
  const saveProgressMutation = useSaveProgressMutation(projectId);
  const mergePRMutation = useMergePRMutation(projectId);

  const activeTask =
    tasksList.find((t) => t.id === taskId) ||
    tasksList.find((t) => t.status === "IN_PROGRESS") ||
    tasksList[0];

  const targetTaskId = taskId || activeTask?.id;

  // Conecta ao canal SSE do projeto/tarefa para monitorar a presença e renovar o Redis TTL
  useSSEEventSource(projectId, targetTaskId);

  const shouldProvision = Boolean(projectId && targetTaskId);
  const [isProvisioning, setIsProvisioning] =
    useState<boolean>(shouldProvision);

  useEffect(() => {
    if (!shouldProvision || !projectId || !targetTaskId) return;

    let isSubscribed = true;
    tasksService
      .activateWorkspace(projectId, targetTaskId)
      .catch(() => {})
      .finally(() => {
        if (isSubscribed) {
          setIsProvisioning(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [projectId, targetTaskId, shouldProvision]);

  const { allMembers, coAuthors, reviewers } = categorizeProjectMembers(
    project?.members,
  );

  const [isPRModalOpen, setIsPRModalOpen] = useState<boolean>(false);
  const [isSaveProgressModalOpen, setIsSaveProgressModalOpen] =
    useState<boolean>(false);

  const activePR = pullRequests.find(
    (pr: any) =>
      (activeTask && pr.taskId === activeTask.id) || pr.projectId === projectId,
  );

  const canSaveProgress =
    !saveProgressMutation.isPending &&
    activePR?.status !== PRStatus.UNDER_REVIEW &&
    activePR?.status !== PRStatus.APPROVED &&
    activePR?.status !== PRStatus.MERGED;
  const canSendForReview = !activePR || activePR.status === PRStatus.DRAFT;
  const canMerge = activePR?.status === PRStatus.APPROVED;

  const getSaveProgressTooltip = () => {
    if (saveProgressMutation.isPending) return "Salvando progresso...";
    if (activePR?.status === PRStatus.UNDER_REVIEW)
      return "O artigo está sob revisão do Revisor. Edições bloqueadas.";
    if (activePR?.status === PRStatus.APPROVED)
      return "O Pull Request foi aprovado pelo Revisor. Clique em 'Realizar Merge' para integrar o trabalho.";
    if (activePR?.status === PRStatus.MERGED)
      return "Esta tarefa já foi concluída e mesclada na dev.";
    return "Salva o progresso das suas edições no Git e mantém o Draft PR no GitHub";
  };

  const getSendReviewTooltip = () => {
    if (activePR?.status === PRStatus.UNDER_REVIEW)
      return "Sob análise do Revisor";
    if (activePR?.status === PRStatus.APPROVED)
      return "Revisão aprovada pelo Revisor";
    if (activePR?.status === PRStatus.MERGED) return "Mesclado na branch dev";
    return "Enviar para análise do Revisor (converte Draft em Ready for Review)";
  };

  const getMergeTooltip = () => {
    if (canMerge)
      return "Realizar o merge da tarefa aprovada na branch dev oficial";
    if (activePR?.status === PRStatus.MERGED)
      return "Merge já foi realizado nesta tarefa";
    return "O merge fica disponível somente após a aprovação da revisão pelo Revisor";
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
      navigate("/");
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
                  activePR.status === PRStatus.APPROVED
                    ? "success"
                    : activePR.status === PRStatus.UNDER_REVIEW
                      ? "warning"
                      : activePR.status === PRStatus.MERGED
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

            <Tooltip title={getSaveProgressTooltip()}>
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
                  onClick={() => setIsSaveProgressModalOpen(true)}
                  disabled={!canSaveProgress}
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
            position: "relative",
          }}
        >
          {isProvisioning ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 2,
                bgcolor: "#0b0f17",
              }}
            >
              <CircularProgress color="primary" size={36} />
              <Typography variant="body2" color="text.secondary">
                ⚡ Sincronizando repositório Git e verificando Pod Kubernetes...
              </Typography>
            </Box>
          ) : (
            <CodeServerIframe
              projectId={projectId}
              taskId={activeTask?.id || taskId}
            />
          )}
        </Box>
      </Box>

      <SaveProgressModal
        open={isSaveProgressModalOpen}
        onClose={() => setIsSaveProgressModalOpen(false)}
        projectId={projectId}
        activeTask={activeTask}
      />

      <CreatePRModal
        open={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        projectId={projectId}
        activeTask={activeTask}
        allMembers={allMembers}
        coAuthors={coAuthors}
        reviewers={reviewers}
      />
    </Box>
  );
};
