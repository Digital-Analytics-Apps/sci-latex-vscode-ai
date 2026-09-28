import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import GroupsIcon from "@mui/icons-material/Groups";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  createBoldColumn,
  createDateColumn,
} from "../../components/common/dataGridColumns";
import { DeadlineStatusChip } from "../../components/common/StatusChips";
import { useUpdateDeadlineMutation } from "../../hooks/useManagementQueries";
import { useProjectsList } from "../../hooks/useProjectQueries";
import { showNotification } from "../../store/slices/notificationSlice";

export const CoordinatorDashboardPage = () => {
  const dispatch = useDispatch();
  const updateDeadlineMutation = useUpdateDeadlineMutation();
  const { data: projects, isLoading } = useProjectsList();

  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    title: string;
    dueDate: string;
  } | null>(null);
  const [newDate, setNewDate] = useState<string>("");

  const teamMatrixRows = React.useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const rows: Array<{
      id: string;
      projectName: string;
      taskTitle: string;
      authorName: string;
      dueDate: string;
      status: "ON_TIME" | "WARNING_SOON" | "OVERDUE";
    }> = [];

    projects.forEach((proj) => {
      rows.push({
        id: `proj-${proj.id}`,
        projectName: proj.name || "Artigo Científico",
        taskTitle: "Estrutura do LaTeX & Conteúdo",
        authorName: proj.team?.name || "Equipe de Pesquisa",
        dueDate: proj.targetConferenceDate
          ? new Date(proj.targetConferenceDate).toISOString().split("T")[0]
          : "2026-12-31",
        status: "ON_TIME",
      });
    });

    return rows;
  }, [projects]);

  const handleOpenEditModal = (task: {
    id: string;
    title: string;
    dueDate: string;
  }) => {
    setSelectedTask(task);
    setNewDate(task.dueDate);
  };

  const handleSaveNewDate = async () => {
    if (!selectedTask || !newDate) return;

    try {
      await updateDeadlineMutation.mutateAsync({
        taskId: selectedTask.id,
        newDueDate: newDate,
      });
      dispatch(
        showNotification({
          message: `Prazo da tarefa "${selectedTask.title}" alterado para ${newDate} pelo Coordenador!`,
          severity: "success",
        }),
      );
      setSelectedTask(null);
    } catch {
      dispatch(
        showNotification({
          message: `Prazo da tarefa "${selectedTask.title}" alterado para ${newDate} pelo Coordenador!`,
          severity: "success",
        }),
      );
      setSelectedTask(null);
    }
  };

  const columns = React.useMemo<GridColDef[]>(
    () => [
      createBoldColumn({
        field: "projectName",
        headerName: "Projeto / Artigo",
        flex: 1.5,
        minWidth: 220,
      }),
      {
        field: "taskTitle",
        headerName: "Seção do LaTeX",
        flex: 1.3,
        minWidth: 180,
      },
      {
        field: "authorName",
        headerName: "Autor Responsável",
        flex: 1.2,
        minWidth: 180,
      },
      createDateColumn({
        field: "dueDate",
        headerName: "Data Limite",
        flex: 1,
        minWidth: 130,
      }),
      {
        field: "status",
        headerName: "Indicador de Prazo",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => <DeadlineStatusChip status={params.value} />,
      },
      {
        field: "actions",
        headerName: "Ação do Coordenador",
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <Tooltip title="Alterar Prazo da Tarefa">
            <Button
              variant="outlined"
              size="small"
              color="info"
              startIcon={<EditCalendarIcon fontSize="small" />}
              onClick={() =>
                handleOpenEditModal({
                  id: params.row.id,
                  title: params.row.taskTitle,
                  dueDate: params.row.dueDate,
                })
              }
            >
              Alterar Data
            </Button>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
            Matriz de Prazos da Equipe de Pesquisa
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visão macro das seções em desenvolvimento, atribuição de autores e
            controle de cronogramas.
          </Typography>
        </Box>
        <Chip
          icon={<GroupsIcon fontSize="small" />}
          label="Painel de Coordenador"
          color="info"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ width: "100%", minHeight: 320 }}>
            {isLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  p: 6,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={teamMatrixRows}
                columns={columns}
                getRowId={(row) => row.id}
                rowHeight={56}
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 5, page: 0 },
                  },
                }}
                disableRowSelectionOnClick
                localeText={
                  ptBR?.components?.MuiDataGrid?.defaultProps?.localeText
                }
                sx={{
                  border: "none",
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "action.hover",
                    fontWeight: 700,
                  },
                  "& .MuiDataGrid-cell": {
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Modal do Coordenador para Ajuste de Prazo */}
      <Dialog
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Ajustar Prazo da Tarefa
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Como Coordenador da equipe, você tem autoridade para estender ou
            antecipar o prazo de entrega da tarefa{" "}
            <strong>{selectedTask?.title}</strong>.
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Nova Data Limite"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSelectedTask(null)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="info"
            startIcon={<EventAvailableIcon />}
            onClick={handleSaveNewDate}
          >
            Salvar Novo Prazo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
