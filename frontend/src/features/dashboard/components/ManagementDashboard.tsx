import ArticleIcon from "@mui/icons-material/Article";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ScheduleIcon from "@mui/icons-material/Schedule";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Role } from "../../../constants/roles";

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
              12
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}
            >
              <DeadlineStatusChip type="ON_TIME" count={8} />
              <DeadlineStatusChip type="WARNING" count={3} />
              <DeadlineStatusChip type="OVERDUE" count={1} />
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
                Pareceres NIT Concluídos
              </Typography>
            </Box>
            <Typography
              variant="h2"
              color="success.main"
              sx={{ fontWeight: 700 }}
            >
              24
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Taxa de aprovação: 92%
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
              12 / 15
            </Typography>
            <Typography variant="caption" color="text.secondary">
              80% da Meta Global Atingida (Ciclo 2026/2027)
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
