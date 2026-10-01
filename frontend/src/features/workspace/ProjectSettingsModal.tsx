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
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LockIcon from "@mui/icons-material/Lock";
import SettingsIcon from "@mui/icons-material/Settings";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import {
  Box,
  Button,
  Chip,
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
  projectsService,
  type ProjectStage,
} from "../../services/projectsService";
import { showNotification } from "../../store/slices/notificationSlice";

interface ProjectSettingsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectDetails?: any;
  stages: ProjectStage[];
  onRefetchStages?: () => void;
  onOpenCreateStage?: () => void;
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onDeleteStage?: (stageId: string) => void;
  onReorderStages?: (stages: { id: string; order: number }[]) => void;
}

interface SortableStageRowProps {
  stage: ProjectStage;
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onDeleteStage?: (stageId: string) => void;
}

const SortableStageRow: React.FC<SortableStageRowProps> = ({
  stage,
  onUpdateStageStatus,
  onDeleteStage,
}) => {
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
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        flexWrap: "wrap",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flex: 1,
          minWidth: 260,
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

        <Box>
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

      {/* STATUS SELECT & REMOÇÃO */}
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
  onUpdateStageStatus,
  onDeleteStage,
  onReorderStages,
}) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(0);

  // Estados dos campos de metadados do artigo
  const [projectName, setProjectName] = useState(projectDetails?.name || "");
  const [description, setDescription] = useState(
    projectDetails?.description || "",
  );
  const [targetConferenceName, setTargetConferenceName] = useState(
    projectDetails?.targetConferenceName || "",
  );
  const [targetConferenceDate, setTargetConferenceDate] = useState(
    projectDetails?.targetConferenceDate
      ? new Date(projectDetails.targetConferenceDate)
          .toISOString()
          .split("T")[0]
      : "",
  );
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);

  const customStages = stages.filter((s) => !s.isGatekeeper);
  const gatekeeperStages = stages.filter((s) => s.isGatekeeper);
  const writingStagesCompleted = customStages.every(
    (s) => s.status === StageStatus.COMPLETED,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = customStages.findIndex((s) => s.id === active.id);
    const newIndex = customStages.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedCustom = arrayMove(customStages, oldIndex, newIndex);
      if (onReorderStages) {
        onReorderStages(
          reorderedCustom.map((s, idx) => ({ id: s.id, order: idx + 1 })),
        );
      }
    }
  };

  const handleSaveMetadata = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsUpdatingMetadata(true);
    try {
      await projectsService.updateProject(projectId, {
        name: projectName || undefined,
        description: description || undefined,
        targetConferenceName: targetConferenceName || undefined,
        targetConferenceDate: targetConferenceDate || undefined,
      });

      dispatch(
        showNotification({
          message: "Metadados do artigo atualizados com sucesso!",
          severity: "success",
        }),
      );
      if (onRefetchStages) onRefetchStages();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Erro ao atualizar metadados.";
      dispatch(showNotification({ message: msg, severity: "error" }));
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<SettingsIcon color="primary" />}
      title="Configurações & Governança do Projeto"
      subtitle="Gerencie as etapas de escrita, reordenação de fluxo (Drag & Drop) e metadados da conferência."
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
            icon={<ArticleIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Metadados & Congresso"
            sx={{ fontWeight: 700 }}
          />
        </Tabs>
      }
      hideFooter={activeTab === 0}
      onSubmit={activeTab === 1 ? handleSaveMetadata : undefined}
      confirmText="Salvar Metadados"
      isSubmitting={isUpdatingMetadata}
    >
      {/* ABA 1: GERENCIAMENTO DE ETAPAS (CRUD & DRAG AND DROP) */}
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
                + Nova Etapa
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
                    onUpdateStageStatus={onUpdateStageStatus}
                    onDeleteStage={onDeleteStage}
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

      {/* ABA 2: METADADOS DO PROJETO & CONGRESSO */}
      {activeTab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
