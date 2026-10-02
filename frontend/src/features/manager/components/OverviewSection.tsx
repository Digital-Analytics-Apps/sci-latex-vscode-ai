import ArticleIcon from "@mui/icons-material/Article";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PublicIcon from "@mui/icons-material/Public";
import { Box, Grid, Typography } from "@mui/material";
import { MetricCard } from "../../../components/common/MetricCard";
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
          <MetricCard
            title="Total de Artigos"
            value={overview.totalProjects}
            icon={<ArticleIcon color="primary" />}
            color="primary.main"
            isLoading={isLoadingDashboard}
            subtitle={
              activePeriod
                ? `Meta Global: ${activePeriod.targetArticlesCount} artigos`
                : "Meta Consolidada do Período"
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard
            title="Publicados com DOI"
            value={overview.publishedProjects}
            icon={<PublicIcon color="success" />}
            color="success.main"
            isLoading={isLoadingDashboard}
            subtitle="Concluídos e submetidos com aprovação"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard
            title="Em Avaliação Gatekeeper"
            value={overview.inReviewProjects + overview.submittedProjects}
            icon={<AssessmentIcon color="warning" />}
            color="warning.main"
            isLoading={isLoadingDashboard}
            subtitle="Etapas NIT e submissões pendentes"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard
            title="Laboratórios & Equipes Ativas"
            value={totalTeamsCount}
            icon={<CheckCircleIcon color="info" />}
            color="info.main"
            isLoading={isLoadingTeams}
            subtitle={`${totalMembersCount} pesquisadores cadastrados`}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
