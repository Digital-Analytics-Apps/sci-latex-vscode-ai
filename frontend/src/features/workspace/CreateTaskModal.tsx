import AddTaskIcon from "@mui/icons-material/AddTask";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useDebounce } from "../../hooks/useDebounce";
import { useProjectDetails } from "../../hooks/useProjectQueries";
import { useUserSearchQuery } from "../../hooks/useUserQueries";
import { tasksService } from "../../services/tasksService";
import { type UserMemberItem } from "../../services/usersService";
import { showNotification } from "../../store/slices/notificationSlice";

export interface ProjectMemberOption {
  id: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members?: ProjectMemberOption[];
  onTaskCreated?: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  open,
  onClose,
  projectId,
  members: propMembers,
  onTaskCreated,
}) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // Busca os detalhes do artigo para obter seus membros reais se não forem passados via props
  const { data: projectDetails } = useProjectDetails(projectId);
  const articleMembers = useMemo(() => {
    return propMembers || projectDetails?.members || [];
  }, [propMembers, projectDetails?.members]);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Se houver membros no artigo, inicializa o responsável pelo primeiro membro do artigo
  const [assignedToId, setAssignedToId] = useState<string>("");

  // Mantém busca global com debounce como fallback caso o usuário queira procurar fora dos membros do artigo
  const [assigneeSearchText, setAssigneeSearchText] = useState("");
  const debouncedAssigneeSearch = useDebounce(assigneeSearchText, 300);
  const { data: usersList = [], isFetching: isFetchingUsers } =
    useUserSearchQuery(debouncedAssigneeSearch);
  const [selectedGlobalAssignee, setSelectedGlobalAssignee] =
    useState<UserMemberItem | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      dispatch(
        showNotification({
          message: "Informe o título da tarefa.",
          severity: "warning",
        }),
      );
      return;
    }

    const finalAssignedToId = assignedToId || selectedGlobalAssignee?.id;
    if (!finalAssignedToId) {
      dispatch(
        showNotification({
          message: "Selecione um membro do artigo responsável pela tarefa.",
          severity: "warning",
        }),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (projectId && !projectId.startsWith("demo-")) {
        await tasksService.createTask(projectId, {
          title,
          assignedToId: finalAssignedToId,
          dueDate: dueDate || undefined,
        });
      }

      // Encontrar nome do usuário atribuído para notificação
      const assignedMember = articleMembers.find(
        (m) =>
          m.userId === finalAssignedToId || m.user?.id === finalAssignedToId,
      );
      const assignedName =
        assignedMember?.user?.name ||
        selectedGlobalAssignee?.name ||
        "Autor Responsável";

      dispatch(
        showNotification({
          message: `Nova Tarefa "${title}" atribuída para ${assignedName} com sucesso!`,
          severity: "success",
        }),
      );

      // Invalida cache de tarefas
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });

      setTitle("");
      setAssignedToId("");
      setSelectedGlobalAssignee(null);
      setAssigneeSearchText("");
      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Erro ao criar tarefa.";
      dispatch(showNotification({ message: msg, severity: "error" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          pb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AddTaskIcon color="primary" />
        Criar Nova Tarefa do Artigo
      </DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        Atribua uma tarefa a um membro (Autor/Revisor) pertencente a este
        artigo.
      </Typography>

      <DialogContent dividers>
        <Box
          component="form"
          id="create-task-form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            fullWidth
            size="small"
            label="Título da Tarefa"
            placeholder="Ex: Formulação das equações da Introdução"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Seleção do Membro do Artigo */}
          {articleMembers.length > 0 ? (
            <FormControl fullWidth size="small" required>
              <InputLabel>Membro Atribuído (Membros do Artigo)</InputLabel>
              <Select
                value={assignedToId}
                label="Membro Atribuído (Membros do Artigo)"
                onChange={(e) => setAssignedToId(e.target.value)}
              >
                {articleMembers.map((m) => {
                  const targetUserId = m.userId || m.user?.id || m.id;
                  const userName = m.user?.name || "Membro do Artigo";
                  const userEmail = m.user?.email ? ` (${m.user.email})` : "";
                  const roleLabel =
                    m.role === "REVIEWER"
                      ? "Revisor"
                      : m.role === "CO_AUTHOR"
                        ? "Co-Autor"
                        : "Autor";
                  return (
                    <MenuItem key={targetUserId} value={targetUserId}>
                      {userName} [{roleLabel}]{userEmail}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          ) : (
            /* Autocomplete com Debounce (mín. 3 letras) se não houver membros pré-carregados */
            <Autocomplete
              options={usersList}
              value={selectedGlobalAssignee}
              onChange={(_e, newValue) =>
                setSelectedGlobalAssignee(newValue as UserMemberItem | null)
              }
              inputValue={assigneeSearchText}
              onInputChange={(_e, newInputValue) =>
                setAssigneeSearchText(newInputValue)
              }
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={isFetchingUsers}
              noOptionsText={
                assigneeSearchText.trim().length > 0 &&
                assigneeSearchText.trim().length < 3
                  ? "Digite pelo menos 3 letras para pesquisar..."
                  : "Nenhum usuário encontrado."
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Autor Responsável (Pesquisa Global)"
                  placeholder="Pesquisar por nome ou e-mail..."
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      endAdornment: (
                        <>
                          {isFetchingUsers ? (
                            <CircularProgress color="inherit" size={18} />
                          ) : null}
                          {params.slotProps.input.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  key={option.id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    py: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.email}
                    </Typography>
                  </Box>
                  <Chip
                    label={option.role}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </Box>
              )}
            />
          )}

          <TextField
            fullWidth
            size="small"
            type="date"
            label="Data Limite (Prazo)"
            slotProps={{ inputLabel: { shrink: true } }}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          type="submit"
          form="create-task-form"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          Criar Tarefa
        </Button>
      </DialogActions>
    </Dialog>
  );
};
