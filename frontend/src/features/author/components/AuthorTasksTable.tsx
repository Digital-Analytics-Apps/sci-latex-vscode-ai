import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { GenericDataGrid } from "../../../components/common/GenericDataGrid";
import {
  TableHeaderFilterToolbar,
  type TableSelectOption,
} from "../../../components/common/TableFilters";
import { TaskStatus } from "../../../constants/status";
import { useTableFilters } from "../../../hooks/useTableFilters";
import {
  useClaimTaskMutation,
  useTasksQuery,
  useUnclaimTaskMutation,
} from "../../../hooks/useTaskQueries";
import { projectsService } from "../../../services/projectsService";
import { colors } from "../../../theme/tokens";
import type { TaskItem } from "../../../types/task.types";
import {
  TaskActionCell,
  TaskAssigneeCell,
  TaskDueDateCell,
  TaskStatusChip,
  TaskTitleBranchCell,
} from "./TaskDataGridCells";

export interface AuthorTasksTableProps {
  projectId: string;
  provisioningTaskId: string | null;
  currentUserId?: string;
  onStartWorkspace: (task: TaskItem) => void | Promise<void>;
  onOpenCreateTask?: (stageId?: string) => void;
}

export interface AuthorTaskFilters {
  search: string;
  status: string;
}

const DEFAULT_AUTHOR_TASK_FILTERS: AuthorTaskFilters = {
  search: "",
  status: "ALL",
};

const TASK_STATUS_OPTIONS: TableSelectOption[] = [
  { value: "ALL", label: "Todos os Status" },
  { value: TaskStatus.NOT_STARTED, label: "Não Iniciada" },
  { value: TaskStatus.IN_PROGRESS, label: "Em Progresso" },
  { value: TaskStatus.UNDER_REVIEW, label: "Em Avaliação" },
  { value: TaskStatus.CHANGES_REQUESTED, label: "Ajustes Solicitados" },
  { value: TaskStatus.APPROVED, label: "Aprovada" },
  { value: TaskStatus.MERGED, label: "Concluída (Merged)" },
];

export const AuthorTasksTable = ({
  projectId,
  provisioningTaskId,
  currentUserId,
  onStartWorkspace,
  onOpenCreateTask,
}: AuthorTasksTableProps) => {
  const { apiParams, isFiltered, resetFilters, searchProps, bindSelect } =
    useTableFilters(DEFAULT_AUTHOR_TASK_FILTERS);

  const claimTaskMutation = useClaimTaskMutation(projectId);
  const unclaimTaskMutation = useUnclaimTaskMutation(projectId);

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    isFetching,
  } = useTasksQuery(projectId, apiParams);

  const { data: stages = [] } = useQuery({
    queryKey: ["project-stages", projectId],
    queryFn: () => projectsService.getProjectStages(projectId),
    enabled: Boolean(projectId),
  });

  // Controla quais acordeões de etapa estão expandidos
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    {},
  );

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: prev[stageId] === undefined ? false : !prev[stageId],
    }));
  };

  const columns = useMemo<GridColDef<TaskItem>[]>(
    () => [
      {
        field: "title",
        headerName: "Sub-tarefa & Branch",
        flex: 2,
        minWidth: 260,
        renderCell: (params) => <TaskTitleBranchCell row={params.row} />,
      },
      {
        field: "assignee",
        headerName: "Autor Responsável",
        flex: 1.8,
        minWidth: 250,
        renderCell: (params) => (
          <TaskAssigneeCell
            row={params.row}
            currentUserId={currentUserId}
            onClaimTask={(taskId) => claimTaskMutation.mutate(taskId)}
            onUnclaimTask={(taskId) => unclaimTaskMutation.mutate(taskId)}
            isClaiming={claimTaskMutation.isPending}
            isUnclaiming={unclaimTaskMutation.isPending}
          />
        ),
      },
      {
        field: "dueDate",
        headerName: "Data Limite",
        flex: 1,
        minWidth: 140,
        renderCell: (params) => <TaskDueDateCell row={params.row} />,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => <TaskStatusChip status={params.value} />,
      },
      {
        field: "actions",
        headerName: "Ação",
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        flex: 1.5,
        minWidth: 200,
        renderCell: (params) => (
          <TaskActionCell
            row={params.row}
            provisioningTaskId={provisioningTaskId}
            currentUserId={currentUserId}
            onStartWorkspace={onStartWorkspace}
          />
        ),
      },
    ],
    [
      currentUserId,
      claimTaskMutation,
      unclaimTaskMutation,
      provisioningTaskId,
      onStartWorkspace,
    ],
  );

  // Mapear tarefas por stageId
  const tasksByStage = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    const unmapped: TaskItem[] = [];

    for (const t of tasks) {
      if (t.stageId) {
        if (!map[t.stageId]) map[t.stageId] = [];
        map[t.stageId].push(t);
      } else {
        unmapped.push(t);
      }
    }

    return { map, unmapped };
  }, [tasks]);

  const effectiveStages = useMemo(() => {
    if (stages.length > 0) return stages;

    // Etapas padrão fallback se não carregadas
    return [
      {
        id: "stage-1",
        title: "Planejamento e Pesquisa",
        order: 1,
        isGatekeeper: false,
        status: "IN_PROGRESS",
      },
      {
        id: "stage-2",
        title: "Desenvolvimento e Experimentos",
        order: 2,
        isGatekeeper: false,
        status: "NOT_STARTED",
      },
      {
        id: "stage-3",
        title: "Escrita da Versão Rascunho",
        order: 3,
        isGatekeeper: false,
        status: "NOT_STARTED",
      },
      {
        id: "stage-4",
        title: "Parecer do NIT (Gatekeeper 1)",
        order: 4,
        isGatekeeper: true,
        status: "NOT_STARTED",
      },
      {
        id: "stage-5",
        title: "Submissão Oficial (Gatekeeper 2)",
        order: 5,
        isGatekeeper: true,
        status: "NOT_STARTED",
      },
    ];
  }, [stages]);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}
    >
      {/* TOOLBAR SUPERIOR DE FILTROS E NOVA TAREFA */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <TableHeaderFilterToolbar<AuthorTaskFilters>
          search={{
            placeholder: "Buscar tarefa por Título, Branch ou Autor...",
            ...searchProps,
          }}
          selectFilters={[
            {
              id: "status",
              label: "Status da Tarefa",
              options: TASK_STATUS_OPTIONS,
              ...bindSelect("status"),
            },
          ]}
          actions={
            onOpenCreateTask && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon fontSize="small" />}
                onClick={() => onOpenCreateTask()}
                sx={{ whiteSpace: "nowrap", height: 40, fontWeight: 700 }}
              >
                Nova Tarefa
              </Button>
            )
          }
          clearFilters={{
            visible: isFiltered,
            onClear: resetFilters,
          }}
        />
      </Paper>

      {/* ESTRUTURA DE ACCORDIONS POR ETAPA */}
      {effectiveStages.map((stage) => {
        const stageTasks = tasksByStage.map[stage.id] || [];
        const isExpanded = expandedStages[stage.id] ?? true;
        const totalSubtasks = stageTasks.length;
        const completedSubtasks = stageTasks.filter(
          (t) => t.status === TaskStatus.MERGED,
        ).length;
        const hasUnmergedSubtasks = stageTasks.some(
          (t) => t.status !== TaskStatus.MERGED,
        );
        const progressPct =
          totalSubtasks > 0
            ? Math.round((completedSubtasks / totalSubtasks) * 100)
            : 0;

        return (
          <Accordion
            key={stage.id}
            expanded={isExpanded}
            onChange={() => toggleStage(stage.id)}
            sx={{
              border: "1px solid",
              borderColor: stage.isGatekeeper ? colors.amber[600] : "divider",
              borderRadius: "8px !important",
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              component="div"
              expandIcon={<ExpandMoreIcon />}
              sx={{
                bgcolor: stage.isGatekeeper
                  ? "rgba(245, 158, 11, 0.08)"
                  : "action.hover",
                px: 2.5,
                py: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  mr: 2,
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                {/* ETAPA TITLE & BADGES */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Chip
                    label={
                      stage.isGatekeeper
                        ? `Gatekeeper ${stage.order}`
                        : `Etapa ${stage.order}`
                    }
                    size="small"
                    color={stage.isGatekeeper ? "warning" : "primary"}
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    {stage.title}
                  </Typography>

                  <Chip
                    label={
                      stage.status === "COMPLETED"
                        ? "Concluída"
                        : stage.status === "IN_PROGRESS"
                          ? "Em Progresso"
                          : "Não Iniciada"
                    }
                    size="small"
                    color={
                      stage.status === "COMPLETED"
                        ? "success"
                        : stage.status === "IN_PROGRESS"
                          ? "primary"
                          : "default"
                    }
                    sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                  />
                </Box>

                {/* PROGRESSO E AÇÃO DO WORKSPACE DA ETAPA (FEATURE BRANCH) */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{ minWidth: 160, display: { xs: "none", sm: "block" } }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Progresso das Sub-tarefas
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {completedSubtasks}/{totalSubtasks} ({progressPct}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progressPct}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {/* BOTÃO DA FEATURE BRANCH DA ETAPA */}
                  {!stage.isGatekeeper && hasUnmergedSubtasks ? (
                    <Tooltip title="🔒 Conclua e mescle todas as sub-tarefas desta etapa antes de abrir a workspace da Feature.">
                      <span>
                        <Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          disabled
                          startIcon={<LockIcon fontSize="small" />}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            height: 32,
                          }}
                        >
                          Workspace da Etapa
                        </Button>
                      </span>
                    </Tooltip>
                  ) : null}

                  {!stage.isGatekeeper && !hasUnmergedSubtasks ? (
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        const featureBranchTask: TaskItem = {
                          id: `stage-${stage.id}`,
                          projectId,
                          stageId: stage.id,
                          title: `Workspace da Feature: ${stage.title}`,
                          branchName: `feature/stage-${stage.order}`,
                          status: TaskStatus.IN_PROGRESS,
                          dueDate: new Date().toISOString(),
                        };
                        void onStartWorkspace(featureBranchTask);
                      }}
                      sx={{ fontWeight: 700, fontSize: "0.75rem", height: 32 }}
                    >
                      🚀 Workspace da Feature
                    </Button>
                  ) : null}

                  {onOpenCreateTask ? (
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCreateTask?.(stage.id);
                      }}
                      sx={{ fontWeight: 700, fontSize: "0.75rem", height: 32 }}
                    >
                      + Sub-tarefa
                    </Button>
                  ) : null}
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 0, bgcolor: "background.paper" }}>
              {stageTasks.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontStyle: "italic" }}
                  >
                    Nenhuma sub-tarefa criada nesta etapa ainda.
                  </Typography>
                  {onOpenCreateTask && (
                    <Button
                      variant="text"
                      color="primary"
                      size="small"
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={() => onOpenCreateTask(stage.id)}
                      sx={{ mt: 1, fontWeight: 700 }}
                    >
                      Adicionar primeira sub-tarefa
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ width: "100%" }}>
                  <GenericDataGrid<TaskItem>
                    rows={stageTasks}
                    columns={columns}
                    getRowId={(row) => row.id}
                    loading={isTasksLoading || isFetching}
                    pageSizeOptions={[5, 10]}
                    rowHeight={64}
                    emptyMessage="Nenhuma tarefa nesta etapa."
                  />
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* SE HOUVER TAREFAS SEM ETAPA MAPEADA */}
      {tasksByStage.unmapped.length > 0 && (
        <Accordion
          defaultExpanded
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Outras Tarefas ({tasksByStage.unmapped.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <GenericDataGrid<TaskItem>
              rows={tasksByStage.unmapped}
              columns={columns}
              getRowId={(row) => row.id}
              loading={isTasksLoading || isFetching}
              pageSizeOptions={[5, 10]}
              rowHeight={64}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};
