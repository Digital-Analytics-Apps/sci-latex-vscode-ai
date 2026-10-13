import AddIcon from "@mui/icons-material/Add";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon from "@mui/icons-material/Download";
import TodayIcon from "@mui/icons-material/Today";
import {
  Box,
  Button,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import type { TimeScale } from "./ganttUtils";

interface GanttToolbarProps {
  scale: TimeScale;
  onChangeScale: (scale: TimeScale) => void;
  onJumpToday: () => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  dateRangeText: string;
  onOpenCreateStage?: () => void;
  onOpenCreateTask?: () => void;
  onAutoScheduleAI?: () => void;
}

export const GanttToolbar = ({
  scale,
  onChangeScale,
  onJumpToday,
  onPrevPeriod,
  onNextPeriod,
  dateRangeText,
  onOpenCreateStage,
  onOpenCreateTask,
  onAutoScheduleAI,
}: GanttToolbarProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        p: 1.2,
        bgcolor: "background.paper",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        mb: 2,
      }}
    >
      {/* LADO ESQUERDO: SELETOR DE ESCALA E NAVEGAÇÃO */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <ToggleButtonGroup
          size="small"
          value={scale}
          exclusive
          onChange={(_, newScale) => newScale && onChangeScale(newScale)}
          sx={{ height: 32 }}
        >
          <ToggleButton
            value="days"
            sx={{ px: 1.5, fontWeight: 700, fontSize: "0.75rem" }}
          >
            Dias
          </ToggleButton>
          <ToggleButton
            value="weeks"
            sx={{ px: 1.5, fontWeight: 700, fontSize: "0.75rem" }}
          >
            Semanas
          </ToggleButton>
          <ToggleButton
            value="months"
            sx={{ px: 1.5, fontWeight: 700, fontSize: "0.75rem" }}
          >
            Meses
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="outlined"
          size="small"
          startIcon={<TodayIcon fontSize="small" />}
          onClick={onJumpToday}
          sx={{
            height: 32,
            fontWeight: 700,
            fontSize: "0.75rem",
            borderRadius: 1.5,
          }}
        >
          Hoje
        </Button>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={onPrevPeriod}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="body2"
            sx={{ fontWeight: 800, px: 0.5, fontSize: "0.85rem" }}
          >
            {dateRangeText}
          </Typography>
          <IconButton size="small" onClick={onNextPeriod}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {/* LADO DIREITO: AÇÕES DE INTELIGÊNCIA IA E CRIAÇÃO */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Tooltip title="Otimização Inteligente de Prazos pela IA">
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            startIcon={<AutoFixHighIcon fontSize="small" />}
            onClick={onAutoScheduleAI}
            sx={{
              height: 32,
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: 1.5,
            }}
          >
            Auto Schedule (AI)
          </Button>
        </Tooltip>

        <Tooltip title="Exportar Relatório do Gantt em PDF">
          <IconButton
            size="small"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              height: 32,
              width: 32,
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {onOpenCreateStage && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={onOpenCreateStage}
            sx={{
              height: 32,
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: 1.5,
            }}
          >
            Nova Etapa
          </Button>
        )}

        {onOpenCreateTask && (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={onOpenCreateTask}
            sx={{
              height: 32,
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: 1.5,
            }}
          >
            Nova Sub-task
          </Button>
        )}
      </Stack>
    </Box>
  );
};
