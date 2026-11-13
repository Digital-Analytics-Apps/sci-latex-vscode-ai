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
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FileCheck2,
  Lock,
  Layers,
} from "lucide-react";
import React from "react";
import { useAdminWorkflow } from "../hooks/useAdminCenterQueries";

interface WorkflowTabProps {
  autoRefresh: boolean;
}

export const WorkflowTab: React.FC<WorkflowTabProps> = ({ autoRefresh }) => {
  const { data, isLoading, isError } = useAdminWorkflow(autoRefresh);

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
        <Typography color="error">Erro ao carregar o fluxo de produção científica.</Typography>
      </Paper>
    );
  }

  const { bottlenecks, stagesDistribution, totalProjects, averageDaysPerStage } = data;

  return (
    <Stack spacing={3}>
      {/* 1. Indicadores de Gargalos Institucionais */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderLeft: 4, borderColor: "warning.main", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Clock size={18} color="#f59e0b" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Artigos Atrasados
                </Typography>
              </Stack>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 800 }}>
                {bottlenecks.delayedProjectsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cronograma de etapas vencido
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderLeft: 4, borderColor: "error.main", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <AlertCircle size={18} color="#ef4444" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Estagnados (&gt; 15 dias)
                </Typography>
              </Stack>
              <Typography variant="h4" color="error.main" sx={{ fontWeight: 800 }}>
                {bottlenecks.stagnantProjectsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sem edição recente na etapa
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderLeft: 4, borderColor: "primary.main", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Lock size={18} color="#3b82f6" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Validações do NIT
                </Typography>
              </Stack>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                {bottlenecks.pendingNitValidationsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Travas na Etapa 5 aguardando parecer
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderLeft: 4, borderColor: "info.main", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Calendar size={18} color="#06b6d4" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Prazos Próximos
                </Typography>
              </Stack>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 800 }}>
                {bottlenecks.upcomingDeadlinesCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Submissão nos próximos 30 dias
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2. Funil Visual das 6 Etapas Canônicas */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <Layers size={20} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Distribuição dos Artigos nas 6 Etapas Oficiais
          </Typography>
          <Chip label={`${totalProjects} Artigos no Total`} size="small" sx={{ ml: "auto" }} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Acompanhamento do funil de produção científica, desde a ideação até a submissão aos congressos-alvo.
        </Typography>

        <Stack spacing={2}>
          {stagesDistribution.map((stage) => {
            const percent = totalProjects > 0 ? Math.round((stage.projectsCount / totalProjects) * 100) : 0;
            const avgDays = averageDaysPerStage[stage.stageNumber.toString()] ?? 0;
            const isGatekeeper = stage.stageNumber === 5 || stage.stageNumber === 6;

            return (
              <Paper
                key={stage.stageNumber}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isGatekeeper ? "action.hover" : "background.paper",
                }}
              >
                <Grid container spacing={2} sx={{ alignItems: "center" }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {isGatekeeper ? <Lock size={16} color="#d97706" /> : <FileCheck2 size={16} />}
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {stage.stageName}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Box sx={{ width: "100%" }}>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40 }}>
                        {stage.projectsCount}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }} sx={{ textAlign: "right" }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<CheckCircle size={14} />}
                      label={`Tempo médio: ${avgDays} dias`}
                    />
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
};
