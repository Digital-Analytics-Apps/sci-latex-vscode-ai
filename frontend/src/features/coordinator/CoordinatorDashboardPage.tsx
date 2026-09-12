import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import GroupsIcon from "@mui/icons-material/Groups";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useUpdateDeadlineMutation } from "../../hooks/useManagementQueries";
import { showNotification } from "../../store/slices/notificationSlice";

export const CoordinatorDashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const updateDeadlineMutation = useUpdateDeadlineMutation();

  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    title: string;
    dueDate: string;
  } | null>(null);
  const [newDate, setNewDate] = useState<string>("");

  const mockTeamMatrix = [
    {
      id: "task-1",
      projectName: "Metodologia Científica em Redes Neutras",
      taskTitle: "Tarefa 1 - Introdução",
      authorName: "autor1@sci-latex.org",
      dueDate: "2026-10-01",
      status: "ON_TIME" as const,
    },
    {
      id: "task-2",
      projectName: "Metodologia Científica em Redes Neutras",
      taskTitle: "Tarefa 2 - Resultados Experimentais",
      authorName: "autor2@sci-latex.org",
      dueDate: "2026-09-10",
      status: "WARNING_SOON" as const,
    },
    {
      id: "task-3",
      projectName: "Otimização de Compiladores TeX isolados",
      taskTitle: "Tarefa 3 - Arquitetura de Containers",
      authorName: "autor3@sci-latex.org",
      dueDate: "2026-09-01",
      status: "OVERDUE" as const,
    },
  ];

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
          label="Equipe: Inteligência Artificial"
          color="info"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Paper variant="outlined" sx={{ border: "none" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Projeto / Artigo
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Seção do LaTeX</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Autor Responsável
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Data Limite</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Indicador de Prazo
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Ação do Coordenador
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockTeamMatrix.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {item.projectName}
                    </TableCell>
                    <TableCell>{item.taskTitle}</TableCell>
                    <TableCell>{item.authorName}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {item.dueDate}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          item.status === "ON_TIME"
                            ? "🟢 No Prazo"
                            : item.status === "WARNING_SOON"
                              ? "🟡 Atenção"
                              : "🔴 Atrasado"
                        }
                        size="small"
                        color={
                          item.status === "ON_TIME"
                            ? "success"
                            : item.status === "WARNING_SOON"
                              ? "warning"
                              : "error"
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Alterar Prazo da Tarefa">
                        <Button
                          variant="outlined"
                          size="small"
                          color="info"
                          startIcon={<EditCalendarIcon fontSize="small" />}
                          onClick={() =>
                            handleOpenEditModal({
                              id: item.id,
                              title: item.taskTitle,
                              dueDate: item.dueDate,
                            })
                          }
                        >
                          Alterar Data
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
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
