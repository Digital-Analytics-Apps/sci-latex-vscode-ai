import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlagIcon from "@mui/icons-material/Flag";
import LockIcon from "@mui/icons-material/Lock";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TimelineIcon from "@mui/icons-material/Timeline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { StageStatus, TaskStatus } from "../../constants/status";
import { type ProjectStage } from "../../services/projectsService";
import { StandardModal } from "./StandardModal";

interface ArticleTimelineHeaderProps {
  stages: ProjectStage[];
  selectedStageId?: string | null;
  onSelectStage?: (stageId: string | null) => void;
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
  onDeleteStage?: (stageId: string) => void;
  onOpenCreateStage?: () => void;
  onOpenSettings?: () => void;
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

const StepperNode: React.FC<StepperNodeProps> = ({
  stage,
  isSelected,
  isCompleted,
  isInProgress,
  isLocked,
  isGatekeeper,
  onClick,
}) => {
  // Ícone e cores semânticas do nó
  let nodeBg = "grey.800";
  let nodeBorder = "grey.600";
  let nodeColor = "grey.400";
  let icon = (
    <Typography variant="caption" sx={{ fontWeight: 800 }}>
      {stage.order}
    </Typography>
  );

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
    </Box>
  );
};

export const ArticleTimelineHeader: React.FC<ArticleTimelineHeaderProps> = ({
  stages,
  selectedStageId: externalSelectedStageId,
  onSelectStage,
}) => {
  const [internalSelectedStageId, setInternalSelectedStageId] = useState<
    string | null
  >(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Controle dos Accordions por Etapa no Modal
  const [expandedStageIds, setExpandedStageIds] = useState<
    Record<string, boolean>
  >({});

  if (!stages || stages.length === 0) return null;

  const activeSelectedStageId =
    externalSelectedStageId !== undefined
      ? externalSelectedStageId
      : internalSelectedStageId ||
        stages.find((s) => s.status === StageStatus.IN_PROGRESS)?.id ||
        stages[0].id;

  const handleStageClick = (stageId: string) => {
    if (externalSelectedStageId === undefined) {
      setInternalSelectedStageId(stageId);
    }
    if (onSelectStage) {
      onSelectStage(stageId === activeSelectedStageId ? null : stageId);
    }
  };

  const toggleExpandStage = (stageId: string) => {
    setExpandedStageIds((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  const customStages = stages.filter((s) => !s.isGatekeeper);
  const gatekeeperStages = stages.filter((s) => s.isGatekeeper);

  const totalStages = stages.length;
  const completedStages = stages.filter(
    (s) => s.status === StageStatus.COMPLETED,
  ).length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  const writingStagesCompleted = customStages.every(
    (s) => s.status === StageStatus.COMPLETED,
  );

  const formatDateShort = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 2.5,
          borderRadius: 2,
          boxShadow: 1,
          bgcolor: "background.paper",
        }}
      >
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
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, fontSize: "0.95rem" }}
              >
                Fluxo Sequencial & Governança
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
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<TimelineIcon sx={{ fontSize: 16 }} />}
                onClick={() => setIsTimelineModalOpen(true)}
                sx={{ fontWeight: 700, fontSize: "0.75rem", height: 28 }}
              >
                Timeline Ampla
              </Button>
            </Stack>
          </Box>

          {/* STEPPER RIBBON DE 1 LINHA DE ALTURA (SEM DRAG AND DROP) */}
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

            {customStages.map((stage) => {
              const isCompleted = stage.status === StageStatus.COMPLETED;
              const isInProgress = stage.status === StageStatus.IN_PROGRESS;
              const isSelected = stage.id === activeSelectedStageId;

              return (
                <StepperNode
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

            {/* GATEKEEPERS FIXOS NO FINAL */}
            {gatekeeperStages.map((stage) => {
              const isCompleted = stage.status === StageStatus.COMPLETED;
              const isInProgress = stage.status === StageStatus.IN_PROGRESS;
              const isSelected = stage.id === activeSelectedStageId;
              const isLocked = !writingStagesCompleted && !isCompleted;

              return (
                <StepperNode
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
        </CardContent>
      </Card>

      {/* MODAL DE TIMELINE AMPLA EM TELA CHEIA (FULL-SCREEN EXPERIENCE) */}
      <StandardModal
        open={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        title="Visão Ampla do Cronograma & Timeline do Projeto"
        subtitle="Cronograma detalhado por etapa com inspeção de tarefas vinculadas e validação de prazos"
        icon={<TimelineIcon color="primary" sx={{ fontSize: 26 }} />}
        size="xl"
        width="96vw"
        height="90vh"
        hideFooter={false}
        showConfirm={false}
        cancelText="Fechar"
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* HEADER RESUMO DE PROGRESSO */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              boxShadow: 1,
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                Progresso Geral do Fluxo Sequencial
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: "primary.main" }}
              >
                {completedStages} de {totalStages} Etapas Concluídas (
                {progressPercent}%)
              </Typography>
            </Box>

            <Box sx={{ width: 280 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                color={progressPercent === 100 ? "success" : "primary"}
                sx={{ height: 10, borderRadius: 5, mb: 0.8 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                align="right"
                sx={{ display: "block", fontWeight: 600 }}
              >
                {totalStages - completedStages} etapa(s) pendente(s) • Clique em
                uma etapa para ver as tarefas
              </Typography>
            </Box>
          </Box>

          {/* LISTA DE ETAPAS EXPANSÍVEIS (ACCORDIONS DE TAREFAS E VALIDAÇÃO DE DATAS) */}
          <Stack spacing={2}>
            {stages.map((stage) => {
              const isCompleted = stage.status === StageStatus.COMPLETED;
              const isInProgress = stage.status === StageStatus.IN_PROGRESS;
              const isGatekeeper = stage.isGatekeeper;
              const isLocked =
                isGatekeeper && !writingStagesCompleted && !isCompleted;
              const isExpanded = Boolean(expandedStageIds[stage.id]);

              const startDateStr = formatDateShort(
                stage.plannedStartAt || stage.createdAt,
              );
              const stageDeadlineStr =
                stage.plannedCompletionDate || stage.plannedEndAt;
              const endDateStr = formatDateShort(stageDeadlineStr);

              const stageTasks: any[] = stage.tasks || [];
              const tasksCount = stageTasks.length;

              let statusColor: "success" | "primary" | "warning" | "default" =
                "default";
              let statusLabel = "Pendente";

              if (isCompleted) {
                statusColor = "success";
                statusLabel = "Concluída";
              } else if (isInProgress) {
                statusColor = "primary";
                statusLabel = "Em Progresso";
              } else if (isLocked) {
                statusColor = "warning";
                statusLabel = "Bloqueada (Gatekeeper)";
              }

              return (
                <Card
                  key={stage.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: isCompleted
                      ? "success.main"
                      : isInProgress
                        ? "primary.main"
                        : isLocked
                          ? "warning.main"
                          : "divider",
                    bgcolor: isCompleted
                      ? "rgba(46, 125, 50, 0.03)"
                      : isInProgress
                        ? "rgba(25, 118, 210, 0.03)"
                        : "background.paper",
                    transition: "all 0.2s ease",
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    {/* CABEÇALHO DA ETAPA (CLICKABLE ACCORDION HEADER) */}
                    <Box
                      onClick={() => toggleExpandStage(stage.id)}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          flex: 1,
                        }}
                      >
                        <Chip
                          label={`Etapa ${stage.order}`}
                          size="small"
                          color={isGatekeeper ? "warning" : "primary"}
                          variant={isGatekeeper ? "filled" : "outlined"}
                          sx={{ fontWeight: 800 }}
                        />
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, fontSize: "1rem" }}
                        >
                          {stage.title}
                        </Typography>
                        <Chip
                          icon={<AssignmentIcon sx={{ fontSize: 14 }} />}
                          label={`${tasksCount} Tarefa(s)`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                        />
                      </Box>

                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center" }}
                      >
                        <Chip
                          label={statusLabel}
                          color={statusColor}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                        />
                        <IconButton size="small" color="primary">
                          <ExpandMoreIcon
                            sx={{
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          />
                        </IconButton>
                      </Stack>
                    </Box>

                    {stage.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1, mb: 1 }}
                      >
                        {stage.description}
                      </Typography>
                    )}

                    {/* DATAS DA ETAPA */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                        pt: 1,
                        mt: 1,
                        borderTop: "1px dashed",
                        borderColor: "divider",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={3}
                        sx={{ alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8,
                          }}
                        >
                          <CalendarMonthIcon
                            sx={{ fontSize: 16, color: "text.secondary" }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600 }}
                          >
                            Início:{" "}
                            <strong>
                              {startDateStr || "Não especificado"}
                            </strong>
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8,
                          }}
                        >
                          <AccessTimeIcon
                            sx={{ fontSize: 16, color: "text.secondary" }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600 }}
                          >
                            Término Previsto (Data Limite):{" "}
                            <strong>{endDateStr || "Não especificado"}</strong>
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ width: 160 }}>
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
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </Box>

                    {/* CONTEÚDO EXPANSÍVEL (ACCORDION): LISTAGEM DE TAREFAS VINCULADAS & VALIDAÇÃO DE DATAS */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box
                        sx={{
                          mt: 2,
                          pt: 2,
                          borderTop: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, mb: 1.5 }}
                        >
                          📋 Tarefas da Etapa {stage.order} ({tasksCount}):
                        </Typography>

                        {tasksCount === 0 ? (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              textAlign: "center",
                              color: "text.secondary",
                            }}
                          >
                            Nenhuma tarefa vinculada diretamente a esta etapa.
                          </Paper>
                        ) : (
                          <Stack spacing={1.2}>
                            {stageTasks.map((task: any) => {
                              const taskDueDateStr = task.dueDate;
                              const formattedTaskDueDate =
                                formatDateShort(taskDueDateStr);

                              // Regra de Validação de Datas: A data da tarefa NÃO pode ser maior que o prazo limite da etapa
                              const isTaskOverdueStageDeadline = Boolean(
                                taskDueDateStr &&
                                stageDeadlineStr &&
                                new Date(taskDueDateStr) >
                                  new Date(stageDeadlineStr),
                              );

                              const assigneeName =
                                typeof task.assignee === "object" &&
                                task.assignee
                                  ? task.assignee.name
                                  : typeof task.assignee === "string"
                                    ? task.assignee
                                    : "Não atribuído";

                              return (
                                <Paper
                                  key={task.id}
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    bgcolor: isTaskOverdueStageDeadline
                                      ? "rgba(211, 47, 47, 0.06)"
                                      : "background.paper",
                                    borderColor: isTaskOverdueStageDeadline
                                      ? "error.main"
                                      : "divider",
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
                                      minWidth: 240,
                                    }}
                                  >
                                    <Avatar
                                      sx={{
                                        width: 24,
                                        height: 24,
                                        fontSize: 11,
                                        bgcolor: "primary.main",
                                      }}
                                    >
                                      {assigneeName?.[0]?.toUpperCase() || "T"}
                                    </Avatar>
                                    <Box>
                                      <Typography
                                        variant="subtitle2"
                                        sx={{
                                          fontWeight: 700,
                                          fontSize: "0.85rem",
                                        }}
                                      >
                                        {task.title}
                                      </Typography>
                                      {task.branchName && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontFamily: "monospace" }}
                                        >
                                          🌿 {task.branchName} • Autor:{" "}
                                          {assigneeName}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>

                                  <Stack
                                    direction="row"
                                    spacing={1.5}
                                    sx={{ alignItems: "center" }}
                                  >
                                    {/* SE EXCEDER A DATA LIMITE DA ETAPA -> EXIBE ALERTA VERMELHO */}
                                    {isTaskOverdueStageDeadline ? (
                                      <Tooltip
                                        title={`A data limite da tarefa (${formattedTaskDueDate}) ultrapassa o prazo final da etapa (${endDateStr}). Ajuste o prazo da tarefa.`}
                                      >
                                        <Chip
                                          icon={
                                            <WarningAmberIcon
                                              sx={{ fontSize: 14 }}
                                            />
                                          }
                                          label={`⚠️ Excede o limite da etapa (${endDateStr})`}
                                          color="error"
                                          size="small"
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: "0.72rem",
                                          }}
                                        />
                                      </Tooltip>
                                    ) : (
                                      <Chip
                                        label={`📅 Vencimento: ${formattedTaskDueDate || "Sem prazo"}`}
                                        size="small"
                                        variant="outlined"
                                        color={
                                          task.status === TaskStatus.MERGED
                                            ? "success"
                                            : "default"
                                        }
                                        sx={{
                                          fontWeight: 600,
                                          fontSize: "0.72rem",
                                        }}
                                      />
                                    )}

                                    <Chip
                                      label={
                                        task.status === TaskStatus.MERGED
                                          ? "Concluída"
                                          : task.status ===
                                              TaskStatus.IN_PROGRESS
                                            ? "Em Andamento"
                                            : "Pendente"
                                      }
                                      size="small"
                                      color={
                                        task.status === TaskStatus.MERGED
                                          ? "success"
                                          : "default"
                                      }
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: "0.7rem",
                                      }}
                                    />
                                  </Stack>
                                </Paper>
                              );
                            })}
                          </Stack>
                        )}
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>
      </StandardModal>
    </>
  );
};
