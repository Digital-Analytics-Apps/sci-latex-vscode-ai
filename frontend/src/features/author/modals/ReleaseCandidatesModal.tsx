import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../../components/common/StandardModal";
import {
  useCreateRCMutation,
  usePublishReleaseMutation,
  useReleaseCandidatesQuery,
} from "../../../hooks/useReleaseQueries";
import { showNotification } from "../../../store/slices/notificationSlice";
import type { ReleaseCandidateItem } from "../../../types/release-candidate.types";

interface ReleaseCandidatesModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export const ReleaseCandidatesModal: React.FC<ReleaseCandidatesModalProps> = ({
  open,
  onClose,
  projectId,
}) => {
  const dispatch = useDispatch();
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const { data: releaseCandidates, isLoading } =
    useReleaseCandidatesQuery(projectId);
  const createRCMutation = useCreateRCMutation(projectId);
  const publishReleaseMutation = usePublishReleaseMutation(projectId);

  const handleCreateRC = async () => {
    try {
      await createRCMutation.mutateAsync({
        feedbackNotes: feedbackNotes || undefined,
      });

      dispatch(
        showNotification({
          message:
            "Nova Release Candidate (RC) gerada e submetida ao Revisor Técnico!",
          severity: "success",
        }),
      );
      setFeedbackNotes("");
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao gerar Release Candidate.",
          severity: "error",
        }),
      );
    }
  };

  const handlePublishRelease = async () => {
    try {
      await publishReleaseMutation.mutateAsync();
      dispatch(
        showNotification({
          message: "Release Oficial publicada com sucesso!",
          severity: "success",
        }),
      );
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao publicar Release Oficial.",
          severity: "error",
        }),
      );
    }
  };

  const renderRCList = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (!releaseCandidates || releaseCandidates.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Nenhuma Release Candidate gerada para este artigo até o momento.
        </Typography>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {releaseCandidates.map((rc: ReleaseCandidateItem) => (
          <Paper key={rc.id} variant="outlined" sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {rc.versionTag}
              </Typography>
              <Chip
                label={rc.status}
                size="small"
                color={rc.status === "APPROVED" ? "success" : "warning"}
                sx={{ fontWeight: 600 }}
              />
            </Box>
            {rc.feedback && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Parecer do Revisor: {rc.feedback}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Submetido em: {new Date(rc.createdAt).toLocaleDateString("pt-BR")}
            </Typography>
          </Paper>
        ))}
      </Box>
    );
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<LocalOfferIcon color="primary" />}
      title="Release Candidates (RCs) & Publicações do Artigo"
      subtitle="Gerencie os snapshots consolidados enviados ao Revisor Técnico e as versões de submissão oficial na branch main."
      cancelText="Fechar"
      confirmText="Publicar Release Oficial (v1.0 na Main)"
      confirmColor="success"
      onConfirm={handlePublishRelease}
      isSubmitting={publishReleaseMutation.isPending}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Histórico de Release Candidates (RCs)
          </Typography>

          {renderRCList()}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Submeter Nova Release Candidate (RC)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            label="Notas para o Revisor Técnico (Opcional)"
            placeholder="Ex: Snapshot contendo a versão revisada das Seções 1 e 2."
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            sx={{ mb: 1.5 }}
          />
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<SendIcon />}
            onClick={handleCreateRC}
            disabled={createRCMutation.isPending}
          >
            Gerar RC e Enviar ao Revisor
          </Button>
        </Box>
      </Box>
    </StandardModal>
  );
};
