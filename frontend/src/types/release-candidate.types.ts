import type { RCStatus } from "../constants/status";

export interface ReleaseCandidateItem {
  id: string;
  projectId: string;
  versionTag: string;
  status: RCStatus;
  feedback?: string;
  createdAt: string;
}

export interface CreateRCInput {
  feedbackNotes?: string;
}
