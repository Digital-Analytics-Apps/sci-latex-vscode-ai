import type { TaskStatus } from "../constants/status";
import type { UserSimple } from "./user.types";

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignedToId?: string;
  assignee?: UserSimple | string;
  stageId?: string;
  startDate?: string;
  startedAt?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  progress?: number;
}

export interface TaskItem {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  status: TaskStatus;
  startDate?: string;
  startedAt?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  assignee?: UserSimple;
  assignedToId?: string;
  stageId?: string;
  progress?: number;
  stage?: {
    id: string;
    title: string;
    order: number;
    isGatekeeper?: boolean;
    gatekeeperType?: string | null;
  };
  isBlockedByPrevious?: boolean;
}

export interface CreateTaskInput {
  title: string;
  assignedToId?: string;
  dueDate?: string;
  stageId?: string;
}
