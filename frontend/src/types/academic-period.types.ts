import type { PeriodStatus } from "../constants/status";
import type { UserSimple } from "./user.types";

export interface AcademicPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetArticlesCount: number;
  status: PeriodStatus;
  managerId?: string | null;
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

export interface ManagerDashboardCoordinatorSummary {
  coordinatorId: string;
  coordinator: UserSimple | null;
  totalProjects: number;
  publishedCount: number;
}
export interface ManagerDashboardData {
  overview: {
    totalProjects: number;
    publishedProjects: number;
    inReviewProjects: number;
    submittedProjects: number;
    rejectedProjects: number;
  };
  deadlines: {
    onTimeCount: number;
    warningSoonCount: number;
    overdueCount: number;
  };
  coordinators?: ManagerDashboardCoordinatorSummary[];
  teams?: unknown[];
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    user: UserSimple | null;
    details?: unknown;
  }>;
}
