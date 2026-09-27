import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
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
import { Role } from "../../../constants/roles";
import {
  MEMBER_ROLE_COLORS,
  MEMBER_ROLE_LABELS,
} from "../../../constants/teams";
import {
  useAddTeamMemberMutation,
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
  const teamId = team?.id || "";

  // React Query Hooks
  const { data: teamDetails, isLoading: isLoadingDetails } =
    useTeamDetailsQuery(teamId);
  const updateTeamMutation = useUpdateTeamMutation();
  const deleteTeamMutation = useDeleteTeamMutation();
  const addMemberMutation = useAddTeamMemberMutation(teamId);
  const removeMemberMutation = useRemoveTeamMemberMutation(teamId);

  // Tab State
  const [tabIndex, setTabIndex] = useState(0);

  // Form State para Aba 0: Dados da Equipe
  const [prevTeamId, setPrevTeamId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");

  // Estado para Aba 1: Busca e Adição de Membros
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(Role.AUTHOR);
  const { data: searchResults } = useUserSearchQuery(search);

  // Sincronização de estado derivada do time sem useEffect setState
  const activeTeam = teamDetails || team;
  if (team && team.id !== prevTeamId) {
    setPrevTeamId(team.id);
    setName(team.name || "");
    setCoordinatorEmail(team.coordinator?.email || "");
  } else if (!team && prevTeamId !== null) {
    setPrevTeamId(null);
    setName("");
    setCoordinatorEmail("");
  }

  const currentMembers = activeTeam?.members || [];

  // Handler de Atualização da Equipe (Aba 0)
  const handleUpdateTeam = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!team || !name.trim()) return;

    try {
      await updateTeamMutation.mutateAsync({
        id: team.id,
        data: {
          name: name.trim(),
          coordinatorEmail: coordinatorEmail.trim() || undefined,
        },
      });
      dispatch(
        showNotification({
          message: `Dados da equipe "${name}" salvos com sucesso!`,
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
  };

  // Handler de Exclusão da Equipe (Aba 0)
  const handleDeleteTeam = async () => {
    if (!team) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a equipe "${team.name}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync(team.id);
      dispatch(
        showNotification({
          message: `Equipe "${team.name}" excluída com sucesso.`,
          severity: "success",
        }),
      );
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao excluir equipe.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Adicionar Membro com Função (Aba 1)
  const handleAddMember = async (user: UserMemberItem) => {
    try {
      await addMemberMutation.mutateAsync(user.id);
      // Se for selecionado como Coordenador, atualiza a equipe também
      if (selectedRole === Role.COORDINATOR && team) {
        await updateTeamMutation.mutateAsync({
          id: team.id,
          data: { coordinatorEmail: user.email },
        });
      }

      dispatch(
        showNotification({
          message: `${user.name} adicionado(a) como ${MEMBER_ROLE_LABELS[selectedRole as keyof typeof MEMBER_ROLE_LABELS] || selectedRole}!`,
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
    try {
      await removeMemberMutation.mutateAsync(userId);
      dispatch(
        showNotification({
          message: `${userName} removido(a) da equipe.`,
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

  // Handler para Promover Membro a Coordenador
  const handlePromoteToCoordinator = async (userEmail: string, userName: string) => {
    if (!team) return;
    try {
      await updateTeamMutation.mutateAsync({
        id: team.id,
        data: { coordinatorEmail: userEmail },
      });
      setCoordinatorEmail(userEmail);
      dispatch(
        showNotification({
          message: `${userName} promovido(a) a Coordenador Responsável da equipe!`,
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao promover coordenador.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
        {activeTeam ? `Gerenciar: ${activeTeam.name}` : "Gerenciar Equipe"}
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
            label="Dados Gerais"
          />
          <Tab
            icon={<PersonAddIcon fontSize="small" />}
            iconPosition="start"
            label={`Integrantes (${currentMembers.length})`}
          />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* ABA 0: DADOS GERAIS DA EQUIPE */}
        {tabIndex === 0 && (
          <form id="update-team-form" onSubmit={handleUpdateTeam}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Atualize o nome do laboratório/equipe e o e-mail do
                Coordenador responsável.
              </Typography>

              <TextField
                required
                fullWidth
                label="Nome da Equipe / Laboratório"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <TextField
                fullWidth
                type="email"
                label="E-mail do Coordenador Responsável"
                value={coordinatorEmail}
                onChange={(e) => setCoordinatorEmail(e.target.value)}
                helperText="O Coordenador é o responsável pela aprovação interna e submissão dos artigos"
              />

              <Box
                sx={{
                  pt: 2,
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  borderTop: "1px dashed",
                  borderColor: "divider",
                }}
              >
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

                <Button
                  type="submit"
                  variant="contained"
                  color="warning"
                  disabled={updateTeamMutation.isPending}
                >
                  {updateTeamMutation.isPending
                    ? "Salvando..."
                    : "Salvar Alterações"}
                </Button>
              </Box>
            </Box>
          </form>
        )}

        {/* ABA 1: INTEGRANTES & FUNÇÕES */}
        {tabIndex === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              ADICIONAR PESQUISADOR À EQUIPE
            </Typography>

            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por nome ou e-mail (mín. 3 caracteres)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Função</InputLabel>
                <Select
                  value={selectedRole}
                  label="Função"
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <MenuItem value={Role.AUTHOR}>
                    {MEMBER_ROLE_LABELS.AUTHOR}
                  </MenuItem>
                  <MenuItem value={Role.REVIEWER}>
                    {MEMBER_ROLE_LABELS.REVIEWER}
                  </MenuItem>
                  <MenuItem value={Role.COORDINATOR}>
                    {MEMBER_ROLE_LABELS.COORDINATOR}
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Resultados da Busca em Tempo Real */}
            {search.trim() && searchResults && searchResults.length > 0 && (
              <List
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  maxHeight: 180,
                  overflow: "auto",
                  bgcolor: "background.paper",
                }}
              >
                {searchResults.map((user: UserMemberItem) => (
                  <ListItem
                    key={user.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PersonAddIcon fontSize="small" />}
                        onClick={() => handleAddMember(user)}
                      >
                        Adicionar
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem" }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.name}
                      secondary={user.email}
                      slotProps={{
                        primary: { variant: "body2", sx: { fontWeight: 600 } },
                        secondary: { variant: "caption" },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            {/* Lista de Membros Atuais */}
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mt: 1 }}>
              INTEGRANTES DA EQUIPE ({currentMembers.length})
            </Typography>

            {isLoadingDetails ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <List sx={{ maxHeight: 260, overflow: "auto" }}>
                {currentMembers.map((m) => {
                  const u = m.user;
                  const isCoordinator =
                    u?.id === activeTeam?.coordinatorId ||
                    u?.email === activeTeam?.coordinator?.email;

                  return (
                    <ListItem
                      key={m.id || u?.id}
                      secondaryAction={
                        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                          {!isCoordinator && u?.email && u?.name && (
                            <Button
                              size="small"
                              color="warning"
                              startIcon={<StarIcon fontSize="small" />}
                              onClick={() =>
                                handlePromoteToCoordinator(u.email!, u.name!)
                              }
                            >
                              Coordenar
                            </Button>
                          )}
                          {!isCoordinator && (
                            <IconButton
                              edge="end"
                              size="small"
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
                            sx={{ display: "flex", alignItems: "center", gap: 1 }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {u?.name}
                            </Typography>
                            {isCoordinator ? (
                              <Chip
                                label="Coordenador"
                                size="small"
                                color={MEMBER_ROLE_COLORS.COORDINATOR}
                                sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                label={
                                  MEMBER_ROLE_LABELS[
                                    (u?.role as keyof typeof MEMBER_ROLE_LABELS) ||
                                      "AUTHOR"
                                  ]
                                }
                                size="small"
                                color={
                                  MEMBER_ROLE_COLORS[
                                    (u?.role as keyof typeof MEMBER_ROLE_COLORS) ||
                                      "AUTHOR"
                                  ]
                                }
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            )}
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
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Concluir
        </Button>
      </DialogActions>
    </Dialog>
  );
};
