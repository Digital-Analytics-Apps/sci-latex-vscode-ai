import type { TaskStatus } from "../constants/status";
import type { UserSimple } from "./user.types";

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignedToId?: string;
  assignee?: UserSimple | string;
  branchName?: string;
  stageId?: string;
  startDate?: string;
  startedAt?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
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
  startedAt?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  assignee?: UserSimple;
  assignedToId?: string;
  stageId?: string;
  progress?: number;
  isMerged?: boolean;
  prUrl?: string;
  pullRequests?: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    nitStatus?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
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
