import FlagIcon from "@mui/icons-material/Flag";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  useAcademicPeriods,
  useSetTeamGoalMutation,
} from "../../../hooks/useManagementQueries";
import { useTeamsQuery } from "../../../hooks/useTeamQueries";
import { showNotification } from "../../../store/slices/notificationSlice";

interface SetTeamGoalModalProps {
  open: boolean;
  onClose: () => void;
  defaultPeriodId?: string;
}

export const SetTeamGoalModal = ({
  open,
  onClose,
  defaultPeriodId,
}: SetTeamGoalModalProps) => {
  const dispatch = useDispatch();
  const { data: periods } = useAcademicPeriods();
  const { data: teams } = useTeamsQuery();
  const setGoalMutation = useSetTeamGoalMutation();

  const [periodId, setPeriodId] = useState(defaultPeriodId || "");
  const [teamId, setTeamId] = useState("");
  const [targetArticles, setTargetArticles] = useState<number>(5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activePeriodId = periodId || periods?.[0]?.id;
    if (!activePeriodId || !teamId) return;

    try {
      await setGoalMutation.mutateAsync({
        academicPeriodId: activePeriodId,
        teamId,
        targetArticles: Number(targetArticles),
      });
      dispatch(
        showNotification({
          message: "Cota/Meta da equipe definida com sucesso!",
          severity: "success",
        }),
      );
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao definir cota da equipe.",
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
          <FlagIcon color="warning" />
          Definir Cota da Equipe
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            Atribua uma cota específica de artigos publicados para um
            laboratório ou equipe de pesquisa.
          </Typography>

          <FormControl fullWidth required>
            <InputLabel>Ciclo Acadêmico</InputLabel>
            <Select
              value={periodId || periods?.[0]?.id || ""}
              label="Ciclo Acadêmico"
              onChange={(e) => setPeriodId(e.target.value)}
            >
              {periods?.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel>Equipe / Laboratório</InputLabel>
            <Select
              value={teamId}
              label="Equipe / Laboratório"
              onChange={(e) => setTeamId(e.target.value)}
            >
              {teams?.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            required
            fullWidth
            type="number"
            label="Cota Alocada (Artigos)"
            value={targetArticles}
            onChange={(e) => setTargetArticles(Number(e.target.value))}
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
            disabled={setGoalMutation.isPending}
          >
            {setGoalMutation.isPending ? "Salvando..." : "Definir Cota"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
