export const TaskStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  UNDER_REVIEW: "UNDER_REVIEW",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  MERGED: "MERGED",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const RCStatus = {
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
} as const;

export type RCStatus = (typeof RCStatus)[keyof typeof RCStatus];

export const PRStatus = {
  DRAFT: "DRAFT",
  UNDER_REVIEW: "UNDER_REVIEW",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  MERGED: "MERGED",
  CANCELLED: "CANCELLED",
} as const;

export type PRStatus = (typeof PRStatus)[keyof typeof PRStatus];

export const NITStatus = {
  NOT_REQUIRED: "NOT_REQUIRED",
  WAITING_NIT: "WAITING_NIT",
  APPROVED_NIT: "APPROVED_NIT",
  REJECTED_NIT: "REJECTED_NIT",
} as const;

export type NITStatus = (typeof NITStatus)[keyof typeof NITStatus];

export const DeadlineStatus = {
  ON_TIME: "ON_TIME",
  WARNING_SOON: "WARNING_SOON",
  OVERDUE: "OVERDUE",
} as const;

export type DeadlineStatus =
  (typeof DeadlineStatus)[keyof typeof DeadlineStatus];
