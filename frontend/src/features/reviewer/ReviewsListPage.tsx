import RateReviewIcon from "@mui/icons-material/RateReview";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { usePendingReviews } from "../../hooks/useReviewQueries";

export const ReviewsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: reviews, isLoading } = usePendingReviews();

  const mockReviews = reviews || [
    {
      id: "pr-101",
      title: "PR #101: Introdução e Trabalhos Relacionados",
      section: {
        id: "sec-1",
        title: "Seção 1 - Introdução",
        filePath: "sections/01-introduction.tex",
      },
      author: {
        id: "u-1",
        name: "Autor Exemplo",
        email: "author@sci-latex.org",
      },
      status: "UNDER_REVIEW" as const,
      nitStatus: "WAITING_NIT" as const,
      createdAt: "2026-09-05T14:30:00Z",
      projectId: "demo-project-1",
    },
    {
      id: "pr-102",
      title: "PR #102: Reformulação da Metodologia",
      section: {
        id: "sec-2",
        title: "Seção 2 - Metodologia",
        filePath: "sections/02-methodology.tex",
      },
      author: {
        id: "u-1",
        name: "Autor Exemplo",
        email: "author@sci-latex.org",
      },
      status: "UNDER_REVIEW" as const,
      nitStatus: "APPROVED_NIT" as const,
      createdAt: "2026-09-06T09:15:00Z",
      projectId: "demo-project-1",
    },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 5,
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
          Buscando solicitações de revisão pendentes...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
            Solicitações de Revisão Pendentes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Avalie o código LaTeX submetido, o PDF compilado pelo TeX Live e
            emita o parecer formal do NIT.
          </Typography>
        </Box>
        <Chip
          icon={<RateReviewIcon fontSize="small" />}
          label={`${mockReviews.length} PRs Aguardando Avaliação`}
          color="primary"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Paper variant="outlined" sx={{ border: "none" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID PR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Título & Seção</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Autor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status do PR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Parecer NIT</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Ação
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockReviews.map((pr) => (
                  <TableRow key={pr.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>#{pr.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {pr.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pr.section.title} ({pr.section.filePath})
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{pr.author.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pr.author.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pr.status}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pr.nitStatus}
                        size="small"
                        color={
                          pr.nitStatus === "APPROVED_NIT"
                            ? "success"
                            : pr.nitStatus === "REJECTED_NIT"
                              ? "error"
                              : "warning"
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={<VisibilityIcon fontSize="small" />}
                        onClick={() => navigate(`/reviews/${pr.id}`)}
                      >
                        Avaliar (Diff & PDF)
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};
