import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
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

  const handleReview = async (status: "APPROVED" | "CHANGES_REQUESTED") => {
    try {
      await reviewMutation.mutateAsync({ status });
      dispatch(
        showNotification({
          message:
            status === "APPROVED"
              ? "Pull Request APROVADO com sucesso!"
              : "Ajustes solicitados ao Autor com sucesso!",
          severity: status === "APPROVED" ? "success" : "info",
        }),
      );
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
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon fontSize="small" />}
            disabled={reviewMutation.isPending}
            onClick={() => handleReview("CHANGES_REQUESTED")}
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

      {/* Workspace do VS Code Web com Extensão de Pull Requests do GitHub */}
      <Box
        sx={{
          flexGrow: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <CodeServerIframe projectId={prDetails.projectId} />
      </Box>

      <NITParecerModal
        open={isNITModalOpen}
        onClose={() => setIsNITModalOpen(false)}
        pullRequestId={prId}
      />
    </Box>
  );
};
