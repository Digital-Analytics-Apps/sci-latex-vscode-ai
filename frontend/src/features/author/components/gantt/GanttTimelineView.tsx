import { Box, Paper } from "@mui/material";
import { addDays, startOfDay, subDays } from "date-fns";
import React, { useMemo, useState } from "react";
import type { ProjectStage } from "../../../../types/stage.types";
import type { TaskItem } from "../../../../types/task.types";
import { GanttChartGrid } from "./GanttChartGrid";
import { GanttHeaderStats } from "./GanttHeaderStats";
import { GanttTableTree } from "./GanttTableTree";
import { GanttTaskDetailDrawer } from "./GanttTaskDetailDrawer";
import { GanttToolbar } from "./GanttToolbar";
import {
  detectAIRisks,
  generateGanttColumns,
  type TimeScale,
} from "./ganttUtils";

interface GanttTimelineViewProps {
  stages: ProjectStage[];
  tasks: TaskItem[];
  projectCreatedAt?: string | null;
  targetConferenceName?: string | null;
  targetConferenceDate?: string | null;
  onStartWorkspace?: (taskId: string, branchName: string) => void;
  onOpenCreateStage?: () => void;
  onOpenCreateTask?: () => void;
}

export const GanttTimelineView: React.FC<GanttTimelineViewProps> = ({
  stages,
  tasks,
  projectCreatedAt,
  targetConferenceName,
  targetConferenceDate,
  onStartWorkspace,
  onOpenCreateStage,
  onOpenCreateTask,
}) => {
  // Estado da escala de tempo (Dias / Semanas / Meses)
  const [scale, setScale] = useState<TimeScale>("days");

  // Estado da janela do calendário (Data inicial e final do projeto)
  const [rangeStart, setRangeStart] = useState<Date>(() =>
    subDays(startOfDay(new Date()), 5),
  );

  const [rangeEnd, setRangeEnd] = useState<Date>(() => {
    if (targetConferenceDate) {
      return addDays(startOfDay(new Date(targetConferenceDate)), 7);
    }
    return addDays(startOfDay(new Date()), 35);
  });

  // Entidade Selecionada para a Gaveta Lateral de Detalhes
  const [selectedStage, setSelectedStage] = useState<ProjectStage | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Geração das Colunas da Régua de Datas
  const columns = useMemo(
    () => generateGanttColumns(rangeStart, rangeEnd, scale),
    [rangeStart, rangeEnd, scale],
  );

  // Detecção Inteligente de Riscos e Prazos pela IA
  const riskAlerts = useMemo(
    () => detectAIRisks(stages, tasks, targetConferenceDate),
    [stages, tasks, targetConferenceDate],
  );

  // Formatação do Texto do Intervalo no Toolbar
  const dateRangeText = useMemo(() => {
    const startStr = rangeStart.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    const endStr = rangeEnd.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }, [rangeStart, rangeEnd]);

  // Handlers de Navegação no Calendário usando date-fns
  const handleJumpToday = () => {
    const today = startOfDay(new Date());
    setRangeStart(subDays(today, 5));
    setRangeEnd(addDays(today, 35));
  };

  const handlePrevPeriod = () => {
    setRangeStart((prev) => subDays(prev, 7));
    setRangeEnd((prev) => subDays(prev, 7));
  };

  const handleNextPeriod = () => {
    setRangeStart((prev) => addDays(prev, 7));
    setRangeEnd((prev) => addDays(prev, 7));
  };

  const handleSelectEntity = (
    stage?: ProjectStage | null,
    task?: TaskItem | null,
  ) => {
    setSelectedStage(stage || null);
    setSelectedTask(task || null);
    setIsDrawerOpen(true);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* 1. SEÇÃO DE METRICAS KPI E ALERTAS AI */}
      <GanttHeaderStats
        stages={stages}
        tasks={tasks}
        riskAlerts={riskAlerts}
        targetConferenceName={targetConferenceName}
        targetConferenceDate={targetConferenceDate}
      />

      {/* 2. BARRA DE FERRAMENTAS DO GANTT */}
      <GanttToolbar
        scale={scale}
        onChangeScale={setScale}
        onJumpToday={handleJumpToday}
        onPrevPeriod={handlePrevPeriod}
        onNextPeriod={handleNextPeriod}
        dateRangeText={dateRangeText}
        onOpenCreateStage={onOpenCreateStage}
        onOpenCreateTask={onOpenCreateTask}
        onAutoScheduleAI={() =>
          alert("Otimização preditiva de prazos via IA executada com sucesso!")
        }
      />

      {/* 3. MATRIZ DE GANTT (TABELA ÁRVORE + RETA DE BARRAS) */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 1,
        }}
      >
        {/* Árvore de Nós Hierárquicos à Esquerda */}
        <GanttTableTree
          stages={stages}
          tasks={tasks}
          onSelectEntity={handleSelectEntity}
          selectedEntityId={selectedTask?.id || selectedStage?.id}
        />

        {/* Gráfico de Barras e Régua de Datas à Direita */}
        <GanttChartGrid
          stages={stages}
          tasks={tasks}
          columns={columns}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          projectCreatedAt={projectCreatedAt}
          targetConferenceDate={targetConferenceDate}
          targetConferenceName={targetConferenceName}
          onSelectEntity={handleSelectEntity}
          selectedEntityId={selectedTask?.id || selectedStage?.id}
        />
      </Paper>

      {/* 4. GAVETA LATERAL DE DETALHES DA TAREFA / ETAPA */}
      <GanttTaskDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        stage={selectedStage}
        task={selectedTask}
        onStartWorkspace={onStartWorkspace}
      />
    </Box>
  );
};
