import GroupsIcon from "@mui/icons-material/Groups";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useCreateTeamMutation } from "../../../hooks/useTeamQueries";
import { showNotification } from "../../../store/slices/notificationSlice";

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateTeamModal = ({ open, onClose }: CreateTeamModalProps) => {
  const dispatch = useDispatch();
  const createTeamMutation = useCreateTeamMutation();

  const [name, setName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createTeamMutation.mutateAsync({
        name: name.trim(),
        coordinatorEmail: coordinatorEmail.trim() || undefined,
      });
      dispatch(
        showNotification({
          message: `Nova Equipe "${name}" cadastrada com sucesso!`,
          severity: "success",
        }),
      );
      setName("");
      setCoordinatorEmail("");
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao cadastrar equipe de pesquisa.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <GroupsIcon color="warning" />
          Nova Equipe de Pesquisa
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            Cadastre um novo laboratório ou equipe de pesquisa e atribua um
            Coordenador responsável.
          </Typography>

          <TextField
            required
            fullWidth
            label="Nome da Equipe / Laboratório"
            placeholder="Ex: Laboratório de Robótica & IA"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            fullWidth
            type="email"
            label="E-mail do Coordenador (Opcional)"
            placeholder="Ex: coordenador@instituicao.org"
            value={coordinatorEmail}
            onChange={(e) => setCoordinatorEmail(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="warning"
            disabled={createTeamMutation.isPending}
          >
            {createTeamMutation.isPending
              ? "Cadastrando..."
              : "Cadastrar Equipe"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
