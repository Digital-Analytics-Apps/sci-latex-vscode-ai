import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import LaunchIcon from "@mui/icons-material/Launch";
import LockIcon from "@mui/icons-material/Lock";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { TaskStatus } from "../../../constants/status";
import { colors } from "../../../theme/tokens";
import type { TaskItem } from "../../../types/task.types";
import { formatDate } from "../../../utils/dateUtils";

const getStageColorStyle = (order?: number, isGatekeeper?: boolean) => {
  if (isGatekeeper) {
    return {
      bg: "rgba(245, 158, 11, 0.15)",
      color: colors.amber[400],
      borderColor: colors.amber[600],
    };
  }
  const themeStageColors = [
    {
      bg: "rgba(14, 165, 233, 0.15)",
      color: colors.sky[300],
      borderColor: colors.sky[700],
    }, // Etapa 1 - Sky Blue
    {
      bg: "rgba(168, 85, 247, 0.15)",
      color: colors.purple[300],
      borderColor: colors.purple[700],
    }, // Etapa 2 - Purple
    {
      bg: "rgba(20, 184, 166, 0.15)",
      color: colors.teal[300],
      borderColor: colors.teal[700],
    }, // Etapa 3 - Teal
    {
      bg: "rgba(16, 185, 129, 0.15)",
      color: colors.emerald[300],
      borderColor: colors.emerald[700],
    }, // Etapa 4 - Emerald
    {
      bg: "rgba(249, 115, 22, 0.15)",
      color: colors.orange[300],
      borderColor: colors.orange[700],
    }, // Etapa 5 - Orange
  ];
  const idx = ((order || 1) - 1) % themeStageColors.length;
  return themeStageColors[idx];
};

export const TaskTitleBranchCell = ({ row }: { row: TaskItem }) => {
  const stageTitle = row.stage?.title || "Planejamento e Pesquisa";
  const stageOrder = row.stage?.order || 1;
  const isGatekeeper = Boolean(row.stage?.isGatekeeper);

  const style = getStageColorStyle(stageOrder, isGatekeeper);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        py: 0.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.3,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}
        >
          {row.title}
        </Typography>

        <Chip
          label={stageTitle}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.68rem",
            fontWeight: 700,
            borderRadius: 1,
            bgcolor: style.bg,
            color: style.color,
            border: "1px solid",
            borderColor: style.borderColor,
            px: 0.5,
          }}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {row.branchName && (
          <Chip
            label={row.branchName}
            size="small"
            variant="outlined"
            sx={{
              height: 18,
              fontSize: "0.65rem",
              fontFamily: "monospace",
              borderColor: "divider",
            }}
          />
        )}
        {row.isOccupied && row.occupiedBy && (
          <Chip
            label={`🔒 Em uso por ${row.occupiedBy.name}`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 600 }}
          />
        )}
      </Box>
    </Box>
  );
};

export interface TaskAssigneeCellProps {
  row: TaskItem;
  currentUserId?: string;
  onClaimTask?: (taskId: string) => void;
  onUnclaimTask?: (taskId: string) => void;
  isClaiming?: boolean;
  isUnclaiming?: boolean;
}

export const TaskAssigneeCell = ({
  row,
  currentUserId,
  onClaimTask,
  onUnclaimTask,
  isClaiming = false,
  isUnclaiming = false,
}: TaskAssigneeCellProps) => {
  const isUnassigned =
    !row.assignedToId &&
    (!row.assignee ||
      row.assignee === "Não atribuído" ||
      (typeof row.assignee === "object" && !(row.assignee as any).name));

  const isAssignedToMe = row.assignedToId === currentUserId;

  if (isUnassigned) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
        <Chip
          label="Não Atribuído"
          size="small"
          variant="outlined"
          color="default"
          sx={{
            fontSize: "0.75rem",
            fontStyle: "italic",
            borderColor: "divider",
          }}
        />
        {onClaimTask && (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            disabled={isClaiming}
            startIcon={
              isClaiming ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <HowToRegIcon sx={{ fontSize: 16 }} />
              )
            }
            onClick={() => onClaimTask(row.id)}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              py: 0.3,
              px: 1.2,
              height: 28,
            }}
          >
            {isClaiming ? "Assinando..." : "Assinar"}
          </Button>
        )}
      </Box>
    );
  }

  const name =
    typeof row.assignee === "object" && row.assignee
      ? (row.assignee as any).name || "Autor"
      : typeof row.assignee === "string"
        ? row.assignee
        : "Autor";

  const email =
    typeof row.assignee === "object" && row.assignee
      ? (row.assignee as any).email || ""
      : "";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        width: "100%",
        py: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar
          sx={{
            width: 30,
            height: 30,
            fontSize: "0.85rem",
            fontWeight: 700,
            bgcolor: isAssignedToMe ? "primary.main" : "secondary.main",
          }}
        >
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Stack spacing={0}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.2 }}
          >
            {name} {isAssignedToMe && "(Você)"}
          </Typography>
          {email && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.7rem", lineHeight: 1 }}
            >
              {email}
            </Typography>
          )}
        </Stack>
      </Box>

      {isAssignedToMe && onUnclaimTask && (
        <Tooltip title="Desassinar tarefa (liberar para outros autores)">
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            disabled={isUnclaiming}
            startIcon={
              isUnclaiming ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <PersonRemoveIcon sx={{ fontSize: 16 }} />
              )
            }
            onClick={() => onUnclaimTask(row.id)}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              py: 0.3,
              px: 1.2,
              height: 28,
              minWidth: "auto",
            }}
          >
            {isUnclaiming ? "Saindo..." : "Desassinar"}
          </Button>
        </Tooltip>
      )}
    </Box>
  );
};

export const TaskDueDateCell = ({ row }: { row: TaskItem }) => {
  if (!row.dueDate) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sem prazo definido
      </Typography>
    );
  }

  return (
    <Tooltip title={`Data Limite: ${formatDate(row.dueDate)}`}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <AccessTimeIcon fontSize="small" color="action" />
        <Typography
          variant="caption"
          sx={{ fontSize: "0.85rem", fontWeight: 600 }}
        >
          {formatDate(row.dueDate)}
        </Typography>
      </Stack>
    </Tooltip>
  );
};

export type ChipColor =
  | "success"
  | "warning"
  | "error"
  | "primary"
  | "default"
  | "secondary"
  | "info";

export const getTaskStatusConfig = (
  status: TaskStatus,
): { color: ChipColor; label: string } => {
  switch (status) {
    case TaskStatus.MERGED:
      return { color: "success", label: "Concluída (Merged)" };
    case TaskStatus.APPROVED:
      return { color: "success", label: "Aprovada" };
    case TaskStatus.UNDER_REVIEW:
      return { color: "warning", label: "Em Avaliação" };
    case TaskStatus.CHANGES_REQUESTED:
      return { color: "error", label: "Ajustes Solicitados" };
    case TaskStatus.IN_PROGRESS:
      return { color: "primary", label: "Em Progresso" };
    case TaskStatus.NOT_STARTED:
    default:
      return { color: "default", label: "Não Iniciada" };
  }
};

export const TaskStatusChip = ({ status }: { status: TaskStatus }) => {
  const { color, label } = getTaskStatusConfig(status);

  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
};

export const TaskActionCell = ({
  row,
  provisioningTaskId,
  currentUserId,
  onStartWorkspace,
}: {
  row: TaskItem;
  provisioningTaskId: string | null;
  currentUserId?: string;
  onStartWorkspace: (task: TaskItem) => void;
  onClaimTask?: (taskId: string) => void;
  onUnclaimTask?: (taskId: string) => void;
  isClaiming?: boolean;
  isUnclaiming?: boolean;
}) => {
  const isOccupiedByOther =
    row.isOccupied && row.occupiedBy && row.occupiedBy.id !== currentUserId;

  const isMerged = row.status === TaskStatus.MERGED;
  const isProvisioning = provisioningTaskId === row.id;
  const isAssignedToMe = row.assignedToId === currentUserId;

  if (isMerged) {
    return (
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        disabled
        startIcon={<CheckCircleIcon fontSize="small" />}
        sx={{ fontWeight: 600 }}
      >
        Tarefa Concluída
      </Button>
    );
  }

  if (isOccupiedByOther) {
    return (
      <Button
        variant="outlined"
        color="warning"
        size="small"
        disabled
        startIcon={<LockIcon fontSize="small" />}
        sx={{ fontWeight: 600 }}
      >
        🔒 Em uso por {row.occupiedBy?.name}
      </Button>
    );
  }

  // Tarefa atribuída ao usuário atual: Botão Iniciar Workspace
  if (isAssignedToMe) {
    return (
      <Button
        variant="contained"
        color="primary"
        size="small"
        disabled={isProvisioning}
        startIcon={
          isProvisioning ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <LaunchIcon fontSize="small" />
          )
        }
        onClick={() => onStartWorkspace(row)}
        sx={{ fontWeight: 700 }}
      >
        {isProvisioning ? "⚡ Provisionando..." : "🚀 Iniciar Workspace"}
      </Button>
    );
  }

  // Tarefa não atribuída ou atribuída a outro autor
  return (
    <Typography
      variant="caption"
      color="text.disabled"
      sx={{ fontStyle: "italic" }}
    >
      Aguardando atribuição
    </Typography>
  );
};
