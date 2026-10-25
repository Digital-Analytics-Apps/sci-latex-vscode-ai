import type { SubmissionStatus } from "../constants/status";
import type { ProjectStage } from "./stage.types";
import type { TaskItem, TaskSummary } from "./task.types";
import type { ProjectMember } from "./user.types";

export interface ProjectDetails {
  id: string;
  name: string;
  description?: string;
  gitRepoPath?: string | null;
  coordinatorId: string;
  managerId: string;
  coordinator?: { id: string; name: string; email: string };
  manager?: { id: string; name: string; email: string };
  submissionStatus: SubmissionStatus;
  targetConferenceName?: string | null;
  targetConferenceDate?: string | null;
  backupConferenceName?: string | null;
  backupConferenceDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  stages?: ProjectStage[];
  tasks?: TaskSummary[];
  members: ProjectMember[];
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string | null;
  submissionStatus: SubmissionStatus;
  targetConferenceName?: string | null;
  targetConferenceDate?: string | null;
  backupConferenceName?: string | null;
  backupConferenceDate?: string | null;
  createdAt: string;
  updatedAt: string;
  stages?: ProjectStage[];
  coordinator?: { id: string; name: string; email: string };
  manager?: { id: string; name: string; email: string };
  _count?: { tasks: number; members: number };
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  targetConferenceName?: string;
  targetConferenceDate?: string;
  coordinatorId: string;
  managerId: string;
  additionalAuthorIds?: string[];
  authorIds?: string[];
  reviewerId?: string;
  stages?: Array<{
    title: string;
    description?: string;
    plannedStartAt?: string;
    plannedEndAt?: string;
    plannedCompletionDate?: string;
  }>;
}

export interface ArticleItem {
  id: string;
  projectId: string;
  title: string;
  conference: string;
  repo: string;
  role: "Autor" | "Revisor de Par";
  status: string;
  progress: number;
  tasks: TaskItem[];
  members: ProjectMember[];
}
