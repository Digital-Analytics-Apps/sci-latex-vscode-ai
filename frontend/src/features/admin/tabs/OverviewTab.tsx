import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Radio,
  Users,
} from "lucide-react";
import React from "react";
import { useAdminOverview } from "../hooks/useAdminCenterQueries";

interface OverviewTabProps {
  autoRefresh: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ autoRefresh }) => {
  const { data, isLoading, isError } = useAdminOverview(autoRefresh);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Paper sx={{ p: 4, textAlign: "center", bgcolor: "background.paper" }}>
        <Typography color="error">
          Não foi possível carregar a visão geral da plataforma.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {/* 1. Cards de Resumo Executivo */}
      <Grid container spacing={2.5}>
        {/* Status Geral */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Sistema
                </Typography>
                <CheckCircle2 size={20} color="#10b981" />
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {data.systemStatus === "OPERATIONAL" ? "Operacional" : "Atenção"}
              </Typography>
              <Chip
                label="Todos os nós ativos"
                size="small"
                color={data.systemStatus === "OPERATIONAL" ? "success" : "warning"}
                sx={{ mt: 1, fontSize: "0.75rem" }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Usuários Ativos */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Usuários Ativos
                </Typography>
                <Users size={20} color="#3b82f6" />
              </Stack>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                {data.activeUsersCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sessões ativas no sistema
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Artigos em Andamento */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Artigos Ativos
                </Typography>
                <BookOpen size={20} color="#8b5cf6" />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {data.activeProjectsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Em produção científica
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* WebSockets Ativos */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  WebSockets
                </Typography>
                <Radio size={20} color="#06b6d4" />
              </Stack>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 800 }}>
                {data.activeWebSocketsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Salas de edição ativas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Erros Última Hora */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Erros (1h)
                </Typography>
                <AlertTriangle
                  size={20}
                  color={data.errorsLastHourCount > 5 ? "#ef4444" : "#10b981"}
                />
              </Stack>
              <Typography
                variant="h4"
                color={data.errorsLastHourCount > 5 ? "error.main" : "text.primary"}
                sx={{ fontWeight: 800 }}
              >
                {data.errorsLastHourCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aplicação e microsserviços
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2. Gráfico / Barras de Atividade da Plataforma por Hora */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <Activity size={20} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Atividade da Plataforma nas Últimas Horas
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Throughput de requisições HTTP e operações colaborativas de digitação em tempo real.
        </Typography>

        <Grid container spacing={2}>
          {data.hourlyActivity.map((item, idx) => {
            const maxReq = Math.max(
              ...data.hourlyActivity.map((a) => a.requestsCount),
              1
            );
            const percent = Math.min(
              Math.round((item.requestsCount / maxReq) * 100),
              100
            );

            return (
              <Grid size={{ xs: 12, sm: 6, md: 1.7 }} key={idx}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "action.hover",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {item.hour}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", my: 0.5 }}
                  >
                    {item.requestsCount} reqs · {item.collaborativeOpsCount} ops
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{ height: 6, borderRadius: 3, mt: 1 }}
                  />
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Stack>
  );
};
