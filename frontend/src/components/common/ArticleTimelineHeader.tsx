import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { StageStatus } from "../../constants/status";
import type { ProjectStage } from "../../types/stage.types";
import { GatekeeperLockBadge } from "./GatekeeperLockBadge";

interface ArticleTimelineHeaderProps {
  stages: ProjectStage[];
  onUpdateStageStatus?: (stageId: string, status: StageStatus) => void;
}

export const ArticleTimelineHeader: React.FC<ArticleTimelineHeaderProps> = ({
  stages,
  onUpdateStageStatus,
}) => {
  if (!stages || stages.length === 0) return null;

  const totalStages = stages.length;
  const completedStages = stages.filter(
    (s) => s.status === StageStatus.COMPLETED,
  ).length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  return (
    <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Fluxo Rastreável de Escrita e Governança
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Progresso do Artigo: {completedStages} de {totalStages} etapas
              concluídas ({progressPercent}%)
            </Typography>
          </Box>
          <Box sx={{ width: 180 }}>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Box>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            overflowX: "auto",
            pb: 1,
            pt: 0.5,
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              borderRadius: 3,
              backgroundColor: "rgba(0,0,0,0.2)",
            },
          }}
        >
          {stages.map((stage) => {
            const isCompleted = stage.status === StageStatus.COMPLETED;
            const isInProgress = stage.status === StageStatus.IN_PROGRESS;

            return (
              <Box
                key={stage.id}
                sx={{
                  minWidth: 200,
                  maxWidth: 240,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isCompleted
                    ? "success.main"
                    : isInProgress
                      ? "primary.main"
                      : "divider",
                  bgcolor: isCompleted
                    ? "success.50"
                    : isInProgress
                      ? "action.hover"
                      : "background.paper",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: "bold" }}
                  >
                    Etapa {stage.order}
                  </Typography>

                  {stage.isGatekeeper ? (
                    <GatekeeperLockBadge
                      isGatekeeper={stage.isGatekeeper}
                      gatekeeperType={stage.gatekeeperType}
                      status={stage.status}
                      title={stage.title}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label={
                        isCompleted
                          ? "Concluída"
                          : isInProgress
                            ? "Em Andamento"
                            : "Pendente"
                      }
                      color={
                        isCompleted
                          ? "success"
                          : isInProgress
                            ? "primary"
                            : "default"
                      }
                      variant={isCompleted ? "filled" : "outlined"}
                    />
                  )}
                </Box>

                <Typography
                  variant="subtitle2"
                  noWrap
                  title={stage.title}
                  sx={{ fontWeight: "bold" }}
                >
                  {stage.title}
                </Typography>

                {!stage.isGatekeeper && onUpdateStageStatus && (
                  <Box sx={{ mt: 1.5, display: "flex", gap: 1 }}>
                    {!isCompleted && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() =>
                          onUpdateStageStatus(stage.id, StageStatus.COMPLETED)
                        }
                        sx={{ fontSize: "0.7rem", py: 0.2 }}
                      >
                        Concluir
                      </Button>
                    )}
                    {stage.status === StageStatus.NOT_STARTED && (
                      <Button
                        size="small"
                        variant="text"
                        color="primary"
                        startIcon={<PlayCircleIcon />}
                        onClick={() =>
                          onUpdateStageStatus(stage.id, StageStatus.IN_PROGRESS)
                        }
                        sx={{ fontSize: "0.7rem", py: 0.2 }}
                      >
                        Iniciar
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};
