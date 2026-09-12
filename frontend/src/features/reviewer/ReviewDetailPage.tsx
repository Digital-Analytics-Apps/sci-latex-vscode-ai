import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import CommentIcon from "@mui/icons-material/Comment";
import SendIcon from "@mui/icons-material/Send";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  usePRDetails,
  useReviewPRMutation,
} from "../../hooks/useReviewQueries";
import { showNotification } from "../../store/slices/notificationSlice";
import { CodeServerIframe } from "../workspace/CodeServerIframe";
import { NITParecerModal } from "./NITParecerModal";

export const ReviewDetailPage: React.FC = () => {
  const { prId = "" } = useParams<{ prId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { data: prDetails, isLoading, error } = usePRDetails(prId);
  const reviewMutation = useReviewPRMutation(prId);

  const [isNITModalOpen, setIsNITModalOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>("");
  const [lineNumber, setLineNumber] = useState<string>("");

  const handleReview = async (
    status?: "APPROVED" | "CHANGES_REQUESTED",
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
            status === "APPROVED"
              ? "Pull Request APROVADO com sucesso!"
              : status === "CHANGES_REQUESTED"
                ? "Ajustes solicitados ao Autor com sucesso!"
                : "Comentário registrado com sucesso!",
          severity:
            status === "APPROVED"
              ? "success"
              : status === "CHANGES_REQUESTED"
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
      case "APPROVED":
      case "APPROVED_NIT":
        return "success";
      case "CHANGES_REQUESTED":
      case "REJECTED_NIT":
        return "error";
      case "UNDER_REVIEW":
      case "WAITING_NIT":
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
            onClick={() => handleReview("APPROVED")}
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
          sectionId={prDetails.sectionId}
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
                  sx={{ p: 1.5, mb: 1.5, borderColor: "divider" }}
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
      />
    </Box>
  );
};
