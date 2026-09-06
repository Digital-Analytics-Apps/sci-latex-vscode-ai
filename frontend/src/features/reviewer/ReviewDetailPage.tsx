import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePRDetails } from "../../hooks/useReviewQueries";
import { CompiledPdfViewer } from "./CompiledPdfViewer";
import { LatexDiffViewer } from "./LatexDiffViewer";
import { NITParecerModal } from "./NITParecerModal";

export const ReviewDetailPage: React.FC = () => {
  const { prId = "pr-101" } = useParams<{ prId: string }>();
  const navigate = useNavigate();

  const { data: prDetails } = usePRDetails(prId);
  const [isNITModalOpen, setIsNITModalOpen] = useState<boolean>(false);

  const mockPR = prDetails || {
    id: prId,
    title: "PR #102: Reformulação da Metodologia e Equações",
    author: { name: "Autor Exemplo", email: "author@sci-latex.org" },
    nitStatus: "WAITING_NIT" as const,
    projectId: "demo-project-1",
    diffContent: undefined as string | undefined,
    pdfUrl: undefined as string | undefined,
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
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title="Voltar para a Lista de PRs">
            <IconButton onClick={() => navigate("/reviews")} size="small">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {mockPR.title}
          </Typography>

          <Chip
            label={`Autor: ${mockPR.author.name}`}
            size="small"
            variant="outlined"
          />

          <Chip
            label={`Status NIT: ${mockPR.nitStatus}`}
            size="small"
            color={
              mockPR.nitStatus === "APPROVED_NIT"
                ? "success"
                : mockPR.nitStatus === "REJECTED_NIT"
                  ? "error"
                  : "warning"
            }
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<CheckCircleIcon fontSize="small" />}
            onClick={() => setIsNITModalOpen(true)}
          >
            Registrar Parecer do NIT
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          overflow: "hidden",
          p: 1.5,
          gap: 1.5,
        }}
      >
        <Box sx={{ width: "50%", height: "100%", overflow: "hidden" }}>
          <LatexDiffViewer diffContent={mockPR.diffContent} />
        </Box>

        <Box sx={{ width: "50%", height: "100%", overflow: "hidden" }}>
          <CompiledPdfViewer
            pdfUrl={mockPR.pdfUrl}
            projectId={mockPR.projectId}
          />
        </Box>
      </Box>

      <NITParecerModal
        open={isNITModalOpen}
        onClose={() => setIsNITModalOpen(false)}
        pullRequestId={prId}
      />
    </Box>
  );
};
