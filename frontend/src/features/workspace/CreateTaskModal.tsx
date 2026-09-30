import AddTaskIcon from "@mui/icons-material/AddTask";
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
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
import { StandardModal } from "../../components/common/StandardModal";
import { Role } from "../../constants/roles";
import { useDebounce } from "../../hooks/useDebounce";
import { useProjectDetails } from "../../hooks/useProjectQueries";
import { useUserSearchQuery } from "../../hooks/useUserQueries";
import { type ProjectMember } from "../../services/projectsService";
import { tasksService } from "../../services/tasksService";
import { type UserMemberItem } from "../../services/usersService";
import { showNotification } from "../../store/slices/notificationSlice";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members?: ProjectMember[];
  onTaskCreated?: () => void;
}

export const CreateTaskModal = ({
  open,
  onClose,
  projectId,
  members: propMembers,
  onTaskCreated,
}: CreateTaskModalProps) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // Busca os detalhes do artigo para obter seus membros reais se não forem passados via props
  const { data: projectDetails } = useProjectDetails(projectId);
  const articleMembers = useMemo(() => {
    return propMembers || projectDetails?.members || [];
  }, [propMembers, projectDetails?.members]);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Se houver membros no artigo, inicializa o responsável pelo primeiro membro do artigo
  const [assignedToId, setAssignedToId] = useState<string>("");

  const projectStages = useMemo(() => {
    return projectDetails?.stages || [];
  }, [projectDetails?.stages]);

  // Mantém busca global com debounce como fallback caso o usuário queira procurar fora dos membros do artigo
  const [assigneeSearchText, setAssigneeSearchText] = useState("");
  const debouncedAssigneeSearch = useDebounce(assigneeSearchText, 300);
  const { data: usersList = [], isFetching: isFetchingUsers } =
    useUserSearchQuery(debouncedAssigneeSearch);
  const [selectedGlobalAssignee, setSelectedGlobalAssignee] =
    useState<UserMemberItem | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
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

    const finalAssignedToId = assignedToId || selectedGlobalAssignee?.id || undefined;

    setIsSubmitting(true);
    try {
      if (projectId && !projectId.startsWith("demo-")) {
        await tasksService.createTask(projectId, {
          title,
          assignedToId: finalAssignedToId,
          dueDate: dueDate || undefined,
          stageId: stageId || undefined,
        });
      }

      // Encontrar nome do usuário atribuído para notificação
      const assignedMember = finalAssignedToId
        ? articleMembers.find(
            (m) =>
              m.userId === finalAssignedToId || m.user?.id === finalAssignedToId,
          )
        : null;
      const assignedName = assignedMember?.user?.name || selectedGlobalAssignee?.name;
      const notificationMsg = assignedName
        ? `Nova Tarefa "${title}" atribuída para ${assignedName} com sucesso!`
        : `Nova Tarefa "${title}" criada com sucesso (não atribuída)!`;

      dispatch(
        showNotification({
          message: notificationMsg,
          severity: "success",
        }),
      );

      // Invalida cache de tarefas
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });

      setTitle("");
      setAssignedToId("");
      setStageId("");
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
    <StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<AddTaskIcon color="primary" />}
      title="Criar Nova Tarefa do Artigo"
      subtitle="Crie uma tarefa para o artigo. A atribuição a um membro é opcional (pode ser assinada depois)."
      onSubmit={handleSubmit}
      confirmText="Criar Tarefa"
      confirmColor="primary"
      isSubmitting={isSubmitting}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
          <FormControl fullWidth size="small">
            <InputLabel>Membro Atribuído (Opcional)</InputLabel>
            <Select
              value={assignedToId}
              label="Membro Atribuído (Opcional)"
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <MenuItem value="">
                <em>Não Atribuído (Qualquer Autor pode Assinar)</em>
              </MenuItem>
              {articleMembers.map((m) => {
                const targetUserId = m.userId || m.user?.id || m.id;
                const userName = m.user?.name || "Membro do Artigo";
                const userEmail = m.user?.email ? ` (${m.user.email})` : "";
                const roleLabel =
                  m.role === Role.REVIEWER ? "Revisor" : "Autor";
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

        {/* Seleção da Etapa de Escrita Associada */}
        {projectStages.length > 0 && (
          <FormControl fullWidth size="small">
            <InputLabel>Etapa de Escrita Associada (Opcional)</InputLabel>
            <Select
              value={stageId}
              label="Etapa de Escrita Associada (Opcional)"
              onChange={(e) => setStageId(e.target.value)}
            >
              <MenuItem value="">
                <em>Nenhuma (Geral do Artigo)</em>
              </MenuItem>
              {projectStages
                .filter((s: any) => !s.isGatekeeper)
                .map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    Etapa {s.order}: {s.title}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
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
    </StandardModal>
  );
};

