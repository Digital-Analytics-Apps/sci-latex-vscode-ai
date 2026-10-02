import { Box, Chip, Typography } from "@mui/material";
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export interface WelcomeHeaderProps {
  userName?: string;
  title?: string;
  subtitle?: string;
  chipLabel?: string;
  chipColor?:
    | "default"
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "error";
  action?: React.ReactNode;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  userName,
  title,
  subtitle = "Seja bem-vindo à Plataforma de Escrita Científica.",
  chipLabel,
  chipColor = "primary",
  action,
}) => {
  const reduxUser = useSelector((state: RootState) => state.auth.user);
  const nameToDisplay = userName || reduxUser?.name || "Pesquisador";
  const displayTitle = title || `Olá, ${nameToDisplay} 👋`;

  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
            {displayTitle}
          </Typography>
          {chipLabel && (
            <Chip
              label={chipLabel}
              color={chipColor}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {action && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {action}
        </Box>
      )}
    </Box>
  );
};
