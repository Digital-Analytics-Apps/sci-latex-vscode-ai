import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddIcon from "@mui/icons-material/Add";
import ArticleIcon from "@mui/icons-material/Article";
import CodeIcon from "@mui/icons-material/Code";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import LockIcon from "@mui/icons-material/Lock";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PublishIcon from "@mui/icons-material/Publish";
import SendIcon from "@mui/icons-material/Send";
import SettingsIcon from "@mui/icons-material/Settings";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../components/common/StandardModal";
import { StageStatus } from "../../constants/status";
import {
  useCreateRCMutation,
  usePublishReleaseMutation,
  useReleaseCandidatesQuery,
  useReleasesQuery,
} from "../../hooks/useReleaseQueries";
import {
  projectsService,
  type ProjectStage,
} from "../../services/projectsService";
import { showNotification } from "../../store/slices/notificationSlice";
import type { ReleaseCandidateItem } from "../../types/release-candidate.types";

interface ProjectSettingsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectDetails?: any;
  stages: ProjectStage[];
  onRefetchStages?: () => void;
  onOpenCreateStage?: () => void;
  onOpenAddMember?: () => void;
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onDeleteStage?: (stageId: string) => void;
  onReorderStages?: (stages: { id: string; order: number }[]) => void;
}

interface SortableStageRowProps {
  stage: ProjectStage;
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onUpdateStageField?: (stageId: string, field: string, value: any) => void;
  onDeleteStage?: (stageId: string) => void;
}

const SortableStageRow: React.FC<SortableStageRowProps> = ({
  stage,
  onUpdateStageStatus,
  onUpdateStageField,
  onDeleteStage,
}) => {
  const [expanded, setExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const tasksCount = stage.tasks?.length || 0;
  const hasTasks = tasksCount > 0;
  const slug = stage.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: isDragging ? "action.hover" : "background.paper",
        borderColor:
          stage.status === StageStatus.COMPLETED ? "success.main" : "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            minWidth: 240,
          }}
        >
          <Box
            {...attributes}
            {...listeners}
            sx={{
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
            title="Arraste para reordenar"
          >
            <DragIndicatorIcon />
          </Box>

          <Chip
            label={`Etapa ${stage.order}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 800 }}
          />

          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {stage.title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: "monospace" }}
            >
              🌿 feature/{slug} • 📋 {tasksCount} tarefa(s)
            </Typography>
          </Box>
        </Box>

        {/* STATUS SELECT, BOTÃO DE EXPANDIR/EDITAR & REMOÇÃO */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {onUpdateStageStatus && (
            <Select
              size="small"
              value={stage.status}
              onChange={(e) =>
                onUpdateStageStatus(stage.id, e.target.value as StageStatus)
              }
              sx={{ height: 32, fontSize: "0.8rem", fontWeight: 700 }}
            >
              <MenuItem value={StageStatus.NOT_STARTED}>Pendente</MenuItem>
              <MenuItem value={StageStatus.IN_PROGRESS}>Em Andamento</MenuItem>
              <MenuItem value={StageStatus.COMPLETED}>Concluída</MenuItem>
            </Select>
          )}

          <Tooltip
            title={
              expanded ? "Ocultar edição" : "Editar nome e detalhes da etapa"
            }
          >
            <IconButton
              size="small"
              color={expanded ? "primary" : "default"}
              onClick={() => setExpanded(!expanded)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {onDeleteStage && (
            <Tooltip
              title={
                hasTasks
                  ? `Esta etapa possui ${tasksCount} tarefa(s) e não pode ser excluída.`
                  : "Excluir etapa customizada"
              }
            >
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={hasTasks}
                  onClick={() => onDeleteStage(stage.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* ÁREA EXPANSÍVEL (ACCORDION) DE EDIÇÃO DO NOME E DESCRIÇÃO */}
      <Collapse
        in={expanded}
        timeout="auto"
        unmountOnExit
        sx={{ width: "100%" }}
      >
        <Box
          sx={{
            pt: 1.5,
            borderTop: "1px dashed",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              sx={{ flex: 1, minWidth: 220 }}
              size="small"
              label="Título da Etapa"
              value={stage.title}
              onChange={(e) =>
                onUpdateStageField?.(stage.id, "title", e.target.value)
              }
            />

            <TextField
              sx={{ width: 220 }}
              size="small"
              type="date"
              label="Prazo Previsto de Conclusão"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              value={
                stage.plannedCompletionDate
                  ? new Date(stage.plannedCompletionDate)
                      .toISOString()
                      .split("T")[0]
                  : stage.plannedEndAt
                    ? new Date(stage.plannedEndAt).toISOString().split("T")[0]
                    : ""
              }
              onChange={(e) =>
                onUpdateStageField?.(
                  stage.id,
                  "plannedCompletionDate",
                  e.target.value || null,
                )
              }
            />
          </Box>

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            label="Descrição / Objetivos da Etapa"
            placeholder="Ex: Escrita detalhada das seções de Introdução e Trabalhos Relacionados..."
            value={stage.description || ""}
            onChange={(e) =>
              onUpdateStageField?.(stage.id, "description", e.target.value)
            }
          />
        </Box>
      </Collapse>
    </Paper>
  );
};

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  open,
  onClose,
  projectId,
  projectDetails,
  stages,
  onRefetchStages,
  onOpenCreateStage,
  onOpenAddMember,
}) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(0);

  // Estados rascunho (Draft) de etapas e metadados
  const [localStages, setLocalStages] = useState<ProjectStage[]>([]);
  const [deletedStageIds, setDeletedStageIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [targetConferenceName, setTargetConferenceName] = useState("");
  const [targetConferenceDate, setTargetConferenceDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Estado e mutações de Release Candidates & Releases Oficiais
  const [rcFeedbackNotes, setRcFeedbackNotes] = useState("");
  const { data: releaseCandidates, isLoading: isLoadingRCs } =
    useReleaseCandidatesQuery(projectId);
  const { data: officialReleases, isLoading: isLoadingReleases } =
    useReleasesQuery(projectId);
  const createRCMutation = useCreateRCMutation(projectId);
  const publishReleaseMutation = usePublishReleaseMutation(projectId);

  const membersList = projectDetails?.members || [];

  // Sincroniza estado rascunho sempre que o modal abre
  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalStages(stages || []);
      setDeletedStageIds([]);
      setProjectName(projectDetails?.name || "");
      setDescription(projectDetails?.description || "");
      setTargetConferenceName(projectDetails?.targetConferenceName || "");
      setTargetConferenceDate(
        projectDetails?.targetConferenceDate
          ? new Date(projectDetails.targetConferenceDate)
              .toISOString()
              .split("T")[0]
          : "",
      );
    }
  }, [open, stages, projectDetails]);

  const customStages = localStages.filter((s) => !s.isGatekeeper);
  const gatekeeperStages = localStages.filter((s) => s.isGatekeeper);
  const writingStagesCompleted = customStages.every(
    (s) => s.status === StageStatus.COMPLETED,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Edição local: Reordenação por D&D
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = customStages.findIndex((s) => s.id === active.id);
    const newIndex = customStages.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedCustom = arrayMove(customStages, oldIndex, newIndex).map(
        (s, idx) => ({ ...s, order: idx + 1 }),
      );
      setLocalStages([...reorderedCustom, ...gatekeeperStages]);
    }
  };

  // Edição local: Status da Etapa
  const handleLocalUpdateStageStatus = (
    stageId: string,
    status: StageStatus,
  ) => {
    setLocalStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, status } : s)),
    );
  };

  // Edição local: Campos da Etapa (título, descrição, etc)
  const handleLocalUpdateStageField = (
    stageId: string,
    field: string,
    value: any,
  ) => {
    setLocalStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, [field]: value } : s)),
    );
  };

  // Edição local: Remoção da Etapa
  const handleLocalDeleteStage = (stageId: string) => {
    const targetStage = localStages.find((s) => s.id === stageId);
    if (targetStage?.tasks && targetStage.tasks.length > 0) {
      dispatch(
        showNotification({
          message: `Não é possível excluir a etapa "${targetStage.title}" porque ela possui tarefas vinculadas. Remova ou reatribua as tarefas primeiro.`,
          severity: "warning",
        }),
      );
      return;
    }
    setLocalStages((prev) => prev.filter((s) => s.id !== stageId));
    setDeletedStageIds((prev) => [...prev, stageId]);
  };

  // HANDLERS PARA RELEASE CANDIDATES
  const handleCreateRC = async () => {
    try {
      await createRCMutation.mutateAsync({
        feedbackNotes: rcFeedbackNotes || undefined,
      });

      dispatch(
        showNotification({
          message:
            "Nova Release Candidate (RC) gerada e submetida ao Revisor Técnico!",
          severity: "success",
        }),
      );
      setRcFeedbackNotes("");
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao gerar Release Candidate.",
          severity: "error",
        }),
      );
    }
  };

  const handlePublishRelease = async () => {
    try {
      await publishReleaseMutation.mutateAsync();
      dispatch(
        showNotification({
          message: "Release Oficial publicada com sucesso!",
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao publicar Release Oficial.",
          severity: "error",
        }),
      );
    }
  };

  // SALVAMENTO ÚNICO DE TODAS AS ALTERAÇÕES DO MODAL
  const handleSaveAll = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Processa remoções de etapas
      for (const stageId of deletedStageIds) {
        await projectsService.deleteProjectStage(projectId, stageId);
      }

      // 2. Atualiza reordenação de etapas customizadas
      const customLocal = localStages.filter((s) => !s.isGatekeeper);
      if (customLocal.length > 0) {
        const reorderList = customLocal.map((s, idx) => ({
          id: s.id,
          order: idx + 1,
        }));
        await projectsService.reorderProjectStages(projectId, reorderList);
      }

      // 3. Atualiza dados, status e prazos de etapas alteradas
      for (const localStage of localStages) {
        const orig = stages.find((s) => s.id === localStage.id);
        if (
          orig &&
          (orig.status !== localStage.status ||
            orig.title !== localStage.title ||
            orig.description !== localStage.description ||
            orig.plannedCompletionDate !== localStage.plannedCompletionDate)
        ) {
          await projectsService.updateProjectStage(projectId, localStage.id, {
            title:
              localStage.title !== orig.title ? localStage.title : undefined,
            description:
              localStage.description !== orig.description
                ? localStage.description || ""
                : undefined,
            status:
              localStage.status !== orig.status ? localStage.status : undefined,
            plannedCompletionDate:
              localStage.plannedCompletionDate !== orig.plannedCompletionDate
                ? localStage.plannedCompletionDate
                : undefined,
          });
        }
      }

      // 4. Atualiza metadados do projeto
      await projectsService.updateProject(projectId, {
        name: projectName || undefined,
        description: description || undefined,
        targetConferenceName: targetConferenceName || undefined,
        targetConferenceDate: targetConferenceDate || undefined,
      });

      dispatch(
        showNotification({
          message: "Configurações do artigo salvas com sucesso!",
          severity: "success",
        }),
      );

      if (onRefetchStages) onRefetchStages();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Erro ao salvar configurações do projeto.";
      dispatch(showNotification({ message: msg, severity: "error" }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<SettingsIcon color="primary" />}
      title="Configurações & Governança do Projeto"
      subtitle="Gerencie as etapas de escrita, reordenação de fluxo (Drag & Drop), membros, releases e metadados."
      subheader={
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab
            icon={<ViewWeekIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Etapas de Escrita (D&D)"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            icon={<PeopleIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Membros & Coautores"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            icon={<LocalOfferIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Release Candidates (RCs)"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            icon={<ArticleIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Metadados & Repositório Git"
            sx={{ fontWeight: 700 }}
          />
        </Tabs>
      }
      hideFooter={false}
      showCancel={true}
      cancelText="Cancelar"
      showConfirm={true}
      confirmText="Salvar Alterações"
      onSubmit={handleSaveAll}
      isSubmitting={isSaving}
    >
      {/* ABA 0: GERENCIAMENTO DE ETAPAS (CRUD & DRAG AND DROP) */}
      {activeTab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Etapas Customizadas de Escrita ({customStages.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Arraste o ícone para alterar a ordem sequencial das Feature
                Branches no Git.
              </Typography>
            </Box>

            {onOpenCreateStage && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  onOpenCreateStage();
                }}
                sx={{ fontWeight: 700 }}
              >
                Nova Etapa
              </Button>
            )}
          </Box>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={customStages.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <Stack spacing={1.5}>
                {customStages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onUpdateStageStatus={handleLocalUpdateStageStatus}
                    onUpdateStageField={handleLocalUpdateStageField}
                    onDeleteStage={handleLocalDeleteStage}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          {/* SEÇÃO DE GATEKEEPERS FIXOS */}
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: "1px dashed",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1, color: "warning.main" }}
            >
              🔒 Etapas de Trava Obrigatórias (Gatekeepers Fixos no Final)
            </Typography>

            <Stack spacing={1}>
              {gatekeeperStages.map((stage) => {
                const isLocked =
                  !writingStagesCompleted &&
                  stage.status !== StageStatus.COMPLETED;
                return (
                  <Paper
                    key={stage.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <LockIcon
                        color={isLocked ? "warning" : "disabled"}
                        fontSize="small"
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {stage.order}. {stage.title}
                      </Typography>
                    </Box>

                    <Chip
                      label={
                        stage.status === StageStatus.COMPLETED
                          ? "✓ Aprovada"
                          : isLocked
                            ? "🔒 Bloqueada (Aguardando etapas de escrita)"
                            : "Pendente"
                      }
                      color={
                        stage.status === StageStatus.COMPLETED
                          ? "success"
                          : isLocked
                            ? "warning"
                            : "default"
                      }
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </Box>
      )}

      {/* ABA 1: GERENCIAMENTO DE MEMBROS E COAUTORES */}
      {activeTab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Membros e Colaboradores do Artigo ({membersList.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gerencie os Autores e Revisores associados a este artigo
                científico.
              </Typography>
            </Box>

            {onOpenAddMember && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<PersonAddIcon />}
                onClick={onOpenAddMember}
                sx={{ fontWeight: 700 }}
              >
                Adicionar Membro
              </Button>
            )}
          </Box>

          <Stack spacing={1.5}>
            {membersList.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: "center",
                  color: "text.secondary",
                  borderRadius: 2,
                }}
              >
                Nenhum membro adicional vinculado. Clique no botão acima para
                adicionar autores ou revisores.
              </Paper>
            ) : (
              membersList.map((m: any) => {
                const u = m.user || { name: "Membro", email: "" };
                const isReviewer =
                  m.role === "REVIEWER" || m.role === "REVISOR";
                return (
                  <Paper
                    key={m.id || m.userId}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          fontWeight: 700,
                          bgcolor: isReviewer
                            ? "secondary.main"
                            : "primary.main",
                        }}
                      >
                        {u.name?.[0] || "U"}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, lineHeight: 1.2 }}
                        >
                          {u.name || "Membro sem nome"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.email || "Email não cadastrado"}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      label={isReviewer ? "Revisor Técnico" : "Coautor / Autor"}
                      color={isReviewer ? "secondary" : "primary"}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Paper>
                );
              })
            )}
          </Stack>
        </Box>
      )}

      {/* ABA 2: RELEASE CANDIDATES (RCs) & PUBLICAÇÕES OFICIAIS */}
      {activeTab === 2 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* SEÇÃO 1: RELEASES OFICIAIS PUBLICADAS NA MAIN */}
          <Box>
            <Box
              sx={{
                mb: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Releases Oficiais Publicadas (branch main)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Versões finais consolidadas e publicadas na branch main do
                  repositório.
                </Typography>
              </Box>

              <Tooltip
                title={
                  !writingStagesCompleted
                    ? "Para publicar uma Release Oficial na main, 100% das etapas de escrita devem estar concluídas."
                    : "Publicar versão final na branch main"
                }
              >
                <span>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<PublishIcon />}
                    onClick={handlePublishRelease}
                    disabled={
                      !writingStagesCompleted ||
                      publishReleaseMutation.isPending
                    }
                    sx={{ fontWeight: 700 }}
                  >
                    {publishReleaseMutation.isPending
                      ? "Publicando..."
                      : "Publicar Release Oficial (v1.0 na Main)"}
                  </Button>
                </span>
              </Tooltip>
            </Box>

            {isLoadingReleases ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : !officialReleases || officialReleases.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: "center",
                  color: "text.secondary",
                  borderRadius: 2,
                }}
              >
                Nenhuma Release Oficial publicada na branch main até o momento.
              </Paper>
            ) : (
              <Stack spacing={1}>
                {officialReleases.map((rel: any) => (
                  <Paper
                    key={rel.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: "success.main",
                      bgcolor: "rgba(46, 125, 50, 0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Chip
                        label={rel.versionTag || "v1.0"}
                        color="success"
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, lineHeight: 1.2 }}
                        >
                          {rel.title || "Release Oficial do Artigo"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace" }}
                        >
                          SHA: {rel.commitSha}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Publicado em:{" "}
                      {new Date(rel.createdAt).toLocaleDateString("pt-BR")}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          {/* SEÇÃO 2: HISTÓRICO DE RELEASE CANDIDATES */}
          <Box>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Histórico de Release Candidates (RCs)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Snapshots consolidados enviados ao Revisor Técnico para
                avaliação e parecer.
              </Typography>
            </Box>

            {isLoadingRCs ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : !releaseCandidates || releaseCandidates.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: "center",
                  color: "text.secondary",
                  borderRadius: 2,
                }}
              >
                Nenhuma Release Candidate gerada para este artigo até o momento.
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {releaseCandidates.map((rc: ReleaseCandidateItem) => (
                  <Paper
                    key={rc.id}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <LocalOfferIcon color="primary" sx={{ fontSize: 18 }} />
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 800 }}
                        >
                          {rc.versionTag}
                        </Typography>
                      </Box>
                      <Chip
                        label={
                          rc.status === "APPROVED"
                            ? "✓ Aprovada"
                            : rc.status === "CHANGES_REQUESTED"
                              ? "Ajustes Solicitados"
                              : "Em Avaliação"
                        }
                        size="small"
                        color={
                          rc.status === "APPROVED"
                            ? "success"
                            : rc.status === "CHANGES_REQUESTED"
                              ? "error"
                              : "warning"
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                    {rc.feedback && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        💬 <strong>Parecer do Revisor:</strong> {rc.feedback}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Submetido em:{" "}
                      {new Date(rc.createdAt).toLocaleDateString("pt-BR")} às{" "}
                      {new Date(rc.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          {/* SEÇÃO 3: FORMULÁRIO DE NOVA RELEASE CANDIDATE */}
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              🚀 Submeter Nova Release Candidate (RC)
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1.5, display: "block" }}
            >
              Gera um snapshot compilado no Git e notifica o Revisor Técnico
              para emissão de parecer.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              label="Notas / Resumo de Alterações para o Revisor Técnico (Opcional)"
              placeholder="Ex: Versão consolidada contendo a metodologia e a seção de experimentos finalizada."
              value={rcFeedbackNotes}
              onChange={(e) => setRcFeedbackNotes(e.target.value)}
              sx={{ mb: 1.5, bgcolor: "background.paper" }}
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SendIcon />}
              onClick={handleCreateRC}
              disabled={createRCMutation.isPending}
              sx={{ fontWeight: 700 }}
            >
              {createRCMutation.isPending
                ? "Gerando RC..."
                : "Gerar RC e Enviar ao Revisor"}
            </Button>
          </Paper>
        </Box>
      )}

      {/* ABA 3: METADADOS DO PROJETO & CONGRESSO */}
      {activeTab === 3 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* PAINEL DE INFORMAÇÕES DO REPOSITÓRIO GIT & BRANCH */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.8,
              borderRadius: 2,
              bgcolor: "action.hover",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <CodeIcon color="primary" fontSize="small" /> Repositório & Branch
              Git do Projeto
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                Git URL:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "monospace",
                  bgcolor: "background.paper",
                  px: 1.2,
                  py: 0.4,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                }}
              >
                {projectDetails?.repo ||
                  "https://github.com/gilsonrusso/sci-paper-detecao-com-agentes-03-fe835b2f"}
              </Typography>
              <Chip
                label="Branch Base: dev"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, height: 22 }}
              />
            </Box>
          </Paper>

          <TextField
            fullWidth
            size="small"
            label="Título do Artigo Científico"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />

          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            label="Descrição / Resumo Executivo"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              sx={{ flex: 1, minWidth: 240 }}
              size="small"
              label="Conferência-Alvo Principal"
              placeholder="Ex: IEEE International Symposium 2027"
              value={targetConferenceName}
              onChange={(e) => setTargetConferenceName(e.target.value)}
            />

            <TextField
              sx={{ width: 220 }}
              size="small"
              type="date"
              label="Data Prevista de Submissão"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              value={targetConferenceDate}
              onChange={(e) => setTargetConferenceDate(e.target.value)}
            />
          </Box>
        </Box>
      )}
    </StandardModal>
  );
};
