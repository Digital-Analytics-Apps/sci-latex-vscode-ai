import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import FlagIcon from "@mui/icons-material/Flag";
import GroupIcon from "@mui/icons-material/Group";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { StageStatus, TaskStatus } from "../../../../constants/status";
import type { ProjectStage } from "../../../../types/stage.types";
import type { TaskItem } from "../../../../types/task.types";
import {
  type AIRiskAlert,
  getAiSummaryText,
  getOverdueCardBgColor,
  getOverdueCardBorderColor,
  getOverdueIconBgColor,
  getOverdueIconColor,
  isTaskCompleted,
} from "./ganttUtils";

interface GanttHeaderStatsProps {
  stages: ProjectStage[];
  tasks: TaskItem[];
  riskAlerts: AIRiskAlert[];
  targetConferenceName?: string | null;
  targetConferenceDate?: string | null;
}

export const GanttHeaderStats = ({
  stages,
  tasks,
  riskAlerts,
  targetConferenceName,
  targetConferenceDate: _targetConferenceDate,
}: GanttHeaderStatsProps) => {
  const [showRisksDetail, setShowRisksDetail] = useState(false);

  // Totais
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => isTaskCompleted(t)).length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS,
  ).length;
  const overdueTasks = riskAlerts.filter(
    (r) => r.type === "overdue_task",
  ).length;

  const totalStages = stages.length;
  const completedStages = stages.filter(
    (s) => s.status === StageStatus.COMPLETED,
  ).length;

  const overallProgressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const hasHighRisk = riskAlerts.some((r) => r.severity === "high");
  const aiSummaryText = getAiSummaryText(
    riskAlerts.length,
    targetConferenceName,
  );

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* SEÇÃO SUPERIOR: CARDS DE MÉTRICAS (IGUAL AO FIGMA) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "1.2fr 1fr 1fr 1fr 1fr 1.6fr",
          },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        {/* CARD 1: OVERALL PROGRESS */}
        <Card
          variant="outlined"
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress
              variant="determinate"
              value={overallProgressPercent}
              size={48}
              thickness={4.5}
              color="primary"
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, fontSize: "0.75rem" }}
              >
                {overallProgressPercent}%
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              PROGRESSO GLOBAL
            </Typography>

            <Typography
              variant="body2"
              sx={{ fontWeight: 800, color: "success.main" }}
            >
              ↑ {completedTasks}/{totalTasks} Sub-tasks
            </Typography>
          </Box>
        </Card>

        {/* CARD 2: MILESTONES */}
        <Card
          variant="outlined"
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: "rgba(99, 102, 241, 0.12)",
              color: "primary.main",
              display: "flex",
            }}
          >
            <FlagIcon fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              ETAPAS / FEATURE BRANCHES
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {completedStages} / {totalStages}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalStages - completedStages} pendentes
            </Typography>
          </Box>
        </Card>

        {/* CARD 3: TAREFAS E MERGES */}
        <Card
          variant="outlined"
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: "info.softBg",
              color: "info.main",
              display: "flex",
            }}
          >
            <CheckCircleOutlineIcon fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              SUB-TASKS & MERGES
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {totalTasks}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {inProgressTasks} em andamento
            </Typography>
          </Box>
        </Card>

        {/* CARD 4: OVERDUE / ATRASOS */}
        <Card
          variant="outlined"
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderRadius: 2,
            bgcolor: getOverdueCardBgColor(overdueTasks),
            borderColor: getOverdueCardBorderColor(overdueTasks),
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: getOverdueIconBgColor(overdueTasks),
              color: getOverdueIconColor(overdueTasks),
              display: "flex",
            }}
          >
            <WarningAmberIcon fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              ATRASOS DETECTADOS
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 800,
                color: overdueTasks > 0 ? "error.main" : "text.primary",
              }}
            >
              {overdueTasks}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {overdueTasks > 0 ? "Requer atenção" : "Nenhum atraso"}
            </Typography>
          </Box>
        </Card>

        {/* CARD 5: CAPACITY */}
        <Card
          variant="outlined"
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: "success.softBg",
              color: "success.main",
              display: "flex",
            }}
          >
            <GroupIcon fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              EQUIPE / ALOCAÇÃO
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 800, color: "success.main" }}
            >
              Equilibrada
            </Typography>
            <Typography variant="caption" color="text.secondary">
              100% Capacidade
            </Typography>
          </Box>
        </Card>

        {/* CARD 6: BANNER DE INTELIGÊNCIA IA (AI SUMMARY & RISK DETECTION) */}
        <Card
          variant="outlined"
          sx={{
            p: 1.5,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)"
                : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#fff",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <AutoAwesomeIcon sx={{ fontSize: 18, color: "#fde047" }} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, letterSpacing: 0.5 }}
              >
                AI PROJECT SUMMARY
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                px: 0.8,
                py: 0.2,
                borderRadius: 1,
                fontSize: "0.65rem",
                fontWeight: 700,
              }}
            >
              IA ATIVA
            </Typography>
          </Box>

          <Typography
            variant="caption"
            sx={{ fontWeight: 600, mt: 0.5, lineHeight: 1.3 }}
          >
            {aiSummaryText}
          </Typography>

          {riskAlerts.length > 0 && (
            <Button
              size="small"
              onClick={() => setShowRisksDetail(!showRisksDetail)}
              sx={{
                mt: 1,
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.15)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                fontSize: "0.7rem",
                py: 0.2,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {showRisksDetail
                ? "Ocultar Alertas AI"
                : "Ver Alertas de Risco →"}
            </Button>
          )}
        </Card>
      </Box>

      {/* DETALHES DE ALERTAS DE RISCO IA (EXPANSÍVEL) */}
      <Collapse in={showRisksDetail}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: hasHighRisk ? "error.softBg" : "warning.softBg",
            border: "1px solid",
            borderColor: hasHighRisk ? "error.main" : "warning.main",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: 1,
              color: hasHighRisk ? "error.main" : "warning.main",
            }}
          >
            ⚠️ Análise Preditiva de Riscos (Inteligência AI)
          </Typography>
          <Stack spacing={0.8}>
            {riskAlerts.map((alert) => (
              <Box
                key={alert.id}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  bgcolor: "background.paper",
                  p: 1,
                  borderRadius: 1.5,
                }}
              >
                <WarningAmberIcon
                  fontSize="small"
                  color={alert.severity === "high" ? "error" : "warning"}
                  sx={{ mt: 0.2 }}
                />
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, display: "block" }}
                  >
                    {alert.entityTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.message}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};
