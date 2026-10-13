import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleIcon from "@mui/icons-material/Article";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../../components/common/PageContainer";
import { UserAvatarStack } from "../../components/common/UserAvatarStack";
import { useProjectDetails } from "../../hooks/useProjectQueries";
import {
  useActivateTaskWorkspaceMutation,
  useClaimTaskMutation,
  useTasksQuery,
  useUnclaimTaskMutation,
} from "../../hooks/useTaskQueries";
import { projectsService } from "../../services/projectsService";
import type { RootState } from "../../store";
import { showNotification } from "../../store/slices/notificationSlice";
import type { TaskItem } from "../../types/task.types";
import { GanttTimelineView } from "./components/gantt/GanttTimelineView";
import { ReviewFeedbackPanel } from "./components/ReviewFeedbackPanel";
import { AddMemberModal } from "./modals/AddMemberModal";
import { CreateStageModal } from "./modals/CreateStageModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { ProjectSettingsModal } from "./modals/ProjectSettingsModal";

export const ArticleDetailPage = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);

  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
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

  const effectiveStages = stages || [];
  const currentMembers = projectDetails?.members || [];
  const effectiveTasks: TaskItem[] = projectTasks || [];

  const activateWorkspaceMutation = useActivateTaskWorkspaceMutation(projectId);

  const handleStartWorkspace = useCallback(
    async (task: TaskItem) => {
      setProvisioningTaskId(task.id);
      try {
        await activateWorkspaceMutation.mutateAsync(task.id);
        void navigate(`/workspace/${task.projectId}/task/${task.id}`, {
          replace: true,
        });
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
        onOpenCreateStage={() => setIsCreateStageOpen(true)}
        onOpenCreateTask={handleOpenCreateTask}
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

      {/* MODAL PARA ADICIONAR NOVA ETAPA DE ESCRITA (FEATURE BRANCH) */}
      <CreateStageModal
        open={isCreateStageOpen}
        onClose={() => setIsCreateStageOpen(false)}
        projectId={projectId}
        nextOrder={stages.length + 1}
      />

      {/* MODAL DE CONFIGURAÇÕES DO PROJETO (CRUD DE ETAPAS, MEMBROS, D&D E METADADOS) */}
      <ProjectSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projectId={projectId}
        projectDetails={projectDetails}
        stages={stages}
        onRefetchStages={refetchStages}
        onOpenCreateStage={() => setIsCreateStageOpen(true)}
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
