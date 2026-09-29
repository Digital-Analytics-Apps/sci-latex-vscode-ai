import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { SyntheticEvent } from "react";
import type { AcademicPeriod } from "../../../../types/academic-period.types";

interface TeamGoalsTabProps {
  periods?: AcademicPeriod[];
  selectedPeriodId: string;
  setSelectedPeriodId: (id: string) => void;
  targetArticles: number;
  setTargetArticles: (val: number) => void;
  onSubmit: (e: SyntheticEvent) => void;
}

export const TeamGoalsTab = ({
  periods,
  selectedPeriodId,
  setSelectedPeriodId,
  targetArticles,
  setTargetArticles,
  onSubmit,
}: TeamGoalsTabProps) => {
  return (
    <Box
      component="form"
      id="team-goal-form"
      onSubmit={onSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        Defina a meta/cota de artigos científicos a serem produzidos por este
        laboratório no Ciclo Acadêmico ativo.
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
    </Box>
  );
};
