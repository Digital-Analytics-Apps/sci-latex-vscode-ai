import CheckIcon from "@mui/icons-material/Check";
import FlagIcon from "@mui/icons-material/Flag";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import WarningIcon from "@mui/icons-material/Warning";
import { Box, Tooltip, Typography } from "@mui/material";
import React from "react";
import type { ProjectStage } from "../../../../types/stage.types";
import type { TaskItem } from "../../../../types/task.types";
import {
  calculateBarPosition,
  calculateStageProgress,
  calculateTimeElapsedPercent,
  type GanttDateColumn,
  getAssigneeDisplayName,
  getColumnBgColor,
  getDaysDifference,
  getTaskProgressText,
  getTaskTooltipText,
  isStageStarted,
  isTaskCompleted,
  isTaskStarted,
} from "./ganttUtils";

interface GanttChartGridProps {
  stages: ProjectStage[];
  tasks: TaskItem[];
  columns: GanttDateColumn[];
  rangeStart: Date;
  rangeEnd: Date;
  projectCreatedAt?: string | null;
  targetConferenceDate?: string | null;
  targetConferenceName?: string | null;
  onSelectEntity: (stage?: ProjectStage | null, task?: TaskItem | null) => void;
  selectedEntityId?: string | null;
}

export const GanttChartGrid: React.FC<GanttChartGridProps> = ({
  stages,
  tasks,
  columns,
  rangeStart,
  rangeEnd,
  projectCreatedAt,
  targetConferenceDate,
  targetConferenceName,
  onSelectEntity,
  selectedEntityId,
}) => {
  const totalDaysInRange = Math.max(
    1,
    getDaysDifference(rangeStart, rangeEnd) + 1,
  );

  // 1. Posições dos marcos verticais: Início do Artigo, Hoje e Submissão ao Congresso
  const creationPosition = projectCreatedAt
    ? calculateBarPosition(
        projectCreatedAt,
        projectCreatedAt,
        rangeStart,
        totalDaysInRange,
      ).leftPercent
    : null;

  const todayPosition = calculateBarPosition(
    new Date().toISOString(),
    new Date().toISOString(),
    rangeStart,
    totalDaysInRange,
  ).leftPercent;

  const conferencePosition = targetConferenceDate
    ? calculateBarPosition(
        targetConferenceDate,
        targetConferenceDate,
        rangeStart,
        totalDaysInRange,
      ).leftPercent
    : null;

  const conferenceTooltipTitle = targetConferenceName
    ? `Deadline de Submissão: ${targetConferenceName}`
    : "Deadline de Submissão";

  return (
    <Box
      sx={{
        flexGrow: 1,
        overflowX: "auto",
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      {/* 1. RÉGUA DE DATAS (CABEÇALHO DA TIMELINE) */}
      <Box
        sx={{
          height: 44,
          display: "flex",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
          minWidth: columns.length * 64,
          position: "sticky",
          top: 0,
          zIndex: 3,
        }}
      >
        {columns.map((col, idx) => (
          <Box
            key={idx}
            sx={{
              flex: 1,
              minWidth: 64,
              px: 0.5,
              py: 0.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: getColumnBgColor(col.isToday, col.isWeekend),
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: col.isToday ? 800 : 700,
                fontSize: "0.72rem",
                color: col.isToday ? "primary.main" : "text.primary",
              }}
            >
              {col.label}
            </Typography>
            {col.subLabel && (
              <Typography
                variant="caption"
                sx={{ fontSize: "0.65rem", color: "text.secondary" }}
              >
                {col.subLabel}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* 2. ÁREA DE BARRAS DO GANTT E MARCOS TEMPORAIS */}
      <Box sx={{ position: "relative", minWidth: columns.length * 64 }}>
        {/* MARCO VERTICAL 1: INÍCIO / CRIAÇÃO DO ARTIGO */}
        {creationPosition !== null &&
          creationPosition >= 0 &&
          creationPosition <= 100 && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${creationPosition}%`,
                width: 2,
                bgcolor: "success.main",
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <Tooltip
                title={`Data de Criação do Artigo: ${projectCreatedAt ? projectCreatedAt.split("T")[0] : ""}`}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 4,
                    left: -32,
                    bgcolor: "success.main",
                    color: "#fff",
                    px: 0.8,
                    py: 0.1,
                    borderRadius: 1,
                    fontWeight: 800,
                    fontSize: "0.62rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                  }}
                >
                  <PlayArrowIcon sx={{ fontSize: 10 }} /> Início Artigo
                </Box>
              </Tooltip>
            </Box>
          )}

        {/* MARCO VERTICAL 2: "HOJE" */}
        {todayPosition >= 0 && todayPosition <= 100 && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${todayPosition}%`,
              width: 2,
              bgcolor: "primary.main",
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                top: 4,
                left: -20,
                bgcolor: "primary.main",
                color: "#fff",
                px: 0.8,
                py: 0.1,
                borderRadius: 1,
                fontWeight: 800,
                fontSize: "0.62rem",
              }}
            >
              Hoje
            </Typography>
          </Box>
        )}

        {/* MARCO VERTICAL 3: "SUBMISSÃO AO CONGRESSO" */}
        {conferencePosition !== null &&
          conferencePosition >= 0 &&
          conferencePosition <= 100 && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${conferencePosition}%`,
                width: 2,
                borderLeft: "2px dashed",
                borderColor: "error.main",
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <Tooltip title={conferenceTooltipTitle}>
                <Box
                  sx={{
                    position: "absolute",
                    top: 4,
                    left: -35,
                    bgcolor: "error.main",
                    color: "#fff",
                    px: 0.8,
                    py: 0.1,
                    borderRadius: 1,
                    fontWeight: 800,
                    fontSize: "0.62rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                  }}
                >
                  <FlagIcon sx={{ fontSize: 10 }} /> Submissão
                </Box>
              </Tooltip>
            </Box>
          )}

        {/* Mapeamento das Etapas e Sub-tasks em Barras do Gantt */}
        {stages.map((stage) => {
          const stageTasks = tasks.filter((t) => t.stageId === stage.id);
          const stageProgress = calculateStageProgress(stageTasks);
          const isStarted = isStageStarted(stage);

          const stageStartDate =
            stage.plannedStartAt ??
            stage.startedAt ??
            stage.createdAt ??
            projectCreatedAt;
          const stageEndDate =
            stage.plannedEndAt ?? stage.plannedCompletionDate;

          const stagePos = calculateBarPosition(
            stage.plannedStartAt ?? stage.startedAt,
            stageEndDate,
            rangeStart,
            totalDaysInRange,
            stage.createdAt ?? projectCreatedAt,
          );

          const stageTimeElapsedPercent = calculateTimeElapsedPercent(
            stageStartDate,
            stageEndDate,
            isStarted,
          );

          const stageOutlineColor =
            stageProgress === 100
              ? "success.main"
              : !isStarted
                ? "divider"
                : "primary.main";

          const stageTitleText = !isStarted
            ? `${stage.title} (Aguardando início)`
            : `${stage.title} (${stageProgress}% conc. | ${stageTimeElapsedPercent}% tempo)`;

          return (
            <React.Fragment key={stage.id}>
              {/* BARRA DA ETAPA (TASK PRINCIPAL / FEATURE BRANCH) */}
              <Box
                onClick={() => onSelectEntity(stage, null)}
                sx={{
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  position: "relative",
                  px: 1,
                  bgcolor:
                    selectedEntityId === stage.id
                      ? "action.selected"
                      : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                  cursor: "pointer",
                }}
              >
                <Tooltip
                  title={`Etapa Principal: ${stage.title} | Status: ${isStarted ? "Em Andamento" : "Não Iniciada"}`}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      left: `${stagePos.leftPercent}%`,
                      width: `${stagePos.widthPercent}%`,
                      height: 24,
                      borderRadius: 1.5,
                      border: !isStarted ? "1.5px dashed" : "2px solid",
                      borderColor: stageOutlineColor,
                      bgcolor: "background.paper",
                      boxShadow: isStarted
                        ? "0 1px 4px rgba(0,0,0,0.15)"
                        : "none",
                      opacity: !isStarted ? 0.7 : 1,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    {/* Preenchimento Dinâmico do Tempo Decorrido (% Temporal) com RGBA Válido */}
                    {isStarted && (
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${stageTimeElapsedPercent}%`,
                          bgcolor:
                            stageProgress === 100
                              ? "rgba(34, 197, 94, 0.35)"
                              : "rgba(99, 102, 241, 0.3)",
                          borderRight:
                            stageTimeElapsedPercent > 0 &&
                            stageTimeElapsedPercent < 100
                              ? "2px solid"
                              : "none",
                          borderColor: "primary.main",
                        }}
                      />
                    )}
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: !isStarted ? "text.secondary" : "text.primary",
                        fontWeight: isStarted ? 800 : 600,
                        fontSize: "0.72rem",
                        zIndex: 1,
                      }}
                    >
                      {stageTitleText}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>

              {/* BARRAS DAS SUB-TASKS (OUTLINE + PREENCHIMENTO TEMPORAL DECORRIDO) */}
              {stageTasks.map((task) => {
                const isMerged = isTaskCompleted(task);
                const isStarted = isTaskStarted(task);
                const isOverdue = Boolean(
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  !isMerged &&
                  isStarted,
                );

                const startDateStr =
                  task.startDate ?? task.startedAt ?? task.createdAt;
                const dueDateStr = task.dueDate;

                const taskPos = calculateBarPosition(
                  task.startDate ?? task.startedAt,
                  dueDateStr,
                  rangeStart,
                  totalDaysInRange,
                  task.createdAt,
                );

                const taskElapsedPercent = calculateTimeElapsedPercent(
                  startDateStr,
                  dueDateStr,
                  isStarted,
                );
                const fillWidthPercent = isMerged ? 100 : taskElapsedPercent;

                const assigneeName = getAssigneeDisplayName(task.assignee);
                const tooltipText = getTaskTooltipText(
                  task.title,
                  task.dueDate,
                  assigneeName,
                );
                const progressText = getTaskProgressText(
                  isMerged,
                  task.progress,
                );

                // Definições visuais de Cores e Borda Outline (Usando cores válidas do tema)
                const outlineColor = isMerged
                  ? "success.main"
                  : !isStarted
                    ? "divider"
                    : isOverdue
                      ? "error.main"
                      : "primary.main";

                const fillColor = isMerged
                  ? "success.main"
                  : !isStarted
                    ? "transparent"
                    : isOverdue
                      ? "rgba(239, 68, 68, 0.4)"
                      : "rgba(99, 102, 241, 0.35)";

                return (
                  <Box
                    key={task.id}
                    onClick={() => onSelectEntity(null, task)}
                    sx={{
                      height: 38,
                      display: "flex",
                      alignItems: "center",
                      borderBottom: "1px dashed",
                      borderColor: "divider",
                      position: "relative",
                      px: 1,
                      bgcolor:
                        selectedEntityId === task.id
                          ? "action.selected"
                          : "transparent",
                      "&:hover": { bgcolor: "action.hover" },
                      cursor: "pointer",
                    }}
                  >
                    <Tooltip
                      title={
                        isStarted
                          ? `${tooltipText} | Tempo Decorrido: ${taskElapsedPercent}%`
                          : `${task.title} (Não Iniciada)`
                      }
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: `${taskPos.leftPercent}%`,
                          width: `${taskPos.widthPercent}%`,
                          height: 22,
                          borderRadius: 10,
                          border: !isStarted ? "1.5px dashed" : "1.5px solid",
                          borderColor: outlineColor,
                          bgcolor: "background.paper",
                          boxShadow: isStarted
                            ? "0 1px 3px rgba(0,0,0,0.12)"
                            : "none",
                          opacity: !isStarted ? 0.65 : 1,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          px: 1,
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        {/* Preenchimento Gradual Visível apenas se iniciada */}
                        {isStarted && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${fillWidthPercent}%`,
                              bgcolor: fillColor,
                              borderRight:
                                !isMerged &&
                                fillWidthPercent > 0 &&
                                fillWidthPercent < 100
                                  ? "2px solid"
                                  : "none",
                              borderColor: outlineColor,
                              transition: "width 0.3s ease-in-out",
                            }}
                          />
                        )}

                        {/* Conteúdo textual da barra */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            overflow: "hidden",
                            zIndex: 1,
                          }}
                        >
                          {isMerged && (
                            <CheckIcon sx={{ fontSize: 12, color: "#fff" }} />
                          )}
                          {!isMerged && isOverdue && (
                            <WarningIcon
                              sx={{ fontSize: 12, color: "error.main" }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{
                              color: isMerged
                                ? "#fff"
                                : isStarted
                                  ? "text.primary"
                                  : "text.secondary",
                              fontWeight: isStarted ? 700 : 500,
                              fontSize: "0.68rem",
                            }}
                          >
                            {task.title} {!isStarted && "(Não Iniciada)"}
                          </Typography>
                        </Box>

                        {progressText && isStarted && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: isMerged
                                ? "rgba(255,255,255,0.9)"
                                : "text.secondary",
                              fontWeight: 800,
                              fontSize: "0.62rem",
                              ml: 1,
                              flexShrink: 0,
                              zIndex: 1,
                            }}
                          >
                            {progressText}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </Box>
                );
              })}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
};
