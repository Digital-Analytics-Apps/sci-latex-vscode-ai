import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useTeamDetailsQuery,
} from "../../../hooks/useTeamQueries";
import { useUserSearchQuery } from "../../../hooks/useUserQueries";
import { showNotification } from "../../../store/slices/notificationSlice";
import type { TeamItem } from "../../../types/team.types";
import type { UserMemberItem } from "../../../types/user.types";

interface TeamMembersDrawerProps {
  open: boolean;
  onClose: () => void;
  team: TeamItem | null;
}

export const TeamMembersDrawer = ({
  open,
  onClose,
  team,
}: TeamMembersDrawerProps) => {
  const dispatch = useDispatch();
  const teamId = team?.id || "";

  const { data: teamDetails, isLoading } = useTeamDetailsQuery(teamId);
  const addMemberMutation = useAddTeamMemberMutation(teamId);
  const removeMemberMutation = useRemoveTeamMemberMutation(teamId);

  const [search, setSearch] = useState("");
  const { data: searchResults } = useUserSearchQuery(search);

  const activeTeam = teamDetails || team;
  const currentMembers = activeTeam?.members || [];

  const handleAddMember = async (user: UserMemberItem) => {
    try {
      await addMemberMutation.mutateAsync(user.id);
      dispatch(
        showNotification({
          message: `${user.name} adicionado(a) à equipe com sucesso!`,
          severity: "success",
        }),
      );
      setSearch("");
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao adicionar membro à equipe.",
          severity: "error",
        }),
      );
    }
  };

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
          message: "Erro ao remover membro da equipe.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: 380,
          p: 3,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Membros da Equipe
        </Typography>
        <Typography
          variant="subtitle2"
          color="primary.main"
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {activeTeam?.name}
        </Typography>

        {/* Adicionar Novo Membro via Busca */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, mb: 1, display: "block" }}
          >
            ADICIONAR NOVO PESQUISADOR
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search.trim() && searchResults && searchResults.length > 0 && (
            <List
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                mt: 1,
                maxHeight: 180,
                overflow: "auto",
              }}
            >
              {searchResults.map((user: UserMemberItem) => (
                <ListItem
                  key={user.id}
                  secondaryAction={
                    <Button
                      size="small"
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
        </Box>

        {/* Lista de Membros Atuais */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 1 }}
        >
          INTEGRANTES DA EQUIPE ({currentMembers.length})
        </Typography>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <List sx={{ flexGrow: 1, overflow: "auto" }}>
            {currentMembers.map((m) => {
              const u = m.user;
              const isCoordinator = u?.id === activeTeam?.coordinatorId;

              return (
                <ListItem
                  key={m.id || u?.id}
                  secondaryAction={
                    !isCoordinator && (
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={() =>
                          handleRemoveMember(u?.id || "", u?.name || "Membro")
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )
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
                        {isCoordinator && (
                          <Chip
                            label="Coordenador"
                            size="small"
                            color="warning"
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

        <Button variant="outlined" fullWidth onClick={onClose} sx={{ mt: 2 }}>
          Concluir
        </Button>
      </Box>
    </Drawer>
  );
};
