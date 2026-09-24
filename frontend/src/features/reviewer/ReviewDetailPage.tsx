import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import CommentIcon from "@mui/icons-material/Comment";
import DescriptionIcon from "@mui/icons-material/Description";
import DifferenceIcon from "@mui/icons-material/Difference";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ImageIcon from "@mui/icons-material/Image";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SendIcon from "@mui/icons-material/Send";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { NITStatus, PRStatus } from "../../constants/status";
import {
  usePRDetails,
  usePRDiffQuery,
  useReviewPRMutation,
} from "../../hooks/useReviewQueries";
import { useSSEEventSource } from "../../hooks/useSSEEventSource";
import { showNotification } from "../../store/slices/notificationSlice";
import { CodeServerIframe } from "../workspace/CodeServerIframe";
import { NITParecerModal } from "./NITParecerModal";

export const ReviewDetailPage = () => {
  const { prId = "" } = useParams<{ prId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { data: prDetails, isLoading, error } = usePRDetails(prId);
  const { data: diffData } = usePRDiffQuery(prId);
  const reviewMutation = useReviewPRMutation(prId);

  // Ativa o SSE e batimento cardíaco em segundo plano (Web Worker) para o Revisor manter a workspace viva
  useSSEEventSource(prDetails?.projectId, prDetails?.taskId);

  const [isNITModalOpen, setIsNITModalOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isDiffSummaryOpen, setIsDiffSummaryOpen] = useState<boolean>(true);
  const [diffPerspective, setDiffPerspective] = useState<"overview" | "roundChanges">("overview");
  const [commentText, setCommentText] = useState<string>("");
  const [lineNumber, setLineNumber] = useState<string>("");

  const handleNavigateToLocation = (filePath: string, line?: number) => {
    // Comunicação desacoplada via postMessage orientado a intenção de domínio
    const iframeWindow = document.querySelector<HTMLIFrameElement>("iframe")?.contentWindow;
    if (iframeWindow) {
      iframeWindow.postMessage(
        {
          type: "go-to-location",
          file: filePath,
          line: line || 1,
        },
        "*"
      );
    }
  };

  const handleReview = async (
    status?: typeof PRStatus.APPROVED | typeof PRStatus.CHANGES_REQUESTED,
    customComment?: string,
    lineNum?: number,
  ) => {
    try {
      await reviewMutation.mutateAsync({
        status,
        comment: customComment || commentText || undefined,
        lineNumer:
          lineNum !== undefined
            ? lineNum
            : lineNumber
              ? parseInt(lineNumber, 10)
              : undefined,
      });

      dispatch(
        showNotification({
          message:
            status === PRStatus.APPROVED
              ? "Pull Request APROVADO com sucesso!"
              : status === PRStatus.CHANGES_REQUESTED
                ? "Ajustes solicitados ao Autor com sucesso!"
                : "Comentário registrado com sucesso!",
          severity:
            status === PRStatus.APPROVED
              ? "success"
              : status === PRStatus.CHANGES_REQUESTED
                ? "info"
                : "success",
        }),
      );

      setCommentText("");
      setLineNumber("");
    } catch (err: any) {
      dispatch(
        showNotification({
          message:
            err.response?.data?.message || "Erro ao registrar avaliação do PR.",
          severity: "error",
        }),
      );
    }
  };

  const handleAddCommentOnly = async () => {
    if (!commentText.trim()) return;
    await handleReview(
      undefined,
      commentText,
      lineNumber ? parseInt(lineNumber, 10) : undefined,
    );
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
          Carregando ambiente de revisão no VS Code...
        </Typography>
      </Box>
    );
  }

  if (error || !prDetails) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Não foi possível carregar as informações deste Pull Request.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          onClick={() => navigate("/")}
        >
          Voltar para a Lista de Revisões
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case PRStatus.APPROVED:
      case NITStatus.APPROVED_NIT:
        return "success";
      case PRStatus.CHANGES_REQUESTED:
      case NITStatus.REJECTED_NIT:
        return "error";
      case PRStatus.UNDER_REVIEW:
      case NITStatus.WAITING_NIT:
        return "warning";
      default:
        return "default";
    }
  };

  const commentsCount = prDetails.comments?.length || 0;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Paper
        square
        variant="outlined"
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderColor: "divider",
          bgcolor: "background.paper",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title="Voltar para a Lista de PRs">
            <IconButton onClick={() => navigate("/")} size="small">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {prDetails.title}
          </Typography>

          {prDetails.project?.name && (
            <Chip
              label={`Projeto: ${prDetails.project.name}`}
              size="small"
              color="secondary"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          )}

          {prDetails.author && (
            <Chip
              label={`Autor: ${prDetails.author.name}`}
              size="small"
              variant="outlined"
            />
          )}

          <Chip
            label={`PR: ${prDetails.status}`}
            size="small"
            color={getStatusColor(prDetails.status)}
            sx={{ fontWeight: 600 }}
          />

          <Chip
            label={`NIT: ${prDetails.nitStatus}`}
            size="small"
            color={getStatusColor(prDetails.nitStatus)}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Badge badgeContent={commentsCount} color="primary">
            <Button
              variant="outlined"
              color="info"
              size="small"
              startIcon={<CommentIcon fontSize="small" />}
              onClick={() => setIsDrawerOpen(true)}
            >
              Comentários
            </Button>
          </Badge>

          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon fontSize="small" />}
            disabled={reviewMutation.isPending}
            onClick={() => {
              setIsDrawerOpen(true);
            }}
          >
            Solicitar Ajustes
          </Button>

          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<CheckCircleIcon fontSize="small" />}
            disabled={reviewMutation.isPending}
            onClick={() => handleReview(PRStatus.APPROVED)}
          >
            Aprovar Seção
          </Button>

          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={() => setIsNITModalOpen(true)}
          >
            Parecer NIT
          </Button>
        </Box>
      </Paper>

      {/* Banner de Resumo Factual Acadêmico (Smart Diff Summary) com Suporte a Review Rounds */}
      {diffData && (
        <Paper
          square
          variant="outlined"
          sx={{
            px: 2,
            py: 1,
            bgcolor: "#0d1117",
            color: "#e6edf3",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Chip
                label={`REVISÃO #${diffData.roundNumber}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#58a6ff" }}>
                Resumo das Alterações Submetidas
              </Typography>

              {/* Seletor de Perspectiva: Visão Geral vs Correções Desta Rodada */}
              <ToggleButtonGroup
                value={diffPerspective}
                exclusive
                onChange={(_, val) => val && setDiffPerspective(val)}
                size="small"
                sx={{ height: 28, bgcolor: "#161b22" }}
              >
                <ToggleButton
                  value="overview"
                  sx={{
                    px: 1.5,
                    py: 0,
                    fontSize: 11,
                    textTransform: "none",
                    color: diffPerspective === "overview" ? "#58a6ff" : "#8b949e",
                    "&.Mui-selected": { bgcolor: "#1f242c", color: "#58a6ff" },
                  }}
                >
                  Visão Geral (dev → {diffData.overview?.targetCommitHash.slice(0, 7)})
                </ToggleButton>
                {diffData.roundChanges && (
                  <ToggleButton
                    value="roundChanges"
                    sx={{
                      px: 1.5,
                      py: 0,
                      fontSize: 11,
                      textTransform: "none",
                      color: diffPerspective === "roundChanges" ? "#3fb950" : "#8b949e",
                      "&.Mui-selected": { bgcolor: "#1f242c", color: "#3fb950" },
                    }}
                  >
                    Correções Desta Rodada (Rodada #{diffData.roundNumber - 1} → #{diffData.roundNumber})
                  </ToggleButton>
                )}
              </ToggleButtonGroup>
            </Box>

            <IconButton
              size="small"
              onClick={() => setIsDiffSummaryOpen(!isDiffSummaryOpen)}
              sx={{ color: "#8b949e" }}
            >
              {isDiffSummaryOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={isDiffSummaryOpen}>
            <Box sx={{ pt: 1, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              {(() => {
                const currentDiff =
                  diffPerspective === "roundChanges" && diffData.roundChanges
                    ? diffData.roundChanges
                    : diffData.overview;

                return (
                  <>
                    {currentDiff.classifiedFiles.map((file) => (
                      <Chip
                        key={file.path}
                        icon={
                          file.category === "section" ? (
                            <DescriptionIcon style={{ fontSize: 14, color: "#58a6ff" }} />
                          ) : file.category === "bibliography" ? (
                            <MenuBookIcon style={{ fontSize: 14, color: "#d2a8ff" }} />
                          ) : file.category === "figure" ? (
                            <ImageIcon style={{ fontSize: 14, color: "#7ee787" }} />
                          ) : (
                            <DifferenceIcon style={{ fontSize: 14, color: "#8b949e" }} />
                          )
                        }
                        label={`${file.label}: +${file.additions} / -${file.deletions}`}
                        size="small"
                        onClick={() => handleNavigateToLocation(file.path)}
                        sx={{
                          bgcolor: "#161b22",
                          color: "#c9d1d9",
                          borderColor: "#30363d",
                          fontSize: 12,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "#21262d" },
                        }}
                        variant="outlined"
                      />
                    ))}

                    {currentDiff.hasChangesInOtherFiles && (
                      <Tooltip title="Existem alterações em arquivos fora do escopo da seção primária da tarefa.">
                        <Chip
                          icon={<WarningAmberIcon style={{ fontSize: 14, color: "#d29922" }} />}
                          label="⚠️ Alterações em outros arquivos"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontSize: 11, height: 24 }}
                        />
                      </Tooltip>
                    )}
                  </>
                );
              })()}
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Workspace do VS Code Web com suporte a Branch de Seção e Modo de Revisão */}
      <Box
        sx={{
          flexGrow: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <CodeServerIframe
          projectId={prDetails.projectId}
          taskId={prDetails.taskId}
          mode="review"
        />
      </Box>

      {/* Drawer Lateral de Apontamentos e Comentários do Revisor */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: { width: 420, display: "flex", flexDirection: "column" },
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "background.default",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
            💬 Comentários & Apontamentos ({commentsCount})
          </Typography>
          <IconButton size="small" onClick={() => setIsDrawerOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Lista de Comentários Existentes */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          {commentsCount === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              Nenhum comentário registrado para este Pull Request até o momento.
            </Alert>
          ) : (
            <List disablePadding>
              {prDetails.comments?.map((item) => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  onClick={() =>
                    handleNavigateToLocation(
                      prDetails.task?.branchName ? `sections/01-introduction.tex` : "main.tex",
                      item.lineNumer
                    )
                  }
                  sx={{
                    p: 1.5,
                    mb: 1.5,
                    borderColor: "divider",
                    cursor: item.lineNumer ? "pointer" : "default",
                    "&:hover": item.lineNumer ? { bgcolor: "action.hover" } : {},
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {item.user?.name || "Revisor"}
                    </Typography>
                    {item.lineNumer && (
                      <Chip
                        label={`Linha #${item.lineNumer}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", color: "text.primary" }}
                  >
                    {item.comment}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </Typography>
                </Paper>
              ))}
            </List>
          )}
        </Box>

        <Divider />

        {/* Form para Novo Comentário e Decisão de Revisão */}
        <Box sx={{ p: 2, bgcolor: "background.paper" }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            Novo Apontamento
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label="Linha do arquivo (opcional)"
              size="small"
              type="number"
              value={lineNumber}
              onChange={(e) => setLineNumber(e.target.value)}
              placeholder="Ex: 18"
              fullWidth
            />
            <TextField
              label="Comentário / Parecer técnico"
              size="small"
              multiline
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Descreva aqui observações, sugestões ou correções necessárias..."
              fullWidth
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: "flex-end" }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<SendIcon fontSize="small" />}
                disabled={!commentText.trim() || reviewMutation.isPending}
                onClick={handleAddCommentOnly}
              >
                Comentar
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<CancelIcon fontSize="small" />}
                disabled={reviewMutation.isPending}
                onClick={() => handleReview("CHANGES_REQUESTED")}
              >
                Solicitar Ajustes
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>

      <NITParecerModal
        open={isNITModalOpen}
        onClose={() => setIsNITModalOpen(false)}
        pullRequestId={prId}
        pdfUrl={prDetails?.pdfUrl}
        currentNitStatus={prDetails?.nitStatus}
        sentToNitAt={prDetails?.sentToNitAt}
        sentToNitNotes={prDetails?.sentToNitNotes}
        nitNotes={prDetails?.nitNotes}
      />
    </Box>
  );
};
