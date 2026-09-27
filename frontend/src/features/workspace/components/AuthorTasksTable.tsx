import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { GenericDataGrid } from "../../../components/common/GenericDataGrid";
import { useDebounce } from "../../../hooks/useDebounce";
import { useTasksQuery } from "../../../hooks/useTaskQueries";
import { useUrlFilters } from "../../../hooks/useUrlFilters";
import { TaskStatus } from "../../../constants/status";
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
  onStartWorkspace: (task: TaskItem) => void;
}

const DEFAULT_AUTHOR_TASK_FILTERS = {
  search: "",
  status: "ALL",
};

export const AuthorTasksTable = ({
  projectId,
  provisioningTaskId,
  currentUserId,
  onStartWorkspace,
}: AuthorTasksTableProps) => {
  const { filters, setFilters, apiParams, resetFilters } = useUrlFilters(
    DEFAULT_AUTHOR_TASK_FILTERS,
  );

  // Estado local para o input de busca imediato (evita travamento ao digitar)
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [prevUrlSearch, setPrevUrlSearch] = useState(filters.search);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Sincroniza o input local durante o render se a busca da URL mudar externamente (React 19 anti-cascading render)
  if (prevUrlSearch !== filters.search) {
    setPrevUrlSearch(filters.search);
    setSearchTerm(filters.search);
  }

  // Atualiza os filtros da URL quando a digitação estabilizar no debounce
  useEffect(() => {
    if (
      searchTerm === debouncedSearchTerm &&
      debouncedSearchTerm !== filters.search
    ) {
      setFilters({ search: debouncedSearchTerm });
    }
  }, [searchTerm, debouncedSearchTerm, filters.search, setFilters]);

  const handleResetFilters = () => {
    setSearchTerm("");
    resetFilters();
  };

  // Busca na API REST diretamente do backend com zero-flicker (placeholderData: keepPreviousData)
  const {
    data: tasks = [],
    isLoading,
    isFetching,
  } = useTasksQuery(projectId, apiParams);

  const isFiltered = Boolean(filters.search.trim()) || filters.status !== "ALL";

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
        flex: 1.2,
        minWidth: 180,
        renderCell: (params) => <TaskAssigneeCell row={params.row} />,
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
        flex: 1.3,
        minWidth: 180,
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
    [provisioningTaskId, currentUserId, onStartWorkspace],
  );

  return (
    <Box sx={{ width: "100%" }}>
      {/* Cabeçalho da Seção de Tarefas */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Tarefas do Artigo ({tasks.length})
        </Typography>
      </Box>

      {/* Painel de Busca & Filtro de Status Sincronizado via URL */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2.5, bgcolor: "background.paper" }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: isFiltered ? "2fr 1.5fr auto" : "2fr 1.5fr",
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar tarefa por Título, Branch ou Autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Status da Tarefa</InputLabel>
            <Select
              value={filters.status}
              label="Status da Tarefa"
              onChange={(e) => setFilters({ status: e.target.value })}
            >
              <MenuItem value="ALL">Todos os Status</MenuItem>
              <MenuItem value={TaskStatus.NOT_STARTED}>Não Iniciada</MenuItem>
              <MenuItem value={TaskStatus.IN_PROGRESS}>Em Progresso</MenuItem>
              <MenuItem value={TaskStatus.UNDER_REVIEW}>Em Avaliação</MenuItem>
              <MenuItem value={TaskStatus.CHANGES_REQUESTED}>
                Ajustes Solicitados
              </MenuItem>
              <MenuItem value={TaskStatus.APPROVED}>Aprovada</MenuItem>
              <MenuItem value={TaskStatus.MERGED}>Concluída (Merged)</MenuItem>
            </Select>
          </FormControl>

          {isFiltered && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={handleResetFilters}
              sx={{ whiteSpace: "nowrap", height: 40 }}
            >
              Limpar Filtros
            </Button>
          )}
        </Box>
      </Paper>

      {/* Tabela de Tarefas com GenericDataGrid & AutoSizer */}
      <Card variant="outlined">
        <CardContent sx={{ p: 0, height: 440, width: "100%" }}>
          <AutoSizer
            renderProp={({ height = 440, width }) => (
              <GenericDataGrid<TaskItem>
                rows={tasks}
                columns={columns}
                getRowId={(row) => row.id}
                loading={isLoading || isFetching}
                pageSizeOptions={[5, 10, 25]}
                height={height}
                width={width}
                emptyMessage="Nenhuma tarefa encontrada para este artigo com os filtros selecionados."
              />
            )}
          />
        </CardContent>
      </Card>
    </Box>
  );
};
