import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleIcon from "@mui/icons-material/Article";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../../components/common/PageContainer";
import { UserAvatarStack } from "../../components/common/UserAvatarStack";
import { useProjectDetails } from "../../hooks/useProjectQueries";
import {
  useActivateTaskWorkspaceMutation,
  useClaimTaskMutation,
  useRequestReviewMutation,
  useReviewDecisionMutation,
  useTasksQuery,
  useUnclaimTaskMutation,
} from "../../hooks/useTaskQueries";
import { Role } from "../../constants/roles";
import { projectsService } from "../../services/projectsService";
import type { RootState } from "../../store";
import { showNotification } from "../../store/slices/notificationSlice";
import type { TaskItem } from "../../types/task.types";
import { GanttTimelineView } from "./components/gantt/GanttTimelineView";
import { ReviewFeedbackPanel } from "./components/ReviewFeedbackPanel";
import { AddMemberModal } from "./modals/AddMemberModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { ProjectSettingsModal } from "./modals/ProjectSettingsModal";

export const ArticleDetailPage = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [createTaskInitialTitle, setCreateTaskInitialTitle] = useState("");
  const [createTaskInitialStageId, setCreateTaskInitialStageId] = useState("");
  const [provisioningTaskId, setProvisioningTaskId] = useState<string | null>(
    null,
  );

  const { data: projectDetails, isLoading: isProjectLoading } =
    useProjectDetails(projectId);

  const { data: projectTasks = [] } = useTasksQuery(projectId);

  const { data: stages = [], refetch: refetchStages } = useQuery({
    queryKey: ["project-stages", projectId],
    queryFn: () => projectsService.getProjectStages(projectId),
    enabled: Boolean(projectId),
  });

  const claimTaskMutation = useClaimTaskMutation(projectId);
  const unclaimTaskMutation = useUnclaimTaskMutation(projectId);

  const requestReviewMutation = useRequestReviewMutation(projectId);
  const reviewDecisionMutation = useReviewDecisionMutation(projectId);

  const isReviewer = useMemo(() => {
    if (!user) return false;
    if (user.role === Role.REVIEWER) return true;
    return (projectDetails?.members || []).some(
      (m) =>
        m.role === Role.REVIEWER &&
        (m.userId === user.id || m.user?.id === user.id),
    );
  }, [user, projectDetails?.members]);

  const handleRequestReview = useCallback(
    async (taskId: string) => {
      try {
        await requestReviewMutation.mutateAsync({ taskId });
        dispatch(
          showNotification({
            message: "Revisão da tarefa solicitada com sucesso ao orientador!",
            severity: "success",
          }),
        );
      } catch (err: unknown) {
        const error = err as Error;
        dispatch(
          showNotification({
            message: error.message || "Erro ao solicitar revisão.",
            severity: "error",
          }),
        );
      }
    },
    [requestReviewMutation, dispatch],
  );

  const handleApproveTask = useCallback(
    async (taskId: string) => {
      try {
        await reviewDecisionMutation.mutateAsync({ taskId, decision: "APPROVED" });
        dispatch(
          showNotification({
            message: "Tarefa aprovada com sucesso!",
            severity: "success",
          }),
        );
      } catch (err: unknown) {
        const error = err as Error;
        dispatch(
          showNotification({
            message: error.message || "Erro ao aprovar tarefa.",
            severity: "error",
          }),
        );
      }
    },
    [reviewDecisionMutation, dispatch],
  );

  const handleRequestChanges = useCallback(
    async (taskId: string) => {
      try {
        await reviewDecisionMutation.mutateAsync({
          taskId,
          decision: "CHANGES_REQUESTED",
        });
        dispatch(
          showNotification({
            message: "Ajustes solicitados ao autor da tarefa!",
            severity: "warning",
          }),
        );
      } catch (err: unknown) {
        const error = err as Error;
        dispatch(
          showNotification({
            message: error.message || "Erro ao solicitar ajustes.",
            severity: "error",
          }),
        );
      }
    },
    [reviewDecisionMutation, dispatch],
  );

  const effectiveStages = stages || [];
  const currentMembers = projectDetails?.members || [];
  const effectiveTasks: TaskItem[] = projectTasks || [];

  const activateWorkspaceMutation = useActivateTaskWorkspaceMutation(projectId);

  const handleStartWorkspace = useCallback(
    async (task: TaskItem) => {
      if (!task.id || task.id.startsWith("stage-")) {
        void navigate(`/workspace/${projectId}`);
        return;
      }
      setProvisioningTaskId(task.id);
      try {
        await activateWorkspaceMutation.mutateAsync(task.id);
        void navigate(`/workspace/${projectId}`);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        dispatch(
          showNotification({
            message:
              error?.response?.data?.message ||
              "Erro ao inicializar workspace no Pod.",
            severity: "error",
          }),
        );
      } finally {
        setProvisioningTaskId(null);
      }
    },
    [activateWorkspaceMutation, dispatch, navigate],
  );

  const handleOpenCreateTask = useCallback(
    (stageId?: string, initialTitle?: string) => {
      setCreateTaskInitialStageId(stageId || "");
      setCreateTaskInitialTitle(initialTitle || "");
      setIsCreateTaskOpen(true);
    },
    [],
  );

  if (isProjectLoading) {
    return (
      <Box sx={{ p: 3, width: "100%" }}>
        <LinearProgress color="primary" />
      </Box>
    );
  }

  return (
    <PageContainer>
      {/* CABEÇALHO DENSO E COMPACTO DO ARTIGO SELECIONADO */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 2,
        }}
      >
        {/* LADO ESQUERDO: NAVEGAÇÃO E METADADOS DO ARTIGO */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            flex: 1,
          }}
        >
          <Button
            variant="text"
            color="primary"
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate("/articles")}
            sx={{
              fontWeight: 700,
              px: 1,
              py: 0.2,
              minWidth: "auto",
              fontSize: "0.8rem",
            }}
          >
            Voltar
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ArticleIcon color="primary" sx={{ fontSize: 22 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: "1.1rem",
                lineHeight: 1.2,
              }}
            >
              {projectDetails?.name}
            </Typography>
          </Box>

          {projectDetails?.targetConferenceName && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500, fontSize: "0.75rem" }}
            >
              • Conferência:{" "}
              <strong>{projectDetails.targetConferenceName}</strong>
            </Typography>
          )}
        </Box>

        {/* LADO DIREITO: BARRA UNIFICADA DE AÇÕES E MEMBROS */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {/* AVATARES COMPACTOS DOS MEMBROS */}
          <UserAvatarStack
            members={currentMembers}
            avatarSize={26}
            sx={{ mr: 0.5 }}
          />

          <Tooltip title="Configurações & Governança do Projeto">
            <IconButton
              color="primary"
              size="small"
              onClick={() => setIsSettingsOpen(true)}
              sx={{
                border: "1px solid",
                borderColor: "primary.main",
                borderRadius: 1.5,
                px: 1,
                height: 28,
              }}
            >
              <SettingsIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* VISÃO UNIFICADA DE LINHA DO TEMPO & GRÁFICO DE GANTT */}
      {isReviewer && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: "rgba(123, 31, 162, 0.08)",
            borderColor: "rgba(123, 31, 162, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#9c27b0" }}>
            🔍 Você está atuando como Revisor Oficial deste artigo científico. Avalie as tarefas submetidas e o manuscrito consolidado na Etapa 4 antes do envio ao NIT.
          </Typography>
        </Paper>
      )}

      <GanttTimelineView
        stages={effectiveStages}
        tasks={effectiveTasks}
        projectCreatedAt={projectDetails?.createdAt}
        targetConferenceName={projectDetails?.targetConferenceName}
        targetConferenceDate={projectDetails?.targetConferenceDate}
        currentUserId={user?.id}
        provisioningTaskId={provisioningTaskId}
        onStartWorkspace={handleStartWorkspace}
        onClaimTask={(taskId) => claimTaskMutation.mutate(taskId)}
        onUnclaimTask={(taskId) => unclaimTaskMutation.mutate(taskId)}
        isClaiming={claimTaskMutation.isPending}
        isUnclaiming={unclaimTaskMutation.isPending}
        onOpenCreateTask={handleOpenCreateTask}
        onRequestReview={handleRequestReview}
        onApproveTask={handleApproveTask}
        onRequestChanges={handleRequestChanges}
        isReviewer={isReviewer}
      />

      {/* PAINEL DE APONTAMENTOS E COMENTÁRIOS DA REVISÃO */}
      <Box sx={{ mt: 3 }}>
        <ReviewFeedbackPanel
          projectId={projectId}
          stages={effectiveStages}
          onOpenCreateCorrectionTask={(initialTitle, stageId) => {
            handleOpenCreateTask(stageId, initialTitle);
          }}
        />
      </Box>

      {/* MODAL DE CONFIGURAÇÕES DO PROJETO (CRUD DE ETAPAS, MEMBROS, D&D E METADADOS) */}
      <ProjectSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projectId={projectId}
        projectDetails={projectDetails}
        stages={stages}
        onRefetchStages={refetchStages}
        onOpenAddMember={() => setIsAddMemberOpen(true)}
      />

      {/* MODAL PARA CRIAR NOVA TAREFA */}
      <CreateTaskModal
        open={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        projectId={projectId}
        members={currentMembers}
        initialTitle={createTaskInitialTitle}
        initialStageId={createTaskInitialStageId}
      />

      {/* MODAL PARA ADICIONAR NOVO MEMBRO / COAUTOR */}
      <AddMemberModal
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        projectId={projectId}
      />
    </PageContainer>
  );
};
