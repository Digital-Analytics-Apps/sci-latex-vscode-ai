import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import ImageIcon from "@mui/icons-material/Image";
import SaveIcon from "@mui/icons-material/Save";
import LinkIcon from "@mui/icons-material/Link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useMemo, useRef, useState } from "react";
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
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  useAddLinkEvidenceMutation,
  useDeleteTaskEvidenceMutation,
  useTaskEvidencesQuery,
  useUploadTaskEvidenceMutation,
} from "../../../../hooks/useTaskQueries";
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
  stages?: ProjectStage[];
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
  stages,
}: GanttTaskDetailDrawerProps) => {
  // Referência para o input de arquivo oculto
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Fila de itens selecionados aguardando confirmação explícita de salvamento
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedLinks, setStagedLinks] = useState<
    Array<{ id: string; title: string; url: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatusText, setSavingStatusText] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  /**
   * Identifica a etapa pai da tarefa para validar se pertence às Etapas 1 ou 2
   */
  const parentStage = useMemo(() => {
    if (stage) return stage;
    const stageId = task?.stageId || task?.stage?.id;
    if (stageId && stages) {
      const found = stages.find((s) => s.id === stageId);
      if (found) return found;
    }
    return task?.stage;
  }, [stage, task, stages]);

  /**
   * Regra de Governança: Somente tarefas vinculadas às Etapas 1 (Planejamento) e 2 (Desenvolvimento/Experimentos)
   * possuem permissão para upload de evidências
   */
  const isEvidenceAllowed = useMemo(() => {
    if (!task || Boolean(stage)) return false;
    const order = parentStage?.order;
    if (order === 1 || order === 2) return true;
    const t = (parentStage?.title || "").toLowerCase();
    return (
      t.includes("planejamento") ||
      t.includes("pesquisa") ||
      t.includes("experimento") ||
      t.includes("desenvolvimento")
    );
  }, [task, stage, parentStage]);

  const taskId = task?.id || "";
  const projectId = task?.projectId || "";

  // Consulta de evidências ativas
  const { data: evidences = [], isLoading: isLoadingEvidences } = useTaskEvidencesQuery(
    projectId,
    isEvidenceAllowed ? taskId : null,
  );

  const uploadEvidenceMutation = useUploadTaskEvidenceMutation(projectId, taskId);
  const addLinkMutation = useAddLinkEvidenceMutation(projectId, taskId);
  const deleteEvidenceMutation = useDeleteTaskEvidenceMutation(projectId, taskId);

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

  /**
   * Adiciona arquivos selecionados à fila de envio (sem disparar upload imediato)
   */
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEvidenceError(null);
    setStagedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Adiciona link à fila de envio (sem salvar no backend imediatamente)
   */
  const handleAddLinkToStage = () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    setEvidenceError(null);
    try {
      const parsed = new URL(linkUrl.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      setEvidenceError("O link deve ser uma URL válida (http:// ou https://).");
      return;
    }
    setStagedLinks((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: linkTitle.trim(),
        url: linkUrl.trim(),
      },
    ]);
    setLinkTitle("");
    setLinkUrl("");
    setIsAddLinkOpen(false);
  };

  /**
   * Remove um arquivo da fila de envio antes de salvar
   */
  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Remove um link da fila de envio antes de salvar
   */
  const handleRemoveStagedLink = (id: string) => {
    setStagedLinks((prev) => prev.filter((l) => l.id !== id));
  };

  /**
   * Salva todas as evidências preparadas na fila (envia binários ao MinIO e persiste links)
   */
  const handleSaveAllEvidences = async () => {
    if (stagedFiles.length === 0 && stagedLinks.length === 0) return;
    setIsSaving(true);
    setEvidenceError(null);

    try {
      // 1. Upload sequencial dos arquivos binários diretamente para a URL pré-assinada do MinIO
      for (let i = 0; i < stagedFiles.length; i++) {
        const file = stagedFiles[i];
        setSavingStatusText(
          `Enviando arquivo ${i + 1} de ${stagedFiles.length}: ${file.name}`,
        );
        setUploadProgress(0);
        await uploadEvidenceMutation.mutateAsync({
          file,
          onProgress: (percent) => setUploadProgress(percent),
        });
      }

      // 2. Registro dos links externos no banco relacional
      for (let j = 0; j < stagedLinks.length; j++) {
        const link = stagedLinks[j];
        setSavingStatusText(
          `Registrando link ${j + 1} de ${stagedLinks.length}: ${link.title}`,
        );
        await addLinkMutation.mutateAsync({
          title: link.title,
          url: link.url,
        });
      }

      // 3. Limpa a fila após conclusão com sucesso
      setStagedFiles([]);
      setStagedLinks([]);
    } catch (err: unknown) {
      const error = err as Error;
      setEvidenceError(error.message || "Falha ao salvar evidências.");
    } finally {
      setIsSaving(false);
      setSavingStatusText(null);
      setUploadProgress(null);
    }
  };
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

        {/* SEÇÃO DE EVIDÊNCIAS DE TAREFA (ETAPAS 1 E 2) */}
        {isEvidenceAllowed && (
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                EVIDÊNCIAS DA TAREFA ({evidences.length})
              </Typography>
              {!isReadOnly && (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    style={{ display: "none" }}
                    accept="image/*,application/pdf"
                    onChange={handleFilesSelected}
                  />
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<CloudUploadIcon fontSize="small" />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadEvidenceMutation.isPending}
                    sx={{ fontSize: "0.75rem", fontWeight: 700, p: 0.5 }}
                  >
                    Anexar
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<LinkIcon fontSize="small" />}
                    onClick={() => setIsAddLinkOpen(!isAddLinkOpen)}
                    sx={{ fontSize: "0.75rem", fontWeight: 700, p: 0.5 }}
                  >
                    Link
                  </Button>
                </Box>
              )}
            </Box>

            {uploadProgress !== null && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Enviando arquivo para o MinIO... {uploadProgress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                />
              </Box>
            )}

            {evidenceError && (
              <Alert
                severity="error"
                sx={{ mb: 1, py: 0.5, fontSize: "0.75rem" }}
                onClose={() => setEvidenceError(null)}
              >
                {evidenceError}
              </Alert>
            )}

            {isAddLinkOpen && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  borderRadius: 2,
                  bgcolor: "background.default",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, mb: 1, display: "block" }}
                >
                  Adicionar Link Externo (Colab, GitHub, Dataset)
                </Typography>
                <Stack spacing={1}>
                  <TextField
                    size="small"
                    placeholder="Título (ex: Notebook de Testes)"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    fullWidth
                    slotProps={{ htmlInput: { style: { fontSize: "0.8rem" } } }}
                  />
                  <TextField
                    size="small"
                    placeholder="URL (https://...)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    fullWidth
                    slotProps={{ htmlInput: { style: { fontSize: "0.8rem" } } }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    <Button size="small" onClick={() => setIsAddLinkOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleAddLinkToStage}
                      disabled={
                        addLinkMutation.isPending ||
                        !linkTitle.trim() ||
                        !linkUrl.trim()
                      }
                    >
                      Adicionar à Fila
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* FILA DE ITENS PRONTOS PARA SALVAR */}
            {(stagedFiles.length > 0 || stagedLinks.length > 0) && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  border: "1px dashed",
                  borderColor: "primary.main",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: "primary.main" }}
                  >
                    ITENS PRONTOS PARA SALVAR ({stagedFiles.length + stagedLinks.length})
                  </Typography>
                </Box>

                <Stack spacing={0.8} sx={{ mb: 1.5 }}>
                  {stagedFiles.map((file, idx) => (
                    <Box
                      key={`${file.name}-${idx}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 0.8,
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          minWidth: 0,
                        }}
                      >
                        {file.type === "application/pdf" ? (
                          <PictureAsPdfIcon fontSize="small" color="error" />
                        ) : (
                          <ImageIcon fontSize="small" color="primary" />
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                            noWrap
                          >
                            {file.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem" }}
                          >
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveStagedFile(idx)}
                        disabled={isSaving}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}

                  {stagedLinks.map((link) => (
                    <Box
                      key={link.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 0.8,
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          minWidth: 0,
                        }}
                      >
                        <LinkIcon fontSize="small" color="info" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                            noWrap
                          >
                            {link.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem" }}
                            noWrap
                          >
                            {link.url}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveStagedLink(link.id)}
                        disabled={isSaving}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>

                {isSaving && (
                  <Box sx={{ mb: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      {savingStatusText} {uploadProgress !== null ? `(${uploadProgress}%)` : ""}
                    </Typography>
                    <LinearProgress
                      variant={uploadProgress !== null ? "determinate" : "indeterminate"}
                      value={uploadProgress ?? 0}
                      sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                    />
                  </Box>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="small"
                  startIcon={
                    isSaving ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  onClick={handleSaveAllEvidences}
                  disabled={isSaving}
                  sx={{ fontWeight: 800, textTransform: "none", py: 0.8 }}
                >
                  {isSaving
                    ? "Salvando Evidências..."
                    : `Salvar Evidências (${stagedFiles.length + stagedLinks.length})`}
                </Button>
              </Paper>
            )}

            {isLoadingEvidences ? (
              <CircularProgress
                size={20}
                sx={{ my: 1, display: "block", mx: "auto" }}
              />
            ) : evidences.length === 0 ? (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontStyle: "italic", display: "block" }}
              >
                Nenhuma evidência anexada a esta tarefa.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mt: 0.5 }}>
                {evidences.map((ev) => (
                  <Paper
                    key={ev.id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      {ev.type === "IMAGE" ? (
                        <ImageIcon fontSize="small" color="primary" />
                      ) : ev.type === "PDF" ? (
                         <PictureAsPdfIcon fontSize="small" color="error" />
                      ) : (
                        <LinkIcon fontSize="small" color="info" />
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                          noWrap
                        >
                          {ev.title || ev.fileName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                          noWrap
                        >
                          {ev.type === "LINK" ? ev.url : ev.fileName}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      {ev.downloadUrl && (
                        <IconButton
                          size="small"
                          component="a"
                          href={ev.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Baixar/Visualizar Arquivo"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      )}
                      {ev.url && (
                        <IconButton
                          size="small"
                          component="a"
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir Link"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      )}
                      {!isReadOnly && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteEvidenceMutation.mutate(ev.id)}
                          title="Remover Evidência"
                          disabled={deleteEvidenceMutation.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}
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
