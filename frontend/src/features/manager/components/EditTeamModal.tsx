import EditIcon from "@mui/icons-material/Edit";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useUpdateTeamMutation } from "../../../hooks/useTeamQueries";
import { showNotification } from "../../../store/slices/notificationSlice";
import type { TeamItem } from "../../../types/team.types";

interface EditTeamModalProps {
  open: boolean;
  onClose: () => void;
  team: TeamItem | null;
}

export const EditTeamModal = ({ open, onClose, team }: EditTeamModalProps) => {
  const dispatch = useDispatch();
  const updateTeamMutation = useUpdateTeamMutation();

  const [name, setName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");

  useEffect(() => {
    if (team) {
      setName(team.name || "");
      setCoordinatorEmail(team.coordinator?.email || "");
    }
  }, [team]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
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
          message: `Equipe "${name}" atualizada com sucesso!`,
          severity: "success",
        }),
      );
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao atualizar dados da equipe.",
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
          <EditIcon color="warning" />
          Editar Equipe de Pesquisa
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            Altere o nome do laboratório ou atualize o e-mail do Coordenador
            responsável.
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
            label="E-mail do Coordenador"
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
            disabled={updateTeamMutation.isPending}
          >
            {updateTeamMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
