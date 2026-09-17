import { Box, Chip, Typography } from "@mui/material";

interface ActiveTaskCardProps {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusColor?: "primary" | "secondary" | "success" | "warning" | "info";
}

export const ActiveTaskCard = ({
  title,
  subtitle = "Tarefa Vinculada a esta Workspace",
  statusLabel = "Em Edição",
  statusColor = "primary",
}: ActiveTaskCardProps) => {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block" }}
        >
          {subtitle}
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          {title}
        </Typography>
      </Box>
      <Chip
        label={statusLabel}
        color={statusColor}
        size="small"
        variant="outlined"
      />
    </Box>
  );
};
