import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PublishIcon from "@mui/icons-material/Publish";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { showNotification } from "../../store/slices/notificationSlice";

interface ReleaseCandidatesModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export const ReleaseCandidatesModal: React.FC<ReleaseCandidatesModalProps> = ({
  open,
  onClose,
  projectId: _projectId,
}) => {
  const dispatch = useDispatch();
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mockRCs = [
    {
      id: "rc-1",
      versionTag: "RC-1",
      status: "CHANGES_REQUESTED",
      feedback:
        "Ajustar formato da Tabela 2 e adicionar mais 2 referências de 2026.",
      createdAt: "2026-09-08",
    },
    {
      id: "rc-2",
      versionTag: "RC-2",
      status: "APPROVED",
      feedback: "Artigo aprovado pelo Revisor Técnico! Pronto para submissão.",
      createdAt: "2026-09-10",
    },
  ];

  const handleCreateRC = () => {
    setIsSubmitting(true);
    try {
      dispatch(
        showNotification({
          message:
            "Nova Release Candidate (RC-3) gerada e submetida ao Revisor Técnico!",
          severity: "success",
        }),
      );
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao gerar Release Candidate.",
          severity: "error",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishRelease = () => {
    dispatch(
      showNotification({
        message: "Release Oficial v1.0 publicada na branch main com sucesso!",
        severity: "success",
      }),
    );
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          pb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <LocalOfferIcon color="primary" />
        Release Candidates (RCs) & Publicações do Artigo
      </DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        Gerencie os snapshots consolidados enviados ao Revisor Técnico e as
        versões de submissão oficial na branch <strong>main</strong>.
      </Typography>

      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Histórico de Release Candidates (RCs)
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {mockRCs.map((rc) => (
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
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Parecer do Revisor: {rc.feedback}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Submetido em: {rc.createdAt}
                  </Typography>
                </Paper>
              ))}
            </Box>
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
              disabled={isSubmitting}
            >
              Gerar RC e Enviar ao Revisor
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit">
          Fechar
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<PublishIcon />}
          onClick={handlePublishRelease}
        >
          Publicar Release Oficial (v1.0 na Main)
        </Button>
      </DialogActions>
    </Dialog>
  );
};
