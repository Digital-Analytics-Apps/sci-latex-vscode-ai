import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FlagIcon from "@mui/icons-material/Flag";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import StarIcon from "@mui/icons-material/Star";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { UserSearchAutocomplete } from "../../../components/common/UserSearchAutocomplete";
import { Role } from "../../../constants/roles";
import {
  MEMBER_ROLE_COLORS,
  MEMBER_ROLE_LABELS,
} from "../../../constants/teams";
import {
  useAcademicPeriods,
  useSetTeamGoalMutation,
} from "../../../hooks/useManagementQueries";
import {
  useAddTeamMemberMutation,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useRemoveTeamMemberMutation,
  useTeamDetailsQuery,
  useUpdateTeamMutation,
} from "../../../hooks/useTeamQueries";
import { useUserSearchQuery } from "../../../hooks/useUserQueries";
import { showNotification } from "../../../store/slices/notificationSlice";
import type { TeamItem } from "../../../types/team.types";
import type { UserMemberItem } from "../../../types/user.types";

interface ManageTeamModalProps {
  open: boolean;
  onClose: () => void;
  team: TeamItem | null;
}

export const ManageTeamModal = ({
  open,
  onClose,
  team,
}: ManageTeamModalProps) => {
  const dispatch = useDispatch();

  // Estado para equipe recém-criada (modo criação que transiciona para edição)
  const [createdTeam, setCreatedTeam] = useState<TeamItem | null>(null);
  const activeTeam = team || createdTeam;
  const activeTeamId = activeTeam?.id || "";
  const isEditMode = Boolean(activeTeam?.id);

  // React Query Hooks
  const { data: teamDetails, isLoading: isLoadingDetails } =
    useTeamDetailsQuery(activeTeamId);
  const { data: periods } = useAcademicPeriods();
  const createTeamMutation = useCreateTeamMutation();
  const updateTeamMutation = useUpdateTeamMutation();
  const deleteTeamMutation = useDeleteTeamMutation();
  const addMemberMutation = useAddTeamMemberMutation(activeTeamId);
  const removeMemberMutation = useRemoveTeamMemberMutation(activeTeamId);
  const setTeamGoalMutation = useSetTeamGoalMutation();

  // Tab State
  const [tabIndex, setTabIndex] = useState(0);

  // Form State para Aba 0: Dados da Equipe (Unificado em um único estado)
  const [prevTeamId, setPrevTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    coordinatorId: "",
    coordinatorEmail: "",
  });

  // Estado para Aba 1: Busca e Adição de Membros
  const [search, setSearch] = useState("");
  const { data: searchResults } = useUserSearchQuery(search);

  // Estado para Aba 2: Cotas da Equipe
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [targetArticles, setTargetArticles] = useState<number>(5);

  // Sincronização de estado derivada do time prop
  if (team && team.id !== prevTeamId) {
    setPrevTeamId(team.id);
    setCreatedTeam(null);
    setTeamForm({
      name: team.name || "",
      coordinatorId: team.coordinator?.id || "",
      coordinatorEmail: team.coordinator?.email || "",
    });
  } else if (!team && prevTeamId !== null) {
    setPrevTeamId(null);
    setCreatedTeam(null);
    setTeamForm({
      name: "",
      coordinatorId: "",
      coordinatorEmail: "",
    });
    setTabIndex(0);
  }

  const currentTeam = teamDetails || activeTeam;
  const currentMembers = currentTeam?.members || [];

  // Reset local state ao fechar o modal
  const handleCloseModal = () => {
    setCreatedTeam(null);
    setPrevTeamId(null);
    setTeamForm({
      name: "",
      coordinatorId: "",
      coordinatorEmail: "",
    });
    setTabIndex(0);
    onClose();
  };

  // Handler de Criação / Atualização da Equipe (Aba 0)
  const handleSaveTeam = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) return;

    if (isEditMode && activeTeam) {
      // Atualização de Equipe Existente
      try {
        await updateTeamMutation.mutateAsync({
          id: activeTeam.id,
          data: {
            name: teamForm.name.trim(),
            coordinatorId: teamForm.coordinatorId || undefined,
            coordinatorEmail: teamForm.coordinatorEmail.trim() || undefined,
          },
        });
        dispatch(
          showNotification({
            message: `Dados da equipe "${teamForm.name}" salvos com sucesso!`,
            severity: "success",
          }),
        );
      } catch {
        dispatch(
          showNotification({
            message: "Erro ao atualizar dados da equipe.",
            severity: "error",
          }),
        );
      }
    } else {
      // Criação de Nova Equipe
      try {
        const newTeam = await createTeamMutation.mutateAsync({
          name: teamForm.name.trim(),
          coordinatorId: teamForm.coordinatorId || undefined,
          coordinatorEmail: teamForm.coordinatorEmail.trim() || undefined,
        });
        setCreatedTeam(newTeam);
        dispatch(
          showNotification({
            message: `Nova Equipe "${teamForm.name}" cadastrada com sucesso! Você já pode adicionar integrantes e definir cotas.`,
            severity: "success",
          }),
        );
        setTabIndex(1); // Auto avança para a Aba de Integrantes
      } catch {
        dispatch(
          showNotification({
            message: "Erro ao cadastrar equipe de pesquisa.",
            severity: "error",
          }),
        );
      }
    }
  };

  // Handler de Exclusão da Equipe (Aba 0)
  const handleDeleteTeam = async () => {
    if (!activeTeam) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a equipe "${activeTeam.name}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync(activeTeam.id);
      dispatch(
        showNotification({
          message: `Equipe "${activeTeam.name}" excluída com sucesso.`,
          severity: "success",
        }),
      );
      handleCloseModal();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao excluir equipe.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Adicionar Pesquisador à Equipe (Aba 1)
  const handleAddMember = async (user: UserMemberItem) => {
    if (!activeTeamId) return;
    try {
      await addMemberMutation.mutateAsync({
        userId: user.id,
        role: Role.AUTHOR,
      });

      dispatch(
        showNotification({
          message: `${user.name} adicionado(a) como Pesquisador(a) à equipe!`,
          severity: "success",
        }),
      );
      setSearch("");
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao vincular integrante à equipe.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Remover Membro (Aba 1)
  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!activeTeamId) return;
    try {
      await removeMemberMutation.mutateAsync(userId);
      dispatch(
        showNotification({
          message: `${userName} foi removido(a) da equipe.`,
          severity: "info",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao remover integrante da equipe.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Definir Cota da Equipe (Aba 2)
  const handleSetTeamGoal = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeTeamId) return;
    const activePeriodId = selectedPeriodId || periods?.[0]?.id;
    if (!activePeriodId) return;

    try {
      await setTeamGoalMutation.mutateAsync({
        academicPeriodId: activePeriodId,
        teamId: activeTeamId,
        targetArticles: Number(targetArticles),
      });
      dispatch(
        showNotification({
          message: `Cota de ${targetArticles} artigos atribuída à equipe!`,
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao atribuir cota da equipe.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleCloseModal} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          pb: 1,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <GroupIcon color="warning" />
        {isEditMode
          ? `Gerenciar: ${currentTeam?.name || teamForm.name}`
          : "Nova Equipe de Pesquisa"}
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, newValue) => setTabIndex(newValue)}
          aria-label="Abas de Gestão de Equipes"
        >
          <Tab
            icon={<EditIcon fontSize="small" />}
            iconPosition="start"
            label={isEditMode ? "Dados Gerais" : "Criar Equipe"}
          />
          <Tab
            icon={<PersonAddIcon fontSize="small" />}
            iconPosition="start"
            label={
              isEditMode
                ? `Integrantes (${currentMembers.length})`
                : "Integrantes"
            }
            disabled={!isEditMode}
          />
          <Tab
            icon={<FlagIcon fontSize="small" />}
            iconPosition="start"
            label="Cota da Equipe"
            disabled={!isEditMode}
          />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* ABA 0: DADOS GERAIS / CRIAÇÃO DA EQUIPE */}
        {tabIndex === 0 && (
          <form id="save-team-form" onSubmit={handleSaveTeam}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                {isEditMode
                  ? "Atualize o nome do laboratório/equipe e o Coordenador responsável."
                  : "Cadastre uma nova equipe de pesquisa e atribua o Coordenador responsável."}
              </Typography>

              <TextField
                required
                fullWidth
                label="Nome da Equipe / Laboratório"
                placeholder="Ex: Laboratório de Robótica & IA"
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />

              <UserSearchAutocomplete
                value={teamForm.coordinatorEmail}
                onChange={(email, user) => {
                  setTeamForm((prev) => ({
                    ...prev,
                    coordinatorEmail: email,
                    coordinatorId: user?.id || "",
                  }));
                }}
                allowedRoles={["COORDINATOR", "MANAGER", "ADMIN"]}
                label="Coordenador Responsável"
                placeholder="Buscar por nome ou e-mail..."
                helperText="Selecione um pesquisador cadastrado na lista de sugestões"
              />

              {!isEditMode && (
                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, mt: -1 }}>
                  💡 Dica: Após cadastrar os dados iniciais, o modal liberará automaticamente as abas de Integrantes e Cotas.
                </Typography>
              )}

              <Box
                sx={{
                  pt: 2,
                  display: "flex",
                  justifyContent: isEditMode ? "space-between" : "flex-end",
                  alignItems: "center",
                  borderTop: "1px dashed",
                  borderColor: "divider",
                }}
              >
                {isEditMode && (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={handleDeleteTeam}
                    disabled={deleteTeamMutation.isPending}
                  >
                    Excluir Equipe
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  color="warning"
                  disabled={
                    updateTeamMutation.isPending || createTeamMutation.isPending
                  }
                >
                  {isEditMode
                    ? updateTeamMutation.isPending
                      ? "Salvando..."
                      : "Salvar Alterações"
                    : createTeamMutation.isPending
                      ? "Cadastrando..."
                      : "Cadastrar Equipe & Avançar"}
                </Button>
              </Box>
            </Box>
          </form>
        )}

        {/* ABA 1: INTEGRANTES & PESQUISADORES */}
        {tabIndex === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Vincule pesquisadores e colaboradores à equipe do laboratório.
            </Typography>

            {/* Form de Adição de Membros */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "action.hover",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Adicionar Pesquisador à Equipe
              </Typography>

              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <UserSearchAutocomplete
                    value={search}
                    onChange={(val, user) => {
                      setSearch(val);
                      if (user) {
                        handleAddMember(user);
                      }
                    }}
                    size="small"
                    label="Buscar pesquisador (nome ou e-mail)"
                    placeholder="Digite para pesquisar..."
                  />
                </Box>
              </Box>

              {/* Resultado da Busca */}
              {searchResults && searchResults.length > 0 && (
                <List
                  dense
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    maxHeight: 180,
                    overflow: "auto",
                  }}
                >
                  {searchResults.map((u) => {
                    const isMember = currentMembers.some(
                      (m) => (m.userId || m.id) === u.id,
                    );
                    return (
                      <ListItem
                        key={u.id}
                        secondaryAction={
                          <Button
                            size="small"
                            variant="contained"
                            disabled={isMember || addMemberMutation.isPending}
                            onClick={() => handleAddMember(u)}
                          >
                            {isMember ? "Já Vinculado" : "Adicionar"}
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ width: 28, height: 28 }}>
                            {u.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={u.name}
                          secondary={`${u.email} • ${u.role}`}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>

            {/* Lista Atual de Integrantes da Equipe */}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mt: 1, mb: -1 }}
            >
              Integrantes Atuais ({currentMembers.length})
            </Typography>

            {isLoadingDetails ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : currentMembers.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: "italic", py: 2 }}
              >
                Nenhum integrante vinculado a esta equipe ainda.
              </Typography>
            ) : (
              <List dense sx={{ width: "100%" }}>
                {currentMembers.map((m) => {
                  const u = m.user || (m as any);
                  const memberRole = (m as any).role || u?.role;
                  const isCoordinator =
                    currentTeam?.coordinator?.email === u?.email ||
                    memberRole === Role.COORDINATOR;
                  const roleLabel = isCoordinator
                    ? "Coordenador"
                    : MEMBER_ROLE_LABELS[
                        memberRole as keyof typeof MEMBER_ROLE_LABELS
                      ] || "Membro";

                  return (
                    <ListItem
                      key={m.id || u.id}
                      divider
                      secondaryAction={
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {!isCoordinator && (
                            <IconButton
                              size="small"
                              title="Promover a Coordenador"
                              color="warning"
                              onClick={async () => {
                                if (!activeTeamId) return;
                                await updateTeamMutation.mutateAsync({
                                  id: activeTeamId,
                                  data: { coordinatorEmail: u.email },
                                });
                                dispatch(
                                  showNotification({
                                    message: `${u.name} agora é o(a) Coordenador(a) responsável!`,
                                    severity: "success",
                                  }),
                                );
                              }}
                            >
                              <StarIcon fontSize="small" />
                            </IconButton>
                          )}
                          {!isCoordinator && (
                            <IconButton
                              size="small"
                              title="Remover da Equipe"
                              color="error"
                              onClick={() =>
                                handleRemoveMember(
                                  u?.id || "",
                                  u?.name || "Membro",
                                )
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {u?.name?.charAt(0).toUpperCase() || "P"}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {u?.name}
                            </Typography>
                            <Chip
                              label={roleLabel}
                              size="small"
                              variant="outlined"
                              color={
                                isCoordinator
                                  ? "warning"
                                  : MEMBER_ROLE_COLORS[
                                      memberRole as keyof typeof MEMBER_ROLE_COLORS
                                    ] || "default"
                              }
                            />
                          </Box>
                        }
                        secondary={u?.email}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        )}

        {/* ABA 2: COTAS DA EQUIPE */}
        {tabIndex === 2 && (
          <form id="team-goal-form" onSubmit={handleSetTeamGoal}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Defina a meta/cota de artigos científicos a serem produzidos por este laboratório no Ciclo Acadêmico ativo.
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel>Ciclo Acadêmico</InputLabel>
                <Select
                  value={selectedPeriodId || periods?.[0]?.id || ""}
                  label="Ciclo Acadêmico"
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                >
                  {periods?.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({new Date(p.startDate).getFullYear()})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                required
                fullWidth
                type="number"
                label="Cota de Artigos Científicos"
                placeholder="Ex: 8"
                value={targetArticles}
                onChange={(e) => setTargetArticles(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 100 } }}
                helperText="Meta de artigos a serem submetidos nesta vigência acadêmica"
              />

              <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="warning"
                  disabled={setTeamGoalMutation.isPending}
                >
                  {setTeamGoalMutation.isPending
                    ? "Atribuindo..."
                    : "Atribuir Cota à Equipe"}
                </Button>
              </Box>
            </Box>
          </form>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleCloseModal} color="inherit">
          Concluir
        </Button>
      </DialogActions>
    </Dialog>
  );
};
