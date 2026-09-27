import type { StageStatus } from "../constants/status";
import type { TaskSummary } from "./task.types";

export type GatekeeperType = "NIT" | "TARGET_CONFERENCE";

export interface ProjectStage {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  order: number;
  status: StageStatus;
  isGatekeeper: boolean;
  gatekeeperType?: GatekeeperType | null;
  plannedCompletionDate?: string | null;
  tasks?: TaskSummary[];
}

export interface CreateStageInput {
  title: string;
  order?: number;
  description?: string;
}

export interface UpdateStageInput {
  title?: string;
  order?: number;
  status?: StageStatus;
}
