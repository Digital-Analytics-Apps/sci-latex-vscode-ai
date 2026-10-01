import type { TaskStatus } from "../constants/status";

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignedToId?: string;
  branchName?: string;
  stageId?: string;
}

export interface TaskItem {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  branchName: string;
  status: TaskStatus;
  dueDate: string;
  assignee: string;
  assignedToId?: string;
  stageId?: string;
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
