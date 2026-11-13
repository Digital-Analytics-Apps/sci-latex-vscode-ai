import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Bot,
  Cpu,
  Database,
  ExternalLink,
  HardDrive,
  Server,
  Zap,
} from "lucide-react";
import React from "react";
import { useAdminInfrastructure } from "../hooks/useAdminCenterQueries";

interface InfrastructureTabProps {
  autoRefresh: boolean;
}

export const InfrastructureTab: React.FC<InfrastructureTabProps> = ({ autoRefresh }) => {
  const { data, isLoading, isError } = useAdminInfrastructure(autoRefresh);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error">Erro ao carregar métricas de infraestrutura.</Typography>
      </Paper>
    );
  }

  const { services } = data;

  const renderStatusChip = (status: "UP" | "DEGRADED" | "DOWN") => {
    const colorMap = {
      UP: "success" as const,
      DEGRADED: "warning" as const,
      DOWN: "error" as const,
    };
    const labelMap = {
      UP: "Operacional",
      DEGRADED: "Degradado",
      DOWN: "Inacessível",
    };
    return <Chip label={labelMap[status]} color={colorMap[status]} size="small" />;
  };

  return (
    <Stack spacing={3}>
      {/* Matriz de Microsserviços e Componentes */}
      <Grid container spacing={2.5}>
        {/* Backend Fastify */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Server size={20} color="#2563eb" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Backend Fastify (Node.js)
                  </Typography>
                </Stack>
                {renderStatusChip(services.backendFastify.status)}
              </Stack>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Throughput</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.backendFastify.rps} RPS</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Latência p95</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.backendFastify.latencyP95Ms} ms</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Erros 5xx</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.backendFastify.errorRate5xx}%</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Event Loop</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.backendFastify.eventLoopLagMs} ms</Typography>
                </Grid>
              </Grid>
              <Button
                variant="outlined"
                size="small"
                endIcon={<ExternalLink size={14} />}
                href={services.backendFastify.grafanaUrl}
                target="_blank"
              >
                Abrir no Grafana
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* SciAI Engine (LangGraph + Opik) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Bot size={20} color="#8b5cf6" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    SciAI Engine (LangGraph)
                  </Typography>
                </Stack>
                {renderStatusChip(services.aiService.status)}
              </Stack>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">TTFT Médio</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.aiService.avgTtftMs} ms</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Streams SSE</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.aiService.activeSseStreams} ativos</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Custo Mês</Typography>
                  <Typography variant="subtitle1" color="secondary.main" sx={{ fontWeight: 700 }}>
                    ${services.aiService.monthlyEstimatedCostUsd.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                endIcon={<ExternalLink size={14} />}
                href={services.aiService.opikUrl}
                target="_blank"
              >
                Abrir no Opik LLMOps
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Compilador LaTeX Sandbox */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Cpu size={20} color="#ea580c" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Compilador LaTeX (Sandbox)
                  </Typography>
                </Stack>
                {renderStatusChip(services.compiler.status)}
              </Stack>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Fila de Espera</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.compiler.queueLength} jobs</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Execuções</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.compiler.activeJobs} ativos</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Duração Média</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.compiler.avgDurationMs} ms</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Timeouts (30s)</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.compiler.timeoutsLast24h}</Typography>
                </Grid>
              </Grid>
              <Button
                variant="outlined"
                size="small"
                endIcon={<ExternalLink size={14} />}
                href={services.compiler.grafanaUrl}
                target="_blank"
              >
                Métricas de Compilação
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* PostgreSQL & Redis */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Database size={20} color="#059669" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    PostgreSQL & Redis Cache
                  </Typography>
                </Stack>
                <Chip label="Conectados" color="success" size="small" />
              </Stack>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Pool Postgres</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {services.postgres.activeConnections} / {services.postgres.maxConnections}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Slow Queries</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.postgres.slowQueriesCount}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">RAM Redis</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.redis.usedMemoryMb} MB</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Leases Ativas</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{services.redis.activeLeasesCount}</Typography>
                </Grid>
              </Grid>
              <Stack direction="row" spacing={1}>
                <Chip icon={<Zap size={14} />} label="Fencing Tokens Ativos" size="small" variant="outlined" />
                <Chip icon={<HardDrive size={14} />} label="ACID Checkpoints" size="small" variant="outlined" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};
