import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import { UserSearchAutocomplete } from "../../../../components/common/UserSearchAutocomplete";
import { Role } from "../../../../constants/roles";
import {
  MEMBER_ROLE_COLORS,
  MEMBER_ROLE_LABELS,
} from "../../../../constants/teams";
import type { TeamItem } from "../../../../types/team.types";
import type { UserMemberItem } from "../../../../types/user.types";

interface TeamMembersTabProps {
  currentTeam: TeamItem | null;
  currentMembers: any[];
  isLoadingDetails: boolean;
  search: string;
  setSearch: (value: string) => void;
  searchResults?: UserMemberItem[];
  onAddMember: (user: UserMemberItem) => void;
  onRemoveMember: (userId: string, userName: string) => void;
  onPromoteCoordinator: (userEmail: string, userName: string) => void;
  isAddPending: boolean;
}

export const TeamMembersTab = ({
  currentTeam,
  currentMembers,
  isLoadingDetails,
  search,
  setSearch,
  searchResults,
  onAddMember,
  onRemoveMember,
  onPromoteCoordinator,
  isAddPending,
}: TeamMembersTabProps) => {
  const renderMembersList = () => {
    if (isLoadingDetails) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (currentMembers.length === 0) {
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: "italic", py: 2 }}
        >
          Nenhum integrante vinculado a esta equipe ainda.
        </Typography>
      );
    }

    return (
      <List dense sx={{ width: "100%" }}>
        {currentMembers.map(({ user }) => {
          const u = user;
          const memberRole = user?.role;
          const isCoordinator =
            currentTeam?.coordinator?.email === u?.email ||
            memberRole === Role.COORDINATOR;

          const roleLabel = isCoordinator
            ? "Coordenador"
            : MEMBER_ROLE_LABELS[
                memberRole as keyof typeof MEMBER_ROLE_LABELS
              ] || "Membro";

          const chipColor = isCoordinator
            ? "warning"
            : MEMBER_ROLE_COLORS[
                memberRole as keyof typeof MEMBER_ROLE_COLORS
              ] || "default";

          return (
            <ListItem
              key={u?.id}
              divider
              secondaryAction={
                <Box sx={{ display: "flex", gap: 1 }}>
                  {!isCoordinator && (
                    <IconButton
                      size="small"
                      title="Promover a Coordenador"
                      color="warning"
                      onClick={() => onPromoteCoordinator(u.email, u.name)}
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
                        onRemoveMember(u?.id || "", u?.name || "Membro")
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
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {u?.name}
                    </Typography>
                    <Chip
                      label={roleLabel}
                      size="small"
                      variant="outlined"
                      color={chipColor}
                    />
                  </Box>
                }
                secondary={u?.email}
              />
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
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
                  onAddMember(user);
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
                (m) => (m.userId || m.id || m.user?.id) === u.id,
              );
              return (
                <ListItem
                  key={u.id}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="contained"
                      disabled={isMember || isAddPending}
                      onClick={() => onAddMember(u)}
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
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: -1 }}>
        Integrantes Atuais ({currentMembers.length})
      </Typography>

      {renderMembersList()}
    </Box>
  );
};
