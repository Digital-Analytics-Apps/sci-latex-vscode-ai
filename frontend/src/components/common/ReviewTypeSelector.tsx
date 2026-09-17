import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

export type ReviewType = "TECHNICAL_REVIEW" | "PEER_REVIEW";

interface ReviewTypeSelectorProps {
  value: ReviewType;
  onChange: (val: ReviewType) => void;
  label?: string;
}

export const ReviewTypeSelector = ({
  value,
  onChange,
  label = "Tipo de Revisão (ADR-003)",
}: ReviewTypeSelectorProps) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        onChange={(_, val) => val && onChange(val)}
        color="primary"
      >
        <ToggleButton value="TECHNICAL_REVIEW" sx={{ textTransform: "none" }}>
          🎓 Revisão Técnica (Orientador)
        </ToggleButton>
        <ToggleButton value="PEER_REVIEW" sx={{ textTransform: "none" }}>
          👥 Revisão entre Pares (Co-autores)
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
