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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EventIcon from "@mui/icons-material/Event";
import LockIcon from "@mui/icons-material/Lock";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TimelineIcon from "@mui/icons-material/Timeline";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import FlagIcon from "@mui/icons-material/Flag";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { StageStatus } from "../../constants/status";
import { type ProjectStage } from "../../services/projectsService";

interface ArticleTimelineHeaderProps {
  stages: ProjectStage[];
  selectedStageId?: string | null;
  onSelectStage?: (stageId: string | null) => void;
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onDeleteStage?: (stageId: string) => void;
  onOpenCreateStage?: () => void;
  onReorderStages?: (stages: { id: string; order: number }[]) => void;
}

interface StepperNodeProps {
  stage: ProjectStage;
  isSelected: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  isLocked: boolean;
  isGatekeeper: boolean;
  onClick: () => void;
}

const SortableStepperNode: React.FC<StepperNodeProps> = ({
  stage,
  isSelected,
  isCompleted,
  isInProgress,
  isLocked,
  isGatekeeper,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id, disabled: isGatekeeper });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Ícone e cores semânticas do nó
  let nodeBg = "grey.800";
  let nodeBorder = "grey.600";
  let nodeColor = "grey.400";
  let icon = <Typography variant="caption" sx={{ fontWeight: 800 }}>{stage.order}</Typography>;

  if (isCompleted) {
    nodeBg = "success.dark";
    nodeBorder = "success.main";
    nodeColor = "#fff";
    icon = <CheckCircleIcon sx={{ fontSize: 18 }} />;
  } else if (isInProgress) {
    nodeBg = "primary.dark";
    nodeBorder = "primary.main";
    nodeColor = "#fff";
    icon = <PlayArrowIcon sx={{ fontSize: 18 }} />;
  } else if (isGatekeeper) {
    if (isLocked) {
      nodeBg = "rgba(255, 152, 0, 0.15)";
      nodeBorder = "warning.main";
      nodeColor = "warning.main";
      icon = <LockIcon sx={{ fontSize: 16 }} />;
    } else {
      nodeBg = "secondary.dark";
      nodeBorder = "secondary.main";
      nodeColor = "#fff";
      icon = <FlagIcon sx={{ fontSize: 16 }} />;
    }
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        position: "relative",
        zIndex: isSelected ? 2 : 1,
        transition: "transform 0.15s ease",
        "&:hover": {
          transform: "scale(1.08)",
        },
      }}
    >
      {/* CÍRCULO DO NÓ DA ETAPA */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          bgcolor: nodeBg,
          border: "2px solid",
          borderColor: isSelected ? "common.white" : nodeBorder,
          boxShadow: isSelected
            ? "0 0 0 4px rgba(25, 118, 210, 0.4), 0 4px 12px rgba(0,0,0,0.5)"
            : isInProgress
            ? "0 0 10px rgba(25, 118, 210, 0.5)"
            : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: nodeColor,
          mb: 0.8,
        }}
      >
        {icon}
      </Box>

      {/* RÓTULO RESUMIDO */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: isSelected || isInProgress ? 700 : 500,
          color: isSelected
            ? "primary.light"
            : isCompleted
            ? "success.light"
            : isInProgress
            ? "text.primary"
            : "text.secondary",
          fontSize: "0.72rem",
          textAlign: "center",
          maxWidth: 110,
          lineHeight: 1.2,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        title={stage.title}
      >
        {stage.order}. {stage.title.replace(/ \(Gatekeeper \d+\)/, "")}
      </Typography>

      {/* ALÇA DE DRAG E DROP PARA ETAPAS CUSTOMIZADAS */}
      {!isGatekeeper && (
        <Box
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          sx={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            color: "text.disabled",
            mt: 0.2,
            "&:hover": { color: "primary.main" },
          }}
          title="Arraste para reordenar esta etapa"
        >
          <DragIndicatorIcon sx={{ fontSize: 13 }} />
        </Box>
      )}
    </Box>
  );
};

export const ArticleTimelineHeader: React.FC<ArticleTimelineHeaderProps> = ({
  stages,
  selectedStageId: externalSelectedStageId,
  onSelectStage,
  onUpdateStageStatus,
  onDeleteStage,
  onOpenCreateStage,
  onReorderStages,
}) => {
  const [viewMode, setViewMode] = useState<"FLOW" | "TIMELINE">("FLOW");
  const [internalSelectedStageId, setInternalSelectedStageId] = useState<string | null>(null);

  if (!stages || stages.length === 0) return null;

  const activeSelectedStageId =
    externalSelectedStageId !== undefined
      ? externalSelectedStageId
      : internalSelectedStageId || stages.find((s) => s.status === StageStatus.IN_PROGRESS)?.id || stages[0].id;

  const handleStageClick = (stageId: string) => {
    if (externalSelectedStageId === undefined) {
      setInternalSelectedStageId(stageId);
    }
    if (onSelectStage) {
      onSelectStage(stageId === activeSelectedStageId ? null : stageId);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const customStages = stages.filter((s) => !s.isGatekeeper);
  const gatekeeperStages = stages.filter((s) => s.isGatekeeper);

  const totalStages = stages.length;
  const completedStages = stages.filter((s) => s.status === StageStatus.COMPLETED).length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  const writingStagesCompleted = customStages.every((s) => s.status === StageStatus.COMPLETED);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = customStages.findIndex((s) => s.id === active.id);
    const newIndex = customStages.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedCustom = arrayMove(customStages, oldIndex, newIndex);
      if (onReorderStages) {
        onReorderStages(reorderedCustom.map((s, idx) => ({ id: s.id, order: idx + 1 })));
      }
    }
  };

  const formatDateShort = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Etapa atualmente selecionada para o painel de detalhes (Master-Detail)
  const selectedStage = stages.find((s) => s.id === activeSelectedStageId) || stages[0];
  const stageTasks = selectedStage.tasks || [];
  const completedStageTasks = stageTasks.filter((t: any) => t.status === "COMPLETED" || t.status === "DONE").length;
  const stageTaskPercent = stageTasks.length > 0 ? Math.round((completedStageTasks / stageTasks.length) * 100) : 0;
  const isSelectedStageCompleted = selectedStage.status === StageStatus.COMPLETED;
  const isSelectedStageGatekeeper = selectedStage.isGatekeeper;
  const isSelectedStageLocked = isSelectedStageGatekeeper && !writingStagesCompleted && !isSelectedStageCompleted;

  return (
    <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 2, boxShadow: 1, bgcolor: "background.paper" }}>
      <CardContent sx={{ p: 2, pb: "16px !important" }}>
        {/* CABEÇALHO DO PAINEL DE LINHA DO TEMPO */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {viewMode === "FLOW" ? "Fluxo Sequencial & Governança" : "Cronograma Temporal de Execução"}
            </Typography>
            <Chip
              label={`${completedStages}/${totalStages} Concluídas (${progressPercent}%)`}
              size="small"
              color={progressPercent === 100 ? "success" : "primary"}
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }}
            />
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {/* TOGGLE FLUXO VS TIMELINE */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, next) => next && setViewMode(next)}
              size="small"
              color="primary"
              sx={{ height: 28 }}
            >
              <ToggleButton value="FLOW" sx={{ fontWeight: 700, gap: 0.5, px: 1.2, fontSize: "0.75rem" }}>
                <ViewWeekIcon sx={{ fontSize: 15 }} /> Fluxo
              </ToggleButton>
              <ToggleButton value="TIMELINE" sx={{ fontWeight: 700, gap: 0.5, px: 1.2, fontSize: "0.75rem" }}>
                <TimelineIcon sx={{ fontSize: 15 }} /> Timeline
              </ToggleButton>
            </ToggleButtonGroup>

            {onOpenCreateStage && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={onOpenCreateStage}
                sx={{ fontWeight: 700, whiteSpace: "nowrap", height: 28, fontSize: "0.75rem" }}
              >
                + Nova Etapa
              </Button>
            )}
          </Stack>
        </Box>

        {/* MODALIDADE 1: VISÃO DE FLUXO (STEPPER HORIZONTAL COMPACTO) */}
        {viewMode === "FLOW" && (
          <Box>
            {/* STEPPER RIBBON DE 1 LINHA DE ALTURA */}
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                pt: 1,
                pb: 1.5,
                px: 1,
                overflowX: "auto",
                "&::-webkit-scrollbar": { height: 4 },
                "&::-webkit-scrollbar-thumb": {
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.15)",
                },
              }}
            >
              {/* LINHA CONECTORA HORIZONTAL DE FUNDO */}
              <Box
                sx={{
                  position: "absolute",
                  top: 28,
                  left: 40,
                  right: 40,
                  height: 3,
                  bgcolor: "divider",
                  zIndex: 0,
                  borderRadius: 1.5,
                }}
              />

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={customStages.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
                  {customStages.map((stage) => {
                    const isCompleted = stage.status === StageStatus.COMPLETED;
                    const isInProgress = stage.status === StageStatus.IN_PROGRESS;
                    const isSelected = stage.id === activeSelectedStageId;

                    return (
                      <SortableStepperNode
                        key={stage.id}
                        stage={stage}
                        isSelected={isSelected}
                        isCompleted={isCompleted}
                        isInProgress={isInProgress}
                        isLocked={false}
                        isGatekeeper={false}
                        onClick={() => handleStageClick(stage.id)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>

              {/* GATEKEEPERS FIXOS NO FINAL */}
              {gatekeeperStages.map((stage) => {
                const isCompleted = stage.status === StageStatus.COMPLETED;
                const isInProgress = stage.status === StageStatus.IN_PROGRESS;
                const isSelected = stage.id === activeSelectedStageId;
                const isLocked = !writingStagesCompleted && !isCompleted;

                return (
                  <SortableStepperNode
                    key={stage.id}
                    stage={stage}
                    isSelected={isSelected}
                    isCompleted={isCompleted}
                    isInProgress={isInProgress}
                    isLocked={isLocked}
                    isGatekeeper={true}
                    onClick={() => handleStageClick(stage.id)}
                  />
                );
              })}
            </Box>

            {/* PAINEL MASTER-DETAIL: DETALHES DA ETAPA SELECIONADA */}
            {selectedStage && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.8,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isSelectedStageCompleted
                    ? "success.main"
                    : isSelectedStageLocked
                    ? "warning.main"
                    : "primary.main",
                  bgcolor: isSelectedStageCompleted
                    ? "rgba(46, 125, 50, 0.08)"
                    : isSelectedStageLocked
                    ? "rgba(237, 108, 2, 0.08)"
                    : "rgba(25, 118, 210, 0.08)",
                  transition: "all 0.2s ease",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                      Etapa {selectedStage.order}: {selectedStage.title}
                    </Typography>
                    {isSelectedStageCompleted && (
                      <Chip label="✓ Concluída" color="success" size="small" sx={{ fontWeight: 700, height: 20 }} />
                    )}
                    {selectedStage.status === StageStatus.IN_PROGRESS && (
                      <Chip label="▲ Em Andamento" color="primary" size="small" sx={{ fontWeight: 700, height: 20 }} />
                    )}
                    {isSelectedStageLocked && (
                      <Chip
                        icon={<LockIcon sx={{ fontSize: 13 }} />}
                        label="🔒 Bloqueada (Gatekeeper)"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 700, height: 20 }}
                      />
                    )}
                  </Stack>

                  {/* DATAS DA ETAPA */}
                  {(selectedStage.plannedStartAt || selectedStage.plannedEndAt || selectedStage.plannedCompletionDate) && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
                      <EventIcon sx={{ fontSize: 14 }} /> Prazo:{" "}
                      {formatDateShort(selectedStage.plannedStartAt || selectedStage.createdAt)} →{" "}
                      {formatDateShort(selectedStage.plannedEndAt || selectedStage.plannedCompletionDate)}
                    </Typography>
                  )}
                </Box>

                {/* PROGRESSO DE TAREFAS DA ETAPA */}
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      📋 Progresso de Tarefas: <strong>{completedStageTasks} de {stageTasks.length} concluídas</strong> ({stageTaskPercent}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stageTaskPercent}
                    color={isSelectedStageCompleted ? "success" : "primary"}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>

                {/* AÇÕES DA ETAPA */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, pt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {selectedStage.description || "Sem descrição adicional definida."}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    {onUpdateStageStatus && !isSelectedStageCompleted && !isSelectedStageLocked && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon sx={{ fontSize: 15 }} />}
                        onClick={() => onUpdateStageStatus(selectedStage.id, StageStatus.COMPLETED)}
                        sx={{ fontSize: "0.72rem", py: 0.2, height: 26, fontWeight: 700 }}
                      >
                        Concluir Etapa
                      </Button>
                    )}

                    {onDeleteStage && !isSelectedStageGatekeeper && (
                      <Tooltip
                        title={
                          stageTasks.length > 0
                            ? `Esta etapa possui ${stageTasks.length} tarefa(s) associada(s) e não pode ser excluída.`
                            : "Excluir etapa customizada"
                        }
                      >
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={stageTasks.length > 0}
                            onClick={() => onDeleteStage(selectedStage.id)}
                            startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                            sx={{ fontSize: "0.72rem", py: 0.2, height: 26, fontWeight: 700 }}
                          >
                            Excluir
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* MODALIDADE 2: VISÃO DE TIMELINE TEMPORAL (GANTT HORIZONTAL ENXUTO) */}
        {viewMode === "TIMELINE" && (
          <Box sx={{ pt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5, display: "block" }}>
              📅 Distribuição Temporal das Etapas do Artigo:
            </Typography>

            <Stack spacing={1}>
              {stages.map((stage) => {
                const isCompleted = stage.status === StageStatus.COMPLETED;
                const isInProgress = stage.status === StageStatus.IN_PROGRESS;
                const isGatekeeper = stage.isGatekeeper;
                const isLocked = isGatekeeper && !writingStagesCompleted && !isCompleted;

                const startDateStr = formatDateShort(stage.plannedStartAt || stage.createdAt);
                const endDateStr = formatDateShort(stage.plannedEndAt || stage.plannedCompletionDate);

                return (
                  <Box
                    key={stage.id}
                    sx={{
                      p: 1.2,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isCompleted
                        ? "success.light"
                        : isInProgress
                        ? "primary.light"
                        : isLocked
                        ? "grey.700"
                        : "divider",
                      bgcolor: isCompleted
                        ? "rgba(46, 125, 50, 0.06)"
                        : isInProgress
                        ? "rgba(25, 118, 210, 0.06)"
                        : "background.paper",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 200 }}>
                      <Chip
                        label={`E${stage.order}`}
                        size="small"
                        color={isGatekeeper ? "warning" : "default"}
                        sx={{ fontWeight: 800, height: 20, fontSize: "0.7rem" }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.8rem" }} noWrap title={stage.title}>
                        {stage.title}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 150, maxWidth: 350 }}>
                      <LinearProgress
                        variant="determinate"
                        value={isCompleted ? 100 : isInProgress ? 50 : 0}
                        color={isCompleted ? "success" : isInProgress ? "primary" : "inherit"}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: "0.72rem" }}>
                      {startDateStr || "Início"} → {endDateStr || "Fim previsto"}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
