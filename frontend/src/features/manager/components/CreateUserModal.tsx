import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../../components/common/StandardModal";
import { Role } from "../../../constants/roles";
import { MEMBER_ROLE_LABELS } from "../../../constants/teams";
import { useCreateUserMutation } from "../../../hooks/useUserQueries";
import { showNotification } from "../../../store/slices/notificationSlice";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateUserModal = ({ open, onClose }: CreateUserModalProps) => {
  const dispatch = useDispatch();
  const createUserMutation = useCreateUserMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(Role.AUTHOR);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    try {
      await createUserMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
      });

      dispatch(
        showNotification({
          message: `Membro "${name}" cadastrado com sucesso com a função ${MEMBER_ROLE_LABELS[role as keyof typeof MEMBER_ROLE_LABELS] || role}!`,
          severity: "success",
        }),
      );

      setName("");
      setEmail("");
      setPassword("");
      setRole(Role.AUTHOR);
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao cadastrar novo integrante.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<PersonAddIcon color="primary" />}
      title="Cadastrar Novo Integrante"
      subtitle="Cadastre um novo usuário no sistema e atribua seu papel de acesso institucional."
      onSubmit={handleSubmit}
      confirmText="Cadastrar Integrante"
      confirmColor="primary"
      isSubmitting={createUserMutation.isPending}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        <TextField
          required
          fullWidth
          label="Nome Completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          required
          fullWidth
          type="email"
          label="E-mail Institucional"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          required
          fullWidth
          type="password"
          label="Senha Inicial"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          slotProps={{
            htmlInput: { minLength: 6 },
          }}
        />

        <FormControl fullWidth required>
          <InputLabel>Função Institucional</InputLabel>
          <Select
            value={role}
            label="Função Institucional"
            onChange={(e) => setRole(e.target.value)}
          >
            <MenuItem value={Role.AUTHOR}>{MEMBER_ROLE_LABELS.AUTHOR}</MenuItem>
            <MenuItem value={Role.REVIEWER}>
              {MEMBER_ROLE_LABELS.REVIEWER}
            </MenuItem>
            <MenuItem value={Role.COORDINATOR}>
              {MEMBER_ROLE_LABELS.COORDINATOR}
            </MenuItem>
            <MenuItem value={Role.MANAGER}>
              {MEMBER_ROLE_LABELS.MANAGER}
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
    </StandardModal>
  );
};
