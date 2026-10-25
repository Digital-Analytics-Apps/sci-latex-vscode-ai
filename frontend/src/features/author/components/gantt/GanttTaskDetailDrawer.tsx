import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  currentUserId?: string;
  provisioningTaskId?: string | null;
  onStartWorkspace?: (task: TaskItem) => void | Promise<void>;
  onClaimTask?: (taskId: string) => void;
  onUnclaimTask?: (taskId: string) => void;
  isClaiming?: boolean;
  isUnclaiming?: boolean;
  onRequestReview?: (taskId: string) => void;
  onApproveTask?: (taskId: string) => void;
  onRequestChanges?: (taskId: string) => void;
  isReviewer?: boolean;
}

export const GanttTaskDetailDrawer = ({
  open,
  onClose,
  stage,
  task,
  currentUserId,
  provisioningTaskId: _provisioningTaskId,
  onStartWorkspace,
  onClaimTask,
  onUnclaimTask,
  isClaiming = false,
  isUnclaiming = false,
  onRequestReview,
  onApproveTask,
  onRequestChanges,
  isReviewer = false,
}: GanttTaskDetailDrawerProps) => {
  const details = getDrawerEntityDetails(stage, task);
  if (!details) return null;

  const {
    isStageNode,
    title,
    status,
    startDate,
    endDate,
    isMerged,
    progress,
    assigneeName,
    assigneeUser,
  } = details;

  const isAssignedToMe = Boolean(
    task?.assignedToId && currentUserId && task.assignedToId === currentUserId,
  );
  const isBlockedByPrevious = Boolean(task?.isBlockedByPrevious);
  const isReadOnly =
    !isStageNode &&
    Boolean(task) &&
    (!isAssignedToMe || isMerged);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 440 },
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
            ? "DETALHES DA ETAPA"
            : `DETALHES DA SUB-TASK ${isReadOnly ? "(SOMENTE LEITURA)" : ""}`}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ALERTAS DE SEGURANÇA, BLOQUEIO E READ-ONLY */}

      {!isStageNode &&
        !isStageNode &&
        task?.assignedToId &&
        !isAssignedToMe && (
          <Alert severity="info" icon={<LockIcon fontSize="small" />}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, display: "block" }}
            >
              Tarefa Atribuída a Outro Autor (Somente Leitura)
            </Typography>
            Esta sub-tarefa pertence a <strong>{assigneeName}</strong>. Todos os
            campos estão bloqueados para edição.
          </Alert>
        )}

      {!isStageNode && !task?.assignedToId && (
        <Alert severity="info" icon={<LockIcon fontSize="small" />}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, display: "block" }}
          >
            Sub-tarefa Não Atribuída
          </Typography>
          Assine esta sub-tarefa para habilitar a edição de prazos, status e
          liberação do workspace.
        </Alert>
      )}

      {isBlockedByPrevious && !isMerged && (
        <Alert severity="info" icon={<LockIcon fontSize="small" />}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, display: "block" }}
          >
            Sub-tarefa Bloqueada (Fila Sequencial)
          </Typography>
          Aguardando a sub-tarefa anterior da mesma etapa ser concluída e
          mesclada.
        </Alert>
      )}

      {/* TÍTULO E STATUS */}
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

          {isMerged ? (
            <Chip
              icon={<CheckCircleIcon fontSize="small" />}
              label="Concluída"
              size="small"
              color="success"
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <Chip
              label="Em Andamento"
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
            STATUS ATUAL {isReadOnly && "(SOMENTE LEITURA)"}
          </Typography>
          <Select
            size="small"
            fullWidth
            value={status}
            disabled={isReadOnly}
            sx={{ fontWeight: 700, fontSize: "0.85rem" }}
          >
            <MenuItem value={TaskStatus.NOT_STARTED}>Não Iniciada</MenuItem>
            <MenuItem value={TaskStatus.IN_PROGRESS}>Em Andamento</MenuItem>
            <MenuItem value={TaskStatus.REVIEW_REQUESTED}>Aguardando Revisão</MenuItem>
            <MenuItem value={TaskStatus.IN_REVIEW}>Em Revisão</MenuItem>
            <MenuItem value={TaskStatus.CHANGES_REQUESTED}>Ajustes Solicitados</MenuItem>
            <MenuItem value={TaskStatus.COMPLETED}>Concluída</MenuItem>
          </Select>
        </Box>

        {/* RESPONSÁVEL / ASSIGNEE */}
        {!isStageNode && task && (
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
                justifyContent: "space-between",
                gap: 1.5,
                p: 1.2,
                borderRadius: 1.5,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <UserAvatar
                  user={assigneeUser}
                  name={assigneeName || "Autor"}
                  size={32}
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {assigneeName || "Não Atribuído"}{" "}
                    {isAssignedToMe && "(Você)"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Autor Responsável
                  </Typography>
                </Box>
              </Box>

              {/* BOTOES DE ATRIBUIÇÃO */}
              {!task.assignedToId && onClaimTask && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  disabled={isClaiming}
                  startIcon={
                    isClaiming ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <HowToRegIcon fontSize="small" />
                    )
                  }
                  onClick={() => onClaimTask(task.id)}
                  sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                >
                  Assinar
                </Button>
              )}

              {isAssignedToMe && onUnclaimTask && (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  disabled={isUnclaiming}
                  startIcon={
                    isUnclaiming ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <PersonRemoveIcon fontSize="small" />
                    )
                  }
                  onClick={() => onUnclaimTask(task.id)}
                  sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                >
                  Desassinar
                </Button>
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
            disabled={isReadOnly}
            value={startDate ? startDate.split("T")[0] : ""}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { readOnly: isReadOnly },
            }}
          />
          <TextField
            label="Data Limite (Due)"
            type="date"
            size="small"
            disabled={isReadOnly}
            value={endDate ? endDate.split("T")[0] : ""}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { readOnly: isReadOnly },
            }}
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

      {/* AÇÕES FINAIS (ABRIR NO VS CODE / POD) */}
      <Box sx={{ mt: "auto", pt: 2 }}>
        {/* AÇÕES DE BATE E VOLTA DA REVISÃO */}
        {!isStageNode && task && isReviewer && (task.status === TaskStatus.REVIEW_REQUESTED || task.status === TaskStatus.IN_REVIEW) && (
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={<CheckCircleIcon />}
              onClick={() => onApproveTask?.(task.id)}
              sx={{ fontWeight: 700 }}
            >
              ✓ Aprovar Tarefa
            </Button>
            <Button
              variant="outlined"
              color="warning"
              fullWidth
              onClick={() => onRequestChanges?.(task.id)}
              sx={{ fontWeight: 700 }}
            >
              ⚠️ Solicitar Ajustes
            </Button>
          </Stack>
        )}

        {!isStageNode && task && !isReviewer && isAssignedToMe && (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.CHANGES_REQUESTED) && (
          <Button
            variant="contained"
            color="warning"
            fullWidth
            onClick={() => onRequestReview?.(task.id)}
            sx={{ fontWeight: 700, mb: 1.5 }}
          >
            🔍 Solicitar Revisão desta Tarefa
          </Button>
        )}


        {isStageNode && stage && onStartWorkspace && (() => {
          const isWritingStage =
            stage.order === 3 || stage.title.toLowerCase().includes("escrita");
          if (!isWritingStage) return null;
          const stageTasksCount = stage.tasks?.length || 0;
          return (
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              disabled={stageTasksCount === 0}
              startIcon={stageTasksCount === 0 ? <LockIcon /> : <CodeIcon />}
              onClick={() => {
                const featureTask: TaskItem = {
                  id: `stage-${stage.id}`,
                  projectId: stage.projectId,
                  stageId: stage.id,
                  title: `Workspace da Etapa: ${stage.title}`,
                  status: TaskStatus.IN_PROGRESS,
                  dueDate: new Date().toISOString(),
                };
                void onStartWorkspace(featureTask);
              }}
              sx={{ py: 1.2, fontWeight: 800, borderRadius: 2 }}
            >
              {stageTasksCount === 0
                ? "🔒 Crie sub-tarefas para abrir o Workspace"
                : "🚀 Abrir Workspace de Escrita"}
            </Button>
          );
        })()}
      </Box>
    </Drawer>
  );
};
