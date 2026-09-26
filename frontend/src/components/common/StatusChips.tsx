import { Chip } from "@mui/material";
import React from "react";
import { NITStatus, PRStatus } from "../../constants/status";

export interface PRStatusChipProps {
  status: string;
}

export const PRStatusChip: React.FC<PRStatusChipProps> = ({ status }) => {
  switch (status) {
    case PRStatus.APPROVED:
      return (
        <Chip
          label="Aprovado"
          size="small"
          color="success"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      );
    case PRStatus.CHANGES_REQUESTED:
      return (
        <Chip
          label="Ajustes Solicitados"
          size="small"
          color="error"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      );
    case PRStatus.UNDER_REVIEW:
      return (
        <Chip
          label="Em Avaliação"
          size="small"
          color="warning"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      );
    case PRStatus.MERGED:
      return (
        <Chip
          label="Mesclado (Merged)"
          size="small"
          color="info"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      );
    default:
      return <Chip label={status} size="small" variant="outlined" />;
  }
};

export interface NITStatusChipProps {
  status: string;
}

export const NITStatusChip: React.FC<NITStatusChipProps> = ({ status }) => {
  switch (status) {
    case NITStatus.APPROVED_NIT:
      return (
        <Chip
          label="NIT Aprovado"
          size="small"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      );
    case NITStatus.REJECTED_NIT:
      return (
        <Chip
          label="NIT Rejeitado"
          size="small"
          color="error"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      );
    case NITStatus.WAITING_NIT:
    default:
      return (
        <Chip
          label="Pendente NIT"
          size="small"
          color="warning"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      );
  }
};

export interface DeadlineStatusChipProps {
  status: "ON_TIME" | "WARNING_SOON" | "OVERDUE" | string;
}

export const DeadlineStatusChip: React.FC<DeadlineStatusChipProps> = ({
  status,
}) => {
  const label =
    status === "ON_TIME"
      ? "No Prazo"
      : status === "WARNING_SOON"
        ? "Atenção"
        : "Atrasado";
  const color =
    status === "ON_TIME"
      ? "success"
      : status === "WARNING_SOON"
        ? "warning"
        : "error";

  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="filled"
      sx={{ fontWeight: 600 }}
    />
  );
};
