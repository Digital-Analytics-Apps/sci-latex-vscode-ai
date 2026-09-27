import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LaunchIcon from "@mui/icons-material/Launch";
import LockIcon from "@mui/icons-material/Lock";
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
import { type TaskItem, TaskStatus } from "../../../services/tasksService";
import { formatDate } from "../../../utils/dateUtils";

export const TaskTitleBranchCell = ({ row }: { row: TaskItem }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      py: 0.5,
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
      {row.title}
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
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

export const TaskAssigneeCell = ({ row }: { row: TaskItem }) => {
  const name =
    typeof row.assignee === "object" && row.assignee
      ? (row.assignee as any).name || "Não atribuído"
      : typeof row.assignee === "string"
        ? row.assignee
        : "Não atribuído";

  const email =
    typeof row.assignee === "object" && row.assignee
      ? (row.assignee as any).email || ""
      : "";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.5,
      }}
    >
      <Avatar
        sx={{
          width: 24,
          height: 24,
          fontSize: "0.75rem",
          bgcolor: "primary.main",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Stack spacing={0}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontSize: "0.85rem" }}
        >
          {name}
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
}) => {
  const isOccupiedByOther =
    row.isOccupied && row.occupiedBy && row.occupiedBy.id !== currentUserId;

  const isMerged = row.status === TaskStatus.MERGED;
  const isProvisioning = provisioningTaskId === row.id;

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
};
