import type { DeadlineStatus, PeriodStatus } from "../constants/status";

export interface TeamAcademicGoal {
  id: string;
  academicPeriodId: string;
  teamId: string;
  targetArticles: number;
  team?: { id: string; name: string };
}

export interface AcademicPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetArticlesCount: number;
  status: PeriodStatus;
  managerId?: string | null;
  teamGoals?: TeamAcademicGoal[];
}

export interface ManagerMetrics {
  totalProjects: number;
  publishedCount: number;
  onTimeCount: number;
  warningCount: number;
  overdueCount: number;
  targetSuccessRate: number;
  nitApprovalRate: number;
  academicPeriodTargetCount?: number;
}

export interface TeamDeadlineItem {
  id: string;
  projectName: string;
  taskTitle: string;
  authorName: string;
  dueDate: string;
  status: DeadlineStatus;
}
