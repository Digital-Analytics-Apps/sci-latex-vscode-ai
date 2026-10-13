import React from "react";
import { Chip, Tooltip } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { StageStatus } from "../../constants/status";
import type { GatekeeperType } from "../../types/stage.types";

interface GatekeeperLockBadgeProps {
  isGatekeeper: boolean;
  gatekeeperType?: GatekeeperType | null;
  status: StageStatus;
  title: string;
}

export const GatekeeperLockBadge: React.FC<GatekeeperLockBadgeProps> = ({
  isGatekeeper,
  gatekeeperType,
  status,
  title,
}) => {
  if (!isGatekeeper) return null;

  const isNit = gatekeeperType === "NIT" || title.toLowerCase().includes("nit");

  if (isNit) {
    if (status === StageStatus.COMPLETED) {
      return (
        <Tooltip title="Parecer Favorável do NIT Aprovado! Trava liberada para Submissão.">
          <Chip
            icon={<CheckCircleIcon />}
            label="NIT: Parecer Favorável"
            color="success"
            variant="filled"
            size="small"
            sx={{ fontWeight: "bold" }}
          />
        </Tooltip>
      );
    }

    if (status === StageStatus.IN_PROGRESS) {
      return (
        <Tooltip title="Artigo sob análise institucional do NIT.">
          <Chip
            icon={<HourglassEmptyIcon />}
            label="NIT: Em Análise"
            color="warning"
            variant="outlined"
            size="small"
            sx={{ fontWeight: "bold" }}
          />
        </Tooltip>
      );
    }

    return (
      <Tooltip title="Trava de Governança 1: Exige 100% das etapas de conteúdo finalizadas antes de enviar ao NIT.">
        <Chip
          icon={<LockIcon />}
          label="NIT: Trava Ativa"
          color="error"
          variant="outlined"
          size="small"
          sx={{ fontWeight: "bold" }}
        />
      </Tooltip>
    );
  }

  // Gatekeeper 2: Target Conference
  if (status === StageStatus.COMPLETED) {
    return (
      <Tooltip title="Artigo Submetido com sucesso ao Congresso Alvo!">
        <Chip
          icon={<CheckCircleIcon />}
          label="Congresso: Submetido"
          color="primary"
          variant="filled"
          size="small"
          sx={{ fontWeight: "bold" }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Trava de Governança 2: A submissão ao Congresso Alvo exige o Parecer Favorável do NIT.">
      <Chip
        icon={<LockIcon />}
        label="Congresso: Submissão Bloqueada"
        color="default"
        variant="outlined"
        size="small"
        sx={{ fontWeight: "bold", opacity: 0.8 }}
      />
    </Tooltip>
  );
};
