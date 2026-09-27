import ArticleIcon from "@mui/icons-material/Article";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ScheduleIcon from "@mui/icons-material/Schedule";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Role } from "../../../constants/roles";
import {
  useAcademicPeriods,
  useManagerDashboardQuery,
} from "../../../hooks/useManagementQueries";

type DeadlineStatusKey = "ON_TIME" | "WARNING" | "OVERDUE";

const getDeadlineStatusConfig = (
  type: DeadlineStatusKey,
  count: number,
): { color: "success" | "warning" | "error"; label: string } => {
  switch (type) {
    case "ON_TIME":
      return { color: "success", label: `${count} no prazo` };
    case "WARNING":
      return { color: "warning", label: `${count} atenção` };
    case "OVERDUE":
      return { color: "error", label: `${count} atrasado` };
  }
};

const DeadlineStatusChip = ({
  type,
  count,
}: {
  type: DeadlineStatusKey;
  count: number;
}) => {
  const { color, label } = getDeadlineStatusConfig(type, count);
  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: 11 }}
    />
  );
};

interface ManagementDashboardProps {
  userRole?: string;
}

export const ManagementDashboard = ({ userRole }: ManagementDashboardProps) => {
  const navigate = useNavigate();

  const { data: rawPeriods } = useAcademicPeriods();
  const periods = Array.isArray(rawPeriods) ? rawPeriods : [];
  const activePeriod = periods[0];

  const { data: dashboard, isLoading } = useManagerDashboardQuery({
    academicPeriodId: activePeriod?.id,
  });

  const overview = dashboard?.overview || {
    totalProjects: 0,
    publishedProjects: 0,
    inReviewProjects: 0,
    submittedProjects: 0,
    rejectedProjects: 0,
  };

  const deadlines = dashboard?.deadlines || {
    onTimeCount: 0,
    warningSoonCount: 0,
    overdueCount: 0,
  };

  const inProgressArticles =
    overview.inReviewProjects + overview.submittedProjects;
  const targetCount = activePeriod?.targetArticlesCount || 10;
  const publishedCount = overview.publishedProjects;
  const targetPercentage =
    targetCount > 0 ? Math.round((publishedCount / targetCount) * 100) : 0;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          variant="outlined"
          sx={{ cursor: "pointer" }}
          onClick={() =>
            navigate(
              userRole === Role.COORDINATOR ? "/coordinator" : "/manager",
            )
          }
        >
          <CardContent>
            <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <ArticleIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Artigos em Andamento
              </Typography>
            </Box>
            <Typography
              variant="h2"
              color="primary.main"
              sx={{ fontWeight: 700 }}
            >
              {isLoading ? <CircularProgress size={28} /> : inProgressArticles}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}
            >
              <DeadlineStatusChip
                type="ON_TIME"
                count={deadlines.onTimeCount}
              />
              <DeadlineStatusChip
                type="WARNING"
                count={deadlines.warningSoonCount}
              />
              <DeadlineStatusChip
                type="OVERDUE"
                count={deadlines.overdueCount}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <AssignmentTurnedInIcon color="success" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Artigos Publicados (DOI)
              </Typography>
            </Box>
            <Typography
              variant="h2"
              color="success.main"
              sx={{ fontWeight: 700 }}
            >
              {isLoading ? (
                <CircularProgress size={28} color="success" />
              ) : (
                publishedCount
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {overview.totalProjects > 0
                ? `Taxa de conclusão: ${Math.round(
                    (publishedCount / overview.totalProjects) * 100,
                  )}% do total`
                : "Sem projetos ativos"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          variant="outlined"
          sx={{ cursor: "pointer" }}
          onClick={() => navigate("/manager")}
        >
          <CardContent>
            <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <ScheduleIcon color="warning" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Meta do Ciclo Acadêmico
              </Typography>
            </Box>
            <Typography
              variant="h2"
              color="warning.main"
              sx={{ fontWeight: 700 }}
            >
              {isLoading ? (
                <CircularProgress size={28} color="warning" />
              ) : (
                `${publishedCount} / ${targetCount}`
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {targetPercentage}% da Meta Global Atingida{" "}
              {activePeriod ? `(${activePeriod.name})` : ""}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
