import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../components/common/StandardModal";
import { UserSearchAutocomplete } from "../../components/common/UserSearchAutocomplete";
import { Role } from "../../constants/roles";
import { api } from "../../services/api";
import { type UserMemberItem } from "../../services/usersService";
import { showNotification } from "../../store/slices/notificationSlice";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onMemberAdded?: () => void;
}

export const AddMemberModal = ({
  open,
  onClose,
  projectId,
  onMemberAdded,
}: AddMemberModalProps) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const [role, setRole] = useState<Role>(Role.AUTHOR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca de Usuários via UserSearchAutocomplete
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserMemberItem | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      dispatch(
        showNotification({
          message: "Selecione um usuário para adicionar ao artigo.",
          severity: "warning",
        }),
      );
      return;
    }

    if (!projectId) {
      dispatch(
        showNotification({
          message: "Nenhum artigo selecionado.",
          severity: "error",
        }),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: selectedUser.id,
        role,
      });

      dispatch(
        showNotification({
          message: `${selectedUser.name} foi adicionado como ${
            role === Role.REVIEWER ? "Revisor" : "Co-Autor"
          } com sucesso!`,
          severity: "success",
        }),
      );

      // Invalida as queries do React Query para atualizar o card do artigo e a lista de membros
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["user-articles"] });

      setSelectedUser(null);
      setSelectedUserEmail("");
      if (onMemberAdded) onMemberAdded();
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Erro ao adicionar membro ao artigo.";
      dispatch(showNotification({ message: errorMsg, severity: "error" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<PersonAddIcon color="primary" />}
      title="Adicionar Novo Membro ao Artigo"
      subtitle="Pesquise pesquisadores cadastrados na plataforma para associá-los a este artigo como Co-Autores ou Revisores de Par."
      onSubmit={handleSubmit}
      confirmText="Adicionar Membro"
      confirmColor="primary"
      confirmDisabled={!selectedUser}
      isSubmitting={isSubmitting}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Componente Reutilizável de Busca de Usuários */}
        <UserSearchAutocomplete
          value={selectedUserEmail}
          onChange={(email, user) => {
            setSelectedUserEmail(email);
            setSelectedUser(user || null);
          }}
          size="small"
          label="Buscar Pesquisador (nome ou e-mail)"
          placeholder="Digite para pesquisar..."
          required
        />

        {/* Seleção do Papel no Artigo */}
        <FormControl fullWidth size="small">
          <InputLabel>Papel no Artigo</InputLabel>
          <Select
            value={role}
            label="Papel no Artigo"
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <MenuItem value={Role.AUTHOR}>Co-Autor (AUTHOR)</MenuItem>
            <MenuItem value={Role.REVIEWER}>
              Revisor de Par (REVIEWER)
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
    </StandardModal>
  );
};

