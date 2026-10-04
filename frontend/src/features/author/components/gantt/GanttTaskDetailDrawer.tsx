import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import MergeIcon from "@mui/icons-material/MergeType";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { UserAvatar } from "../../../../components/common/UserAvatar";
import { TaskStatus } from "../../../../constants/status";
import type { ProjectStage } from "../../../../types/stage.types";
import type { TaskItem } from "../../../../types/task.types";
import { getDrawerEntityDetails } from "./ganttUtils";

interface GanttTaskDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  stage?: ProjectStage | null;
  task?: TaskItem | null;
  onStartWorkspace?: (taskId: string, branchName: string) => void;
}

export const GanttTaskDetailDrawer = ({
  open,
  onClose,
  stage,
  task,
  onStartWorkspace,
}: GanttTaskDetailDrawerProps) => {
  const details = getDrawerEntityDetails(stage, task);
  if (!details) return null;

  const {
    isStageNode,
    title,
    branchName,
    status,
    startDate,
    endDate,
    isMerged,
    progress,
    assigneeName,
    assigneeUser,
  } = details;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 420 },
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          },
        },
      }}
    >
      {/* CABEÇALHO DA GAVETA */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 800, letterSpacing: 1 }}
        >
          {isStageNode
            ? "DETALHES DA ETAPA (TASK PRINCIPAL)"
            : "DETALHES DA SUB-TASK"}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* TÍTULO E FEATURE BRANCH */}
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, lineHeight: 1.3, mb: 1 }}
        >
          {title}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <Chip
            icon={<CodeIcon fontSize="small" />}
            label={branchName}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700, fontFamily: "monospace" }}
          />

          {isMerged ? (
            <Chip
              icon={<MergeIcon fontSize="small" />}
              label="PR Mergeado"
              size="small"
              color="success"
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <Chip
              label="Branch Ativa"
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>
      </Box>

      <Divider />

      {/* FORMULÁRIO DE ATRIBUTOS DA TAREFA */}
      <Stack spacing={2}>
        {/* STATUS */}
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, mb: 0.5, display: "block" }}
          >
            STATUS ATUAL
          </Typography>
          <Select
            size="small"
            fullWidth
            value={status}
            sx={{ fontWeight: 700, fontSize: "0.85rem" }}
          >
            <MenuItem value={TaskStatus.NOT_STARTED}>Não Iniciada</MenuItem>
            <MenuItem value={TaskStatus.IN_PROGRESS}>Em Progresso</MenuItem>
            <MenuItem value={TaskStatus.UNDER_REVIEW}>Em Avaliação</MenuItem>
            <MenuItem value={TaskStatus.CHANGES_REQUESTED}>
              Ajustes Solicitados
            </MenuItem>
            <MenuItem value={TaskStatus.APPROVED}>Aprovada</MenuItem>
            <MenuItem value={TaskStatus.MERGED}>Concluída (Mergeada)</MenuItem>
          </Select>
        </Box>

        {/* RESPONSÁVEL / ASSIGNEE */}
        {!isStageNode && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, mb: 0.5, display: "block" }}
            >
              RESPONSÁVEL / ASSIGNEE
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.2,
                borderRadius: 1.5,
                bgcolor: "action.hover",
              }}
            >
              <UserAvatar user={assigneeUser} name={assigneeName} size={32} />
              {assigneeName && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {assigneeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Coautor / Contribuidor Git
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* DATAS (START DATE & DUE DATE) */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="Data de Início"
            type="date"
            size="small"
            value={startDate ? startDate.split("T")[0] : ""}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Data Limite (Due)"
            type="date"
            size="small"
            value={endDate ? endDate.split("T")[0] : ""}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        {/* PROGRESSO (%) */}
        <Box>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              PROGRESSO ESTIMADO
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "primary.main" }}
            >
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Stack>

      <Divider />

      {/* AÇÕES FINAIS (ABRIR NO VS CODE) */}
      <Box sx={{ mt: "auto", pt: 2 }}>
        {!isStageNode && task && onStartWorkspace && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<CodeIcon />}
            onClick={() => onStartWorkspace(task.id, task.branchName)}
            sx={{ py: 1.2, fontWeight: 800, borderRadius: 2 }}
          >
            Abrir Workspace no VS Code
          </Button>
        )}
      </Box>
    </Drawer>
  );
};
