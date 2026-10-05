import AddTaskIcon from "@mui/icons-material/AddTask";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../../components/common/StandardModal";
import { Role } from "../../../constants/roles";
import { useDebounce } from "../../../hooks/useDebounce";
import { useProjectDetails } from "../../../hooks/useProjectQueries";
import { useCreateTaskMutation } from "../../../hooks/useTaskQueries";
import { useUserSearchQuery } from "../../../hooks/useUserQueries";
import { type ProjectMember } from "../../../services/projectsService";
import { type UserMemberItem } from "../../../services/usersService";
import { showNotification } from "../../../store/slices/notificationSlice";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members?: ProjectMember[];
  initialTitle?: string;
  initialStageId?: string;
  onTaskCreated?: () => void;
}

export const CreateTaskModal = ({
  open,
  onClose,
  projectId,
  members: propMembers,
  initialTitle = "",
  initialStageId = "",
  onTaskCreated,
}: CreateTaskModalProps) => {
  const dispatch = useDispatch();
  const createTaskMutation = useCreateTaskMutation(projectId);

  const { data: projectDetails } = useProjectDetails(projectId);
  const articleMembers = useMemo(() => {
    return propMembers || projectDetails?.members || [];
  }, [propMembers, projectDetails?.members]);

  const projectStages = useMemo(() => {
    return (projectDetails?.stages || []).filter((s: any) => !s.isGatekeeper);
  }, [projectDetails?.stages]);

  const [prevOpen, setPrevOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [dueDate, setDueDate] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [assignedToId, setAssignedToId] = useState<string>("");

  // Sync state when modal transitions to open
  if (open && !prevOpen) {
    setPrevOpen(true);
    if (initialTitle) setTitle(initialTitle);
    const defaultStageId =
      initialStageId || (projectStages.length > 0 ? projectStages[0].id : "");
    setStageId(defaultStageId);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Encontra a etapa selecionada para extrair o prazo limite máximo permitido para a sub-tarefa
  const selectedStage = useMemo(() => {
    return projectStages.find((s: any) => s.id === stageId);
  }, [projectStages, stageId]);

  const maxStageDateStr = useMemo(() => {
    if (!selectedStage) return "";
    const rawDate =
      selectedStage.plannedCompletionDate || selectedStage.plannedEndAt;
    if (!rawDate) return "";
    return new Date(rawDate).toISOString().split("T")[0];
  }, [selectedStage]);

  const maxStageDateFormatted = useMemo(() => {
    if (!maxStageDateStr) return null;
    const [year, month, day] = maxStageDateStr.split("-");
    return `${day}/${month}/${year}`;
  }, [maxStageDateStr]);

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
          message: "Informe o título da sub-tarefa.",
          severity: "warning",
        }),
      );
      return;
    }

    if (!stageId) {
      dispatch(
        showNotification({
          message:
            "Selecione obrigatoriamente a etapa de escrita à qual a sub-tarefa pertence.",
          severity: "warning",
        }),
      );
      return;
    }

    if (
      dueDate &&
      maxStageDateStr &&
      new Date(dueDate) > new Date(maxStageDateStr)
    ) {
      dispatch(
        showNotification({
          message: `A data limite da sub-tarefa (${dueDate}) não pode ser maior que a data limite da etapa (${maxStageDateFormatted}).`,
          severity: "error",
        }),
      );
      return;
    }

    const finalAssignedToId =
      assignedToId || selectedGlobalAssignee?.id || undefined;

    try {
      if (projectId && !projectId.startsWith("demo-")) {
        await createTaskMutation.mutateAsync({
          title,
          assignedToId: finalAssignedToId,
          dueDate: dueDate || undefined,
          stageId: stageId,
        });
      }

      const assignedMember = finalAssignedToId
        ? articleMembers.find(
            (m) =>
              m.userId === finalAssignedToId ||
              m.user?.id === finalAssignedToId,
          )
        : null;
      const assignedName =
        assignedMember?.user?.name || selectedGlobalAssignee?.name;
      const notificationMsg = assignedName
        ? `Nova Sub-tarefa "${title}" atribuída para ${assignedName} com sucesso!`
        : `Nova Sub-tarefa "${title}" criada com sucesso (não atribuída)!`;

      dispatch(
        showNotification({
          message: notificationMsg,
          severity: "success",
        }),
      );

      setTitle("");
      setAssignedToId("");
      setDueDate("");
      setSelectedGlobalAssignee(null);
      setAssigneeSearchText("");
      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Erro ao criar sub-tarefa.";
      dispatch(showNotification({ message: msg, severity: "error" }));
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<AddTaskIcon color="primary" />}
      title="Criar Nova Sub-tarefa de Escrita"
      subtitle="Crie uma sub-tarefa associada a uma etapa de escrita. A atribuição a um membro é opcional (pode ser assinada depois)."
      onSubmit={handleSubmit}
      confirmText="Criar Sub-tarefa"
      confirmColor="primary"
      isSubmitting={createTaskMutation.isPending}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Título da Sub-tarefa *"
          placeholder="Ex: Formulação das equações da Introdução"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Seleção OBRIGATÓRIA da Etapa de Escrita */}
        <FormControl fullWidth size="small" required error={!stageId}>
          <InputLabel>Etapa de Escrita Associada *</InputLabel>
          <Select
            value={stageId}
            label="Etapa de Escrita Associada *"
            required
            onChange={(e) => setStageId(e.target.value)}
          >
            {projectStages.map((s: any) => (
              <MenuItem key={s.id} value={s.id}>
                Etapa {s.order}: {s.title}
              </MenuItem>
            ))}
          </Select>
          {!stageId && (
            <FormHelperText>
              A sub-tarefa deve estar vinculada a uma etapa.
            </FormHelperText>
          )}
        </FormControl>

        {/* Campo de Data Limite (Prazo da Sub-tarefa) em Destaque com Validação de Etapa */}
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Data Limite (Prazo da Sub-tarefa)"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: {
              max: maxStageDateStr || undefined,
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarTodayIcon color="primary" fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          helperText={
            maxStageDateFormatted
              ? `Data limite máxima da etapa: ${maxStageDateFormatted}`
              : "Defina o prazo de entrega desta sub-tarefa."
          }
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
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
      </Box>
    </StandardModal>
  );
};
