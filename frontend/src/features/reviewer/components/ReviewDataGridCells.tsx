import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArticleIcon from "@mui/icons-material/Article";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Avatar, Box, Button, Chip, Tooltip, Typography } from "@mui/material";
import type { PullRequestDetail } from "../../../hooks/useReviewQueries";
import { formatDate } from "../../../utils/dateUtils";
export const ProjectCell = ({ row }: { row: PullRequestDetail }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      height: "100%",
      py: 0.5,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <ArticleIcon fontSize="small" color="primary" />
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, color: "text.primary" }}
      >
        {row.project?.name || "Projeto Acadêmico"}
      </Typography>
    </Box>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontFamily: "monospace" }}
    >
      PR ID: #{row.id.slice(0, 8)}
    </Typography>
  </Box>
);

export const SubmissionTitleCell = ({ row }: { row: PullRequestDetail }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      height: "100%",
      py: 0.5,
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 700 }}>
      {row.title}
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Seção: {row.task?.title || row.taskId || "Seção TeX"}
      </Typography>
      {row.task?.branchName && (
        <Chip
          label={row.task.branchName}
          size="small"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            fontFamily: "monospace",
          }}
        />
      )}
    </Box>
  </Box>
);

export const AuthorCell = ({ row }: { row: PullRequestDetail }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      height: "100%",
    }}
  >
    <Avatar
      sx={{
        width: 32,
        height: 32,
        fontSize: "0.8rem",
        bgcolor: "primary.main",
      }}
    >
      {row.author?.name?.charAt(0).toUpperCase() || "A"}
    </Avatar>
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {row.author?.name || "Autor Não Identificado"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {row.author?.email || "autor@sci-latex.org"}
      </Typography>
    </Box>
  </Box>
);

export const SentDateCell = ({ row }: { row: PullRequestDetail }) => (
  <Tooltip title={`Criado em: ${formatDate(row.createdAt)}`}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.8,
        height: "100%",
      }}
    >
      <AccessTimeIcon fontSize="small" color="action" />
      <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
        {formatDate(row.sentToNitAt || row.createdAt)}
      </Typography>
    </Box>
  </Tooltip>
);

export const ReviewActionCell = ({
  prId,
  onEvaluate,
}: {
  prId: string;
  onEvaluate: (id: string) => void;
}) => (
  <Button
    variant="contained"
    size="small"
    color="primary"
    startIcon={<VisibilityIcon fontSize="small" />}
    onClick={() => onEvaluate(prId)}
    sx={{
      textTransform: "none",
      fontWeight: 600,
      borderRadius: 1.5,
    }}
  >
    Avaliar (Diff & PDF)
  </Button>
);
