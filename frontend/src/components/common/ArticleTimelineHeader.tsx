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
import TimelineIcon from "@mui/icons-material/Timeline";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
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
import { GatekeeperLockBadge } from "./GatekeeperLockBadge";

interface ArticleTimelineHeaderProps {
  stages: ProjectStage[];
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onDeleteStage?: (stageId: string) => void;
  onOpenCreateStage?: () => void;
  onReorderStages?: (stages: { id: string; order: number }[]) => void;
}

interface SortableStageCardProps {
  stage: ProjectStage;
  isCompleted: boolean;
  borderColor: string;
  bgcolor: string;
  chipLabel: string;
  chipColor: "success" | "primary" | "default";
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onDeleteStage?: (stageId: string) => void;
}

const SortableStageCard = ({
  stage,
  isCompleted,
  borderColor,
  bgcolor,
  chipLabel,
  chipColor,
  onUpdateStageStatus,
  onDeleteStage,
}: SortableStageCardProps) => {
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

  const formattedDate =
    stage.plannedCompletionDate || stage.plannedEndAt
      ? new Date(
          (stage.plannedCompletionDate || stage.plannedEndAt) as string,
        ).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        minWidth: 220,
        maxWidth: 260,
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor,
        bgcolor,
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
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
            title="Arraste para mover esta etapa"
          >
            <DragIndicatorIcon fontSize="small" />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: "bold" }}
          >
            Etapa {stage.order}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Chip
            size="small"
            label={chipLabel}
            color={chipColor}
            variant={isCompleted ? "filled" : "outlined"}
          />
          {onDeleteStage && (
            <Tooltip
              title={
                hasTasks
                  ? `Esta etapa possui ${tasksCount} tarefa(s) associada(s) e não pode ser excluída.`
                  : "Excluir etapa customizada"
              }
            >
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={hasTasks}
                  onClick={() => onDeleteStage(stage.id)}
                  sx={{ p: 0.2 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Box>

      <Typography
        variant="subtitle2"
        noWrap
        title={stage.title}
        sx={{ fontWeight: "bold", mb: 0.5 }}
      >
        {stage.title}
      </Typography>

      {formattedDate && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: 0.5,
          }}
        >
          <EventIcon sx={{ fontSize: 13 }} /> Previsto: {formattedDate}
        </Typography>
      )}

      {hasTasks && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.7rem", display: "block" }}
        >
          📋 {tasksCount} tarefa(s) associada(s)
        </Typography>
      )}

      {onUpdateStageStatus && !isCompleted && (
        <Box sx={{ mt: 1.5, display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => onUpdateStageStatus(stage.id, StageStatus.COMPLETED)}
            sx={{ fontSize: "0.7rem", py: 0.2 }}
          >
            Concluir
          </Button>
        </Box>
      )}
    </Box>
  );
};

export const ArticleTimelineHeader: React.FC<ArticleTimelineHeaderProps> = ({
  stages,
  onUpdateStageStatus,
  onDeleteStage,
  onOpenCreateStage,
  onReorderStages,
}) => {
  const [viewMode, setViewMode] = useState<"FLOW" | "TIMELINE">("FLOW");

  if (!stages || stages.length === 0) return null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const customStages = stages.filter((s) => !s.isGatekeeper);
  const gatekeeperStages = stages.filter((s) => s.isGatekeeper);

  const totalStages = stages.length;
  const completedStages = stages.filter(
    (s) => s.status === StageStatus.COMPLETED,
  ).length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  // Verifica se todas as etapas de escrita anteriores estão concluídas para habilitar os gatekeepers
  const writingStagesCompleted = customStages.every(
    (s) => s.status === StageStatus.COMPLETED,
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

  const formatDateShort = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
      <CardContent sx={{ pb: "16px !important" }}>
        {/* CABEÇALHO DO PAINEL COM TOGGLE DE VISÃO (FLUXO vs TIMELINE) */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {viewMode === "FLOW"
                ? "Fluxo Rastreável de Escrita e Governança"
                : "Linha do Tempo Temporal & Cronograma do Artigo"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Progresso do Artigo: {completedStages} de {totalStages} etapas
              concluídas ({progressPercent}%)
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            {/* TOGGLE FLUXO VS TIMELINE */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, next) => next && setViewMode(next)}
              size="small"
              color="primary"
            >
              <ToggleButton
                value="FLOW"
                sx={{ fontWeight: 700, gap: 0.5, px: 1.5 }}
              >
                <ViewWeekIcon fontSize="small" /> Fluxo
              </ToggleButton>
              <ToggleButton
                value="TIMELINE"
                sx={{ fontWeight: 700, gap: 0.5, px: 1.5 }}
              >
                <TimelineIcon fontSize="small" /> Timeline
              </ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ width: 120 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {onOpenCreateStage && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={onOpenCreateStage}
                sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
              >
                + Nova Etapa
              </Button>
            )}
          </Stack>
        </Box>

        {/* MODALIDADE 1: VISÃO DE FLUXO (KANBAN / CARDS REORDENÁVEIS) */}
        {viewMode === "FLOW" && (
          <>
            {/* CARDS DAS ETAPAS DE ESCRITA E GATEKEEPERS */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                overflowX: "auto",
                pb: 1,
                pt: 0.5,
                "&::-webkit-scrollbar": { height: 6 },
                "&::-webkit-scrollbar-thumb": {
                  borderRadius: 3,
                  backgroundColor: "rgba(0,0,0,0.2)",
                },
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={customStages.map((s) => s.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {customStages.map((stage) => {
                    const isCompleted = stage.status === StageStatus.COMPLETED;
                    const isInProgress =
                      stage.status === StageStatus.IN_PROGRESS;

                    let borderColor = "divider";
                    if (isCompleted) {
                      borderColor = "success.main";
                    } else if (isInProgress) {
                      borderColor = "primary.main";
                    }

                    let bgcolor = "background.paper";
                    if (isCompleted) {
                      bgcolor = "success.50";
                    } else if (isInProgress) {
                      bgcolor = "action.hover";
                    }

                    let chipLabel = "Pendente";
                    if (isCompleted) {
                      chipLabel = "Concluída";
                    } else if (isInProgress) {
                      chipLabel = "Em Andamento";
                    }

                    let chipColor: "success" | "primary" | "default" =
                      "default";
                    if (isCompleted) {
                      chipColor = "success";
                    } else if (isInProgress) {
                      chipColor = "primary";
                    }

                    return (
                      <SortableStageCard
                        key={stage.id}
                        stage={stage}
                        isCompleted={isCompleted}
                        borderColor={borderColor}
                        bgcolor={bgcolor}
                        chipLabel={chipLabel}
                        chipColor={chipColor}
                        onUpdateStageStatus={onUpdateStageStatus}
                        onDeleteStage={onDeleteStage}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>

              {/* GATEKEEPERS FIXOS NO FINAL (NIT E CONGRESSO) */}
              {gatekeeperStages.map((stage) => {
                const formattedGatekeeperDate = formatDateShort(
                  stage.plannedEndAt || stage.plannedCompletionDate,
                );

                return (
                  <Box
                    key={stage.id}
                    sx={{
                      minWidth: 220,
                      maxWidth: 260,
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: "bold" }}
                      >
                        Etapa {stage.order} (Fixa)
                      </Typography>

                      <GatekeeperLockBadge
                        isGatekeeper={stage.isGatekeeper}
                        gatekeeperType={stage.gatekeeperType}
                        status={stage.status}
                        title={stage.title}
                      />
                    </Box>

                    <Typography
                      variant="subtitle2"
                      noWrap
                      title={stage.title}
                      sx={{ fontWeight: "bold", mb: 0.5 }}
                    >
                      {stage.title}
                    </Typography>

                    {formattedGatekeeperDate && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <EventIcon sx={{ fontSize: 13 }} /> Data Limite:{" "}
                        {formattedGatekeeperDate}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </>
        )}

        {/* MODALIDADE 2: VISÃO DE TIMELINE TEMPORAL (GANTT & CRONOGRAMA) */}
        {viewMode === "TIMELINE" && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                mb: 2,
                display: "block",
              }}
            >
              📅 Cronograma Temporal de Execução por Etapa (ProjectStage):
            </Typography>

            <Stack spacing={2}>
              {stages.map((stage) => {
                const isCompleted = stage.status === StageStatus.COMPLETED;
                const isInProgress = stage.status === StageStatus.IN_PROGRESS;
                const isGatekeeper = stage.isGatekeeper;
                const isLocked =
                  isGatekeeper && !writingStagesCompleted && !isCompleted;

                const startDateStr = formatDateShort(
                  stage.plannedStartAt || stage.createdAt,
                );
                const endDateStr = formatDateShort(
                  stage.plannedEndAt || stage.plannedCompletionDate,
                );

                return (
                  <Box
                    key={stage.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: isCompleted
                        ? "success.light"
                        : isInProgress
                          ? "primary.light"
                          : isLocked
                            ? "grey.300"
                            : "divider",
                      bgcolor: isCompleted
                        ? "success.50"
                        : isInProgress
                          ? "action.hover"
                          : isLocked
                            ? "action.disabledBackground"
                            : "background.paper",
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Chip
                          label={`Etapa ${stage.order}`}
                          size="small"
                          color={isGatekeeper ? "warning" : "default"}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700 }}
                        >
                          {stage.title}
                        </Typography>
                      </Box>

                      {/* BADGE DE STATUS DA TIMELINE */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {isCompleted && (
                          <Chip
                            icon={<CheckCircleIcon fontSize="small" />}
                            label="✓ Concluída"
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        )}

                        {isInProgress && (
                          <Chip
                            label="▲ Em Andamento (Hoje)"
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        )}

                        {isLocked && (
                          <Chip
                            icon={<LockIcon fontSize="small" />}
                            label="🔒 Bloqueado (Aguardando etapas de escrita)"
                            color="default"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        )}

                        {!isCompleted && !isInProgress && !isLocked && (
                          <Chip
                            label="Pendente"
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* BARRA TEMPORAL GANTT */}
                    <Box sx={{ mt: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Início: {startDateStr || "Não definido"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Término Previsto: {endDateStr || "Não definido"}
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={isCompleted ? 100 : isInProgress ? 50 : 0}
                        color={
                          isCompleted
                            ? "success"
                            : isInProgress
                              ? "primary"
                              : "inherit"
                        }
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: isLocked ? "grey.300" : "grey.200",
                        }}
                      />
                    </Box>
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
