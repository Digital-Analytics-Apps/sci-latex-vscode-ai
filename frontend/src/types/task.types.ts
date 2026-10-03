import type { TaskStatus } from "../constants/status";

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignedToId?: string;
  branchName?: string;
  stageId?: string;
  startDate?: string;
  dueDate?: string;
  progress?: number;
  isMerged?: boolean;
}

export interface TaskItem {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  branchName: string;
  status: TaskStatus;
  startDate?: string;
  dueDate: string;
  assignee: string;
  assignedToId?: string;
  stageId?: string;
  progress?: number;
  isMerged?: boolean;
  prUrl?: string;
  stage?: {
    id: string;
    title: string;
    order: number;
    isGatekeeper?: boolean;
    gatekeeperType?: string | null;
  };
  isOccupied?: boolean;
  occupiedBy?: { id: string; name: string } | null;
}

export interface CreateTaskInput {
  title: string;
  assignedToId?: string;
  dueDate?: string;
  stageId?: string;
}
