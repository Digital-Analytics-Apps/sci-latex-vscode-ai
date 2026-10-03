import AddIcon from "@mui/icons-material/Add";
import { Button } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { GenericDataGrid } from "../../../components/common/GenericDataGrid";
import { TableContainer } from "../../../components/common/TableContainer";
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
  onOpenCreateTask?: () => void;
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
  // Hook Turnkey: gerencia estado local, debounce, URL sync e verificação de filtros ativos
  const { apiParams, isFiltered, resetFilters, searchProps, bindSelect } =
    useTableFilters(DEFAULT_AUTHOR_TASK_FILTERS);

  // Mutações para Assinar (Claim) e Desassinar (Unclaim) Tarefas
  const claimTaskMutation = useClaimTaskMutation(projectId);
  const unclaimTaskMutation = useUnclaimTaskMutation(projectId);

  // Busca na API REST diretamente do backend com zero-flicker (placeholderData: keepPreviousData)
  const {
    data: tasks = [],
    isLoading,
    isFetching,
  } = useTasksQuery(projectId, apiParams);

  // Definição limpa das colunas do MUI DataGrid
  const columns = useMemo<GridColDef<TaskItem>[]>(
    () => [
      {
        field: "title",
        headerName: "Seção do Artigo & Branch",
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
        headerName: "Status da Tarefa",
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

  return (
    <TableContainer>
      <AutoSizer
        renderProp={({ height, width }) => (
          <GenericDataGrid<TaskItem>
            headerToolbarContent={
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
                      onClick={onOpenCreateTask}
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
            }
            rows={tasks}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading || isFetching}
            pageSizeOptions={[5, 10, 25]}
            height={height}
            width={width}
            rowHeight={64}
            emptyMessage="Nenhuma tarefa encontrada para este artigo com os filtros selecionados."
          />
        )}
      />
    </TableContainer>
  );
};
