import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleIcon from "@mui/icons-material/Article";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArticleTimelineHeader } from "../../components/common/ArticleTimelineHeader";
import { UserAvatarStack } from "../../components/common/UserAvatarStack";
import { StageStatus } from "../../constants/status";
import { useProjectDetails } from "../../hooks/useProjectQueries";
import { useActivateTaskWorkspaceMutation } from "../../hooks/useTaskQueries";
import {
  projectsService,
  type ProjectStage,
} from "../../services/projectsService";
import type { RootState } from "../../store";
import { showNotification } from "../../store/slices/notificationSlice";
import type { TaskItem } from "../../types/task.types";
import { AddMemberModal } from "../workspace/AddMemberModal";
import { AuthorTasksTable } from "../workspace/components/AuthorTasksTable";
import { CreateStageModal } from "../workspace/CreateStageModal";
import { CreateTaskModal } from "../workspace/CreateTaskModal";
import { ProjectSettingsModal } from "../workspace/ProjectSettingsModal";

const DEFAULT_FALLBACK_STAGES: ProjectStage[] = [
  {
    id: "stage-default-1",
    projectId: "demo",
    order: 1,
    title: "Planejamento e Pesquisa",
    description:
      "Mapeamento inicial de bibliografia, hipóteses e estruturação TeX",
    status: StageStatus.IN_PROGRESS,
    isGatekeeper: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedStartAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    plannedEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-2",
    projectId: "demo",
    order: 2,
    title: "Desenvolvimento e Experimentos",
    description:
      "Execução de testes, geração de gráficos e tabelas de resultados",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-3",
    projectId: "demo",
    order: 3,
    title: "Escrita da Versão Rascunho",
    description: "Redação de Seções, Introdução, Metodologia e Conclusão",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-4",
    projectId: "demo",
    order: 4,
    title: "Parecer do NIT (Gatekeeper 1)",
    description: "Validação institucional, propriedade intelectual e submissão",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: true,
    gatekeeperType: "NIT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 105 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-5",
    projectId: "demo",
    order: 5,
    title: "Submissão ao Congresso Alvo (Gatekeeper 2)",
    description: "Envio final à conferência científica",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: true,
    gatekeeperType: "TARGET_CONFERENCE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 120 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
];

export const ArticleDetailPage = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);

  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedStageFilterId, setSelectedStageFilterId] = useState<
    string | null
  >(null);
  const [provisioningTaskId, setProvisioningTaskId] = useState<string | null>(
    null,
  );

  const { data: projectDetails, isLoading: isProjectLoading } =
    useProjectDetails(projectId);

  const { data: stages = [], refetch: refetchStages } = useQuery({
    queryKey: ["project-stages", projectId],
    queryFn: () => projectsService.getProjectStages(projectId),
    enabled: Boolean(projectId && !projectId.startsWith("demo-")),
  });

  const effectiveStages =
    stages && stages.length > 0 ? stages : DEFAULT_FALLBACK_STAGES;

  const currentMembers = projectDetails?.members || [];

  const activateWorkspaceMutation = useActivateTaskWorkspaceMutation(projectId);

  const handleStartWorkspace = async (task: TaskItem) => {
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
  };

  if (isProjectLoading) {
    return (
      <Box sx={{ p: 3, width: "100%" }}>
        <LinearProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* CABEÇALHO DENSO E COMPACTO DO ARTIGO SELECIONADO */}
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          boxShadow: 1,
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
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
                  {projectDetails?.name || "Artigo Científico"}
                </Typography>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500, fontSize: "0.75rem" }}
              >
                • Conferência:{" "}
                <strong>
                  {projectDetails?.targetConferenceName || "IEEE Transactions"}
                </strong>
              </Typography>
            </Box>

            {/* LADO DIREITO: BARRA UNIFICADA DE AÇÕES E MEMBROS */}
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
        </CardContent>
      </Card>

      {/* RÉGUA DE TIMELINE E GATEKEEPERS DA ETAPA DE ESCRITA */}
      <ArticleTimelineHeader
        stages={effectiveStages}
        selectedStageId={selectedStageFilterId}
        onSelectStage={(stageId) => setSelectedStageFilterId(stageId)}
      />

      {/* LISTA DE TAREFAS EM DATAGRID DO ARTIGO SELECIONADO */}
      <AuthorTasksTable
        projectId={projectId}
        provisioningTaskId={provisioningTaskId}
        currentUserId={user?.id}
        onStartWorkspace={handleStartWorkspace}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
      />

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
      />

      {/* MODAL PARA ADICIONAR NOVO MEMBRO / COAUTOR */}
      <AddMemberModal
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        projectId={projectId}
      />
    </Box>
  );
};
