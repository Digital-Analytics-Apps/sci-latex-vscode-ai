import ArticleIcon from "@mui/icons-material/Article";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PublicIcon from "@mui/icons-material/Public";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import type { AcademicPeriod } from "../../../types/academic-period.types";

interface OverviewSectionProps {
  overview: {
    totalProjects: number;
    publishedProjects: number;
    inReviewProjects: number;
    submittedProjects: number;
    rejectedProjects: number;
  };
  isLoadingDashboard: boolean;
  activePeriod?: AcademicPeriod | null;
  isLoadingTeams: boolean;
  totalTeamsCount: number;
  totalMembersCount: number;
}

export const OverviewSection = ({
  overview,
  isLoadingDashboard,
  activePeriod,
  isLoadingTeams,
  totalTeamsCount,
  totalMembersCount,
}: OverviewSectionProps) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Visão Geral Institucional
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Painel consolidado com os principais indicadores de produção e
          governança científica.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <ArticleIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Total de Artigos
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "primary.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} />
                ) : (
                  overview.totalProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activePeriod
                  ? `Meta Global: ${activePeriod.targetArticlesCount} artigos`
                  : "Meta Consolidada do Período"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <PublicIcon color="success" />
                <Typography variant="subtitle2" color="text.secondary">
                  Publicados com DOI
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "success.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} />
                ) : (
                  overview.publishedProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Concluídos e submetidos com aprovação
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <AssessmentIcon color="warning" />
                <Typography variant="subtitle2" color="text.secondary">
                  Em Avaliação Gatekeeper
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "warning.main" }}
              >
                {isLoadingDashboard ? (
                  <CircularProgress size={28} />
                ) : (
                  overview.inReviewProjects + overview.submittedProjects
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Etapas NIT e submissões pendentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <CheckCircleIcon color="info" />
                <Typography variant="subtitle2" color="text.secondary">
                  Laboratórios & Equipes Ativas
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "info.main" }}
              >
                {isLoadingTeams ? (
                  <CircularProgress size={28} />
                ) : (
                  totalTeamsCount
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totalMembersCount} pesquisadores cadastrados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
