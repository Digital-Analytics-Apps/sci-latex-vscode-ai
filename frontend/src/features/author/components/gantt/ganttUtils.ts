import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { StageStatus, TaskStatus } from "../../../../constants/status";
import type { ProjectStage } from "../../../../types/stage.types";
import type { TaskItem } from "../../../../types/task.types";
import type { UserSimple } from "../../../../types/user.types";

export type TimeScale = "days" | "weeks" | "months";

export interface GanttDateColumn {
  date: Date;
  label: string;
  subLabel?: string;
  isToday: boolean;
  isWeekend?: boolean;
}

export interface AIRiskAlert {
  id: string;
  type: "conference_deadline_breach" | "stage_deadline_breach" | "overdue_task";
  severity: "high" | "medium" | "low";
  message: string;
  entityId: string;
  entityTitle: string;
}

/**
 * Normaliza uma data zerando o horário usando date-fns
 */
export const normalizeDate = (d: Date | string): Date => {
  return startOfDay(new Date(d));
};

/**
 * Calcula a diferença em dias entre duas datas usando date-fns
 */
export const getDaysDifference = (
  startDate: Date | string,
  endDate: Date | string,
): number => {
  return differenceInCalendarDays(
    normalizeDate(endDate),
    normalizeDate(startDate),
  );
};

/**
 * Retorna as colunas de data para o cabeçalho da régua de Gantt usando date-fns
 */
export const generateGanttColumns = (
  rangeStart: Date,
  rangeEnd: Date,
  scale: TimeScale = "days",
): GanttDateColumn[] => {
  const columns: GanttDateColumn[] = [];
  const todayNormalized = startOfDay(new Date());
  let curr = normalizeDate(rangeStart);
  const endLimit = normalizeDate(rangeEnd);

  while (curr <= endLimit) {
    const dayOfWeek = curr.getDay();
    const isToday = curr.getTime() === todayNormalized.getTime();

    if (scale === "days") {
      columns.push({
        date: curr,
        label: curr.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        }),
        subLabel: curr
          .toLocaleDateString("pt-BR", { weekday: "short" })
          .toUpperCase(),
        isToday,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
      curr = addDays(curr, 1);
    } else if (scale === "weeks") {
      const endOfWeek = addDays(curr, 6);
      columns.push({
        date: curr,
        label: `Sem ${curr.getDate()} ${curr.toLocaleDateString("pt-BR", { month: "short" })}`,
        subLabel: `${curr.getDate()}/${curr.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}`,
        isToday,
      });
      curr = addDays(curr, 7);
    } else {
      // months
      columns.push({
        date: curr,
        label: curr.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        }),
        isToday,
      });
      curr = addMonths(curr, 1);
    }
  }

  return columns;
};

/**
 * Calcula a porcentagem ou deslocamento em pixels da barra no gráfico
 */
export const calculateBarPosition = (
  startDateStr: string | undefined | null,
  endDateStr: string | undefined | null,
  rangeStart: Date,
  totalDaysInRange: number,
  fallbackStartDateStr?: string | null,
): { leftPercent: number; widthPercent: number } => {
  const effectiveStartStr = startDateStr ?? fallbackStartDateStr;
  if (!effectiveStartStr && !endDateStr) {
    return { leftPercent: 0, widthPercent: 10 };
  }

  const start = effectiveStartStr
    ? normalizeDate(effectiveStartStr)
    : normalizeDate(rangeStart);
  const end = endDateStr ? normalizeDate(endDateStr) : start;
  const baseStart = normalizeDate(rangeStart);

  const startOffsetDays = getDaysDifference(baseStart, start);
  const durationDays = Math.max(1, getDaysDifference(start, end) + 1);

  const leftPercent = Math.min(
    100,
    Math.max(0, (startOffsetDays / totalDaysInRange) * 100),
  );
  const widthPercent = Math.min(
    100 - leftPercent,
    Math.max(2, (durationDays / totalDaysInRange) * 100),
  );

  return { leftPercent, widthPercent };
};

/**
 * Retorna true se a tarefa estiver concluída/mergeada
 */
export const isTaskCompleted = (task: TaskItem): boolean => {
  return task.status === TaskStatus.MERGED || Boolean(task.isMerged);
};

/**
 * Retorna true se a tarefa já tiver sido iniciada no banco de dados
 */
export const isTaskStarted = (task: TaskItem): boolean => {
  return (
    task.status !== TaskStatus.NOT_STARTED ||
    Boolean(task.startedAt) ||
    Boolean(task.startDate)
  );
};

/**
 * Retorna true se a etapa já tiver sido iniciada no banco de dados
 */
export const isStageStarted = (stage: ProjectStage): boolean => {
  return stage.status !== StageStatus.NOT_STARTED || Boolean(stage.startedAt);
};

/**
 * Calcula a porcentagem do tempo decorrido do início da tarefa até o dia de Hoje
 */
export const calculateTimeElapsedPercent = (
  startDateStr?: string | null,
  endDateStr?: string | null,
  isStarted: boolean = true,
): number => {
  if (!isStarted || !startDateStr || !endDateStr) return 0;
  const start = normalizeDate(startDateStr).getTime();
  const end = normalizeDate(endDateStr).getTime();
  const today = startOfDay(new Date()).getTime();

  if (today <= start) return 0;
  if (today >= end) return 100;

  const totalDuration = end - start;
  if (totalDuration <= 0) return 100;

  const elapsed = today - start;
  return Math.min(
    100,
    Math.max(0, Math.round((elapsed / totalDuration) * 100)),
  );
};

/**
 * Retorna o nome de exibição do responsável (string ou UserSimple) sem fallbacks inventados
 */
export const getAssigneeDisplayName = (
  assignee: TaskItem["assignee"],
): string => {
  if (!assignee) return "";
  if (typeof assignee === "object") return assignee.name;
  return assignee;
};

/**
 * Retorna a cor de fundo da barra de tarefas do Gantt sem ternários aninhados
 */
export const getTaskBarBgColor = (
  isMerged: boolean,
  isOverdue: boolean,
): string => {
  if (isMerged) return "success.main";
  if (isOverdue) return "error.main";
  return "secondary.main";
};

/**
 * Retorna a cor de fundo das colunas no cabeçalho do Gantt
 */
export const getColumnBgColor = (
  isToday: boolean,
  isWeekend?: boolean,
): string => {
  if (isToday) return "rgba(99, 102, 241, 0.12)";
  if (isWeekend) return "action.hover";
  return "transparent";
};

/**
 * Retorna o texto tooltip da barra de tarefa
 */
export const getTaskTooltipText = (
  taskTitle: string,
  dueDate?: string | null,
  assigneeName?: string,
): string => {
  const dueStr = dueDate ? ` | Due: ${dueDate}` : "";
  if (assigneeName) {
    return `Sub-task: ${taskTitle} | Responsável: ${assigneeName}${dueStr}`;
  }
  return `Sub-task: ${taskTitle}${dueStr}`;
};

/**
 * Retorna o texto do progresso da barra de tarefa
 */
export const getTaskProgressText = (
  isMerged: boolean,
  progress?: number,
): string => {
  if (isMerged) return "100% ✓";
  if (typeof progress === "number") return `${progress}%`;
  return "";
};

/**
 * Extrai user e name de assignee de forma limpa para props de componentes
 */
export const extractAssigneeUserAndName = (
  assignee: TaskItem["assignee"],
): { user?: UserSimple; name?: string } => {
  if (!assignee) return {};
  if (typeof assignee === "object") {
    return { user: assignee, name: assignee.name };
  }
  return { name: assignee };
};

/**
 * Retorna os detalhes unificados da entidade selecionada para a gaveta lateral (Drawer)
 */
export const getDrawerEntityDetails = (
  stage: ProjectStage | null | undefined,
  task: TaskItem | null | undefined,
) => {
  if (stage) {
    const slug = stage.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return {
      isStageNode: true,
      title: stage.title,
      branchName: `stage/${slug}`,
      status: stage.status,
      startDate: stage.plannedStartAt,
      endDate: stage.plannedEndAt ?? stage.plannedCompletionDate,
      isMerged: stage.status === StageStatus.COMPLETED,
      progress: 0,
      assigneeName: undefined,
      assigneeUser: undefined,
    };
  }
  if (task) {
    const { user, name } = extractAssigneeUserAndName(task.assignee);
    const isMerged = isTaskCompleted(task);
    const progress = isMerged ? 100 : (task.progress ?? 0);
    return {
      isStageNode: false,
      title: task.title,
      branchName: task.branchName,
      status: task.status,
      startDate: task.startDate,
      endDate: task.dueDate,
      isMerged,
      progress,
      assigneeName: name,
      assigneeUser: user,
    };
  }
  return null;
};

/**
 * Retorna texto descritivo do AI Project Summary
 */
export const getAiSummaryText = (
  riskAlertsCount: number,
  targetConferenceName?: string | null,
): string => {
  if (riskAlertsCount === 0) {
    if (targetConferenceName) {
      return `Projeto alinhado para submissão à ${targetConferenceName} sem impedimentos detectados.`;
    }
    return "Projeto alinhado para submissão sem impedimentos detectados.";
  }
  return `${riskAlertsCount} alerta(s) de prazo detectados pela IA.`;
};

/**
 * Retorna a cor do card de atrasos
 */
export const getOverdueCardBgColor = (overdueTasksCount: number): string => {
  if (overdueTasksCount > 0) return "error.softBg";
  return "background.paper";
};

/**
 * Retorna a cor da borda do card de atrasos
 */
export const getOverdueCardBorderColor = (
  overdueTasksCount: number,
): string => {
  if (overdueTasksCount > 0) return "error.main";
  return "divider";
};

/**
 * Retorna a cor do ícone do card de atrasos
 */
export const getOverdueIconBgColor = (overdueTasksCount: number): string => {
  if (overdueTasksCount > 0) return "error.main";
  return "grey.200";
};

/**
 * Retorna a cor do texto do ícone do card de atrasos
 */
export const getOverdueIconColor = (overdueTasksCount: number): string => {
  if (overdueTasksCount > 0) return "#fff";
  return "grey.700";
};

/**
 * Calcula o progresso consolidado (%) de uma Etapa / Task Principal com base em suas sub-tasks
 */
export const calculateStageProgress = (tasks: TaskItem[]): number => {
  if (!tasks || tasks.length === 0) return 0;
  const completedCount = tasks.filter((t) => isTaskCompleted(t)).length;
  return Math.round((completedCount / tasks.length) * 100);
};

/**
 * Detecta riscos e atrasos inteligentes de IA no projeto usando date-fns
 */
export const detectAIRisks = (
  stages: ProjectStage[],
  tasks: TaskItem[],
  targetConferenceDate?: string | null,
): AIRiskAlert[] => {
  const alerts: AIRiskAlert[] = [];
  const today = startOfDay(new Date());

  const conferenceDeadline = targetConferenceDate
    ? normalizeDate(targetConferenceDate)
    : null;

  // 1. Verificar estouro da Submissão ao Congresso
  if (conferenceDeadline) {
    stages.forEach((stage) => {
      if (stage.plannedEndAt) {
        const stageEnd = normalizeDate(stage.plannedEndAt);
        if (isAfter(stageEnd, conferenceDeadline)) {
          alerts.push({
            id: `conf-breach-${stage.id}`,
            type: "conference_deadline_breach",
            severity: "high",
            entityId: stage.id,
            entityTitle: stage.title,
            message: `A Etapa Principal "${stage.title}" possui prazo (${stageEnd.toLocaleDateString("pt-BR")}) posterior à Submissão do Congresso (${conferenceDeadline.toLocaleDateString("pt-BR")}).`,
          });
        }
      }
    });

    tasks.forEach((task) => {
      if (task.dueDate && !isTaskCompleted(task)) {
        const taskDue = normalizeDate(task.dueDate);
        if (isAfter(taskDue, conferenceDeadline)) {
          alerts.push({
            id: `conf-task-breach-${task.id}`,
            type: "conference_deadline_breach",
            severity: "high",
            entityId: task.id,
            entityTitle: task.title,
            message: `A Sub-task "${task.title}" estoura o prazo limite de Submissão do Congresso.`,
          });
        }
      }
    });
  }

  // 2. Verificar sub-tasks atrasadas (overdue)
  tasks.forEach((task) => {
    if (task.dueDate && !isTaskCompleted(task)) {
      const taskDue = normalizeDate(task.dueDate);
      if (isBefore(taskDue, today)) {
        alerts.push({
          id: `overdue-${task.id}`,
          type: "overdue_task",
          severity: "medium",
          entityId: task.id,
          entityTitle: task.title,
          message: `Sub-task "${task.title}" está com a data limite de entrega vencida (${taskDue.toLocaleDateString("pt-BR")}).`,
        });
      }
    }
  });

  return alerts;
};
