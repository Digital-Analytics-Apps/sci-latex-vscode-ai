import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MergeIcon from "@mui/icons-material/MergeType";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import { Box, Chip, IconButton, Typography } from "@mui/material";
import React, { useState } from "react";
import { UserAvatar } from "../../../../components/common/UserAvatar";
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
}

export const GanttTableTree: React.FC<GanttTableTreeProps> = ({
  stages,
  tasks,
  onSelectEntity,
  selectedEntityId,
}) => {
  // Estado de nós expandidos (Etapas abertas/fechadas)
  const [expandedStageIds, setExpandedStageIds] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    stages.forEach((s) => {
      initial[s.id] = true; // Por padrão expandidos
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
        width: { xs: 260, sm: 340, md: 380 },
        flexShrink: 0,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        userSelect: "none",
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
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary" }}
        >
          RESPONSÁVEL
        </Typography>
      </Box>

      {/* LISTA HIERÁRQUICA DE ETAPAS E SUB-TASKS */}
      <Box sx={{ overflowY: "auto" }}>
        {stages.map((stage, index) => {
          const isExpanded = expandedStageIds[stage.id] ?? true;
          const stageTasks = tasks.filter((t) => t.stageId === stage.id);
          const stageProgress = calculateStageProgress(stageTasks);
          const isSelected = selectedEntityId === stage.id;

          return (
            <React.Fragment key={stage.id}>
              {/* LINHA DE ETAPA (TASK PRINCIPAL / FEATURE BRANCH) */}
              <Box
                onClick={() => onSelectEntity(stage, null)}
                sx={{
                  height: 42,
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

                <Chip
                  label={`${stageProgress}%`}
                  size="small"
                  color={stageProgress === 100 ? "success" : "primary"}
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800 }}
                />
              </Box>

              {/* LINHAS DE SUB-TASKS (SUB-ISSUES MERGEADAS OU EM ANDAMENTO) */}
              {isExpanded &&
                stageTasks.map((task) => {
                  const isTaskSelected = selectedEntityId === task.id;
                  const isMerged = isTaskCompleted(task);
                  const { user, name } = extractAssigneeUserAndName(
                    task.assignee,
                  );

                  return (
                    <Box
                      key={task.id}
                      onClick={() => onSelectEntity(null, task)}
                      sx={{
                        height: 38,
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

                      <UserAvatar
                        user={user}
                        name={name}
                        size={22}
                        showTooltip
                      />
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
