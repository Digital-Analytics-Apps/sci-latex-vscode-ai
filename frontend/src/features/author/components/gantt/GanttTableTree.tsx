import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import LaunchIcon from "@mui/icons-material/Launch";
import LockIcon from "@mui/icons-material/Lock";
import MergeIcon from "@mui/icons-material/MergeType";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { UserAvatar } from "../../../../components/common/UserAvatar";
import { TaskStatus } from "../../../../constants/status";
import type { ProjectStage } from "../../../../types/stage.types";
import type { TaskItem } from "../../../../types/task.types";
import {
  calculateStageProgress,
  extractAssigneeUserAndName,
  isTaskCompleted,
} from "./ganttUtils";

interface GanttTableTreeProps {
  stages: ProjectStage[];
  tasks: TaskItem[];
  onSelectEntity: (stage?: ProjectStage | null, task?: TaskItem | null) => void;
  selectedEntityId?: string | null;
  currentUserId?: string;
  provisioningTaskId?: string | null;
  onStartWorkspace?: (task: TaskItem) => void | Promise<void>;
  onClaimTask?: (taskId: string) => void;
}

export const GanttTableTree = ({
  stages,
  tasks,
  onSelectEntity,
  selectedEntityId,
  currentUserId,
  provisioningTaskId,
  onStartWorkspace,
  onClaimTask,
}: GanttTableTreeProps) => {
  const [expandedStageIds, setExpandedStageIds] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    stages.forEach((s) => {
      initial[s.id] = true;
    });
    return initial;
  });

  const toggleExpand = (stageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedStageIds((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  return (
    <Box
      sx={{
        width: { xs: 300, sm: 400, md: 460 },
        flexShrink: 0,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* CABEÇALHO DA TABELA DE ÁRVORE */}
      <Box
        sx={{
          height: 44,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 0.5 }}
        >
          ETAPAS / FEATURE BRANCHES & SUB-TASKS
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.secondary" }}
          >
            RESPONSÁVEL
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.secondary" }}
          >
            AÇÃO / WORKSPACE
          </Typography>
        </Box>
      </Box>

      {/* LISTA HIERÁRQUICA DE ETAPAS E SUB-TASKS */}
      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {stages.map((stage, index) => {
          const isExpanded = expandedStageIds[stage.id] ?? true;
          const stageTasks = tasks.filter((t) => t.stageId === stage.id);
          const stageProgress = calculateStageProgress(stageTasks);
          const isSelected = selectedEntityId === stage.id;
          const hasUnmergedSubtasks = stageTasks.some(
            (t) => t.status !== TaskStatus.MERGED,
          );

          return (
            <React.Fragment key={stage.id}>
              {/* LINHA DE ETAPA (TASK PRINCIPAL / FEATURE BRANCH) */}
              <Box
                onClick={() => onSelectEntity(stage, null)}
                sx={{
                  height: 44,
                  px: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: isSelected ? "action.selected" : "background.paper",
                  "&:hover": { bgcolor: "action.hover" },
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    overflow: "hidden",
                    pr: 1,
                    flex: 1,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => toggleExpand(stage.id, e)}
                    sx={{ p: 0.2 }}
                  >
                    {isExpanded ? (
                      <ExpandMoreIcon fontSize="small" />
                    ) : (
                      <ChevronRightIcon fontSize="small" />
                    )}
                  </IconButton>

                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      color: "primary.main",
                    }}
                  >
                    {index + 1}. {stage.title}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Chip
                    label={`${stageProgress}%`}
                    size="small"
                    color={stageProgress === 100 ? "success" : "primary"}
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800 }}
                  />

                  {/* AÇÃO RÁPIDA DE WORKSPACE NA ETAPA */}
                  {!stage.isGatekeeper &&
                    (hasUnmergedSubtasks ? (
                      <Tooltip title="🔒 Conclua e mescle todas as sub-tarefas desta etapa antes de abrir a workspace da Feature.">
                        <span>
                          <IconButton size="small" disabled sx={{ p: 0.3 }}>
                            <LockIcon
                              sx={{ fontSize: 16, color: "action.disabled" }}
                            />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="🚀 Iniciar Workspace da Feature">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onStartWorkspace) {
                              const featureTask: TaskItem = {
                                id: `stage-${stage.id}`,
                                projectId: stage.projectId,
                                stageId: stage.id,
                                title: `Workspace da Feature: ${stage.title}`,
                                branchName: `feature/stage-${stage.order}`,
                                status: TaskStatus.IN_PROGRESS,
                                dueDate: new Date().toISOString(),
                              };
                              void onStartWorkspace(featureTask);
                            }
                          }}
                          sx={{ p: 0.3 }}
                        >
                          <LaunchIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    ))}
                </Box>
              </Box>

              {/* LINHAS DE SUB-TASKS */}
              {isExpanded &&
                stageTasks.map((task) => {
                  const isTaskSelected = selectedEntityId === task.id;
                  const isMerged = isTaskCompleted(task);
                  const isProvisioning = provisioningTaskId === task.id;
                  const isOccupiedByOther = Boolean(
                    task.isOccupied &&
                    task.occupiedBy &&
                    task.occupiedBy.id !== currentUserId,
                  );
                  const { user, name } = extractAssigneeUserAndName(
                    task.assignee,
                  );

                  return (
                    <Box
                      key={task.id}
                      onClick={() => onSelectEntity(null, task)}
                      sx={{
                        height: 40,
                        pl: 4,
                        pr: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px dashed",
                        borderColor: "divider",
                        bgcolor: isTaskSelected
                          ? "action.selected"
                          : "background.paper",
                        "&:hover": { bgcolor: "action.hover" },
                        cursor: "pointer",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          overflow: "hidden",
                          pr: 1,
                          flex: 1,
                        }}
                      >
                        <SubdirectoryArrowRightIcon
                          sx={{
                            fontSize: 16,
                            color: "text.secondary",
                            flexShrink: 0,
                          }}
                        />

                        {isMerged ? (
                          <CheckCircleIcon
                            sx={{ fontSize: 14, color: "success.main" }}
                          />
                        ) : task.isBlockedByPrevious ? (
                          <Tooltip title="🔒 Aguardando conclusão e merge da sub-tarefa anterior">
                            <LockIcon
                              sx={{ fontSize: 14, color: "warning.main" }}
                            />
                          </Tooltip>
                        ) : isOccupiedByOther ? (
                          <Tooltip
                            title={`🔒 Workspace em uso por ${task.occupiedBy?.name || "outro autor"}`}
                          >
                            <LockIcon
                              sx={{ fontSize: 14, color: "warning.main" }}
                            />
                          </Tooltip>
                        ) : (
                          <MergeIcon
                            sx={{ fontSize: 14, color: "info.main" }}
                          />
                        )}

                        <Typography
                          variant="caption"
                          noWrap
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            color: isMerged ? "text.secondary" : "text.primary",
                            textDecoration: isMerged ? "line-through" : "none",
                          }}
                        >
                          {task.title}
                        </Typography>
                      </Box>

                      {/* RESPONSÁVEL E BOTÃO DE WORKSPACE */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        {/* AVATAR OU BOTÃO ASSINAR */}
                        {user || name ? (
                          <UserAvatar
                            user={user}
                            name={name}
                            size={24}
                            showTooltip
                          />
                        ) : onClaimTask ? (
                          <Tooltip title="Assinar esta tarefa">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClaimTask(task.id);
                              }}
                              sx={{ p: 0.2 }}
                            >
                              <HowToRegIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}

                        {/* AÇÃO RÁPIDA DE WORKSPACE DA SUB-TAREFA */}
                        {isMerged ? (
                          <Tooltip title="Tarefa Concluída e Mesclada">
                            <CheckCircleIcon
                              sx={{ fontSize: 16, color: "success.main" }}
                            />
                          </Tooltip>
                        ) : isProvisioning ? (
                          <Tooltip title="⚡ Provisionando Pod...">
                            <CircularProgress size={14} color="primary" />
                          </Tooltip>
                        ) : task.isBlockedByPrevious ? (
                          <Tooltip title="🔒 Sub-tarefa anterior pendente">
                            <IconButton size="small" disabled sx={{ p: 0.2 }}>
                              <LockIcon
                                sx={{ fontSize: 14, color: "action.disabled" }}
                              />
                            </IconButton>
                          </Tooltip>
                        ) : isOccupiedByOther ? (
                          <Tooltip
                            title={`🔒 Aberto no momento por ${task.occupiedBy?.name}`}
                          >
                            <IconButton size="small" disabled sx={{ p: 0.2 }}>
                              <LockIcon
                                sx={{ fontSize: 14, color: "warning.main" }}
                              />
                            </IconButton>
                          </Tooltip>
                        ) : !task.assignedToId ? (
                          <Tooltip title="✍️ Assine a tarefa primeiro para liberar a abertura do workspace">
                            <span>
                              <IconButton size="small" disabled sx={{ p: 0.2 }}>
                                <LaunchIcon
                                  sx={{
                                    fontSize: 16,
                                    color: "action.disabled",
                                  }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : task.assignedToId !== currentUserId ? (
                          <Tooltip title="🔒 Tarefa atribuída a outro autor">
                            <span>
                              <IconButton size="small" disabled sx={{ p: 0.2 }}>
                                <LockIcon
                                  sx={{
                                    fontSize: 14,
                                    color: "action.disabled",
                                  }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : onStartWorkspace ? (
                          <Tooltip title="🚀 Iniciar Workspace no VS Code">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onStartWorkspace(task);
                              }}
                              sx={{ p: 0.2 }}
                            >
                              <LaunchIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Box>
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
