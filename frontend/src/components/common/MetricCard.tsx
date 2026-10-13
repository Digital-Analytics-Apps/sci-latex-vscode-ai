import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import type { CardProps } from "@mui/material";
import React from "react";

export type DeadlineStatusKey = "ON_TIME" | "WARNING" | "OVERDUE";

const getDeadlineStatusConfig = (
  type: DeadlineStatusKey,
  count: number,
): { color: "success" | "warning" | "error"; label: string } => {
  switch (type) {
    case "ON_TIME":
      return { color: "success", label: `${count} no prazo` };
    case "WARNING":
      return { color: "warning", label: `${count} atenção` };
    case "OVERDUE":
      return { color: "error", label: `${count} atrasado` };
  }
};

/**
 * Chip para Exibição de Status de Prazos (No prazo, Atenção, Atrasado).
 */
export const DeadlineStatusChip = ({
  type,
  count,
}: {
  type: DeadlineStatusKey;
  count: number;
}) => {
  const { color, label } = getDeadlineStatusConfig(type, count);
  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: 11 }}
    />
  );
};

/**
 * Card Reutilizável de Métricas e KPIs (Gerente, Coordenador, Autor).
 */
export interface MetricCardProps extends CardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  color?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  color = "primary.main",
  isLoading = false,
  onClick,
  sx,
  variant = "outlined",
  ...restCardProps
}) => {
  return (
    <Card
      variant={variant}
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: 2,
            }
          : undefined,
        ...sx,
      }}
      onClick={onClick}
      {...restCardProps}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {icon}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
        </Box>

        <Typography variant="h3" sx={{ fontWeight: 800, color }}>
          {isLoading ? <CircularProgress size={28} /> : value}
        </Typography>

        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
