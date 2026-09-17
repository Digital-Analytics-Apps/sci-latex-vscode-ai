export const Role = {
  AUTHOR: "AUTHOR",
  REVIEWER: "REVIEWER",
  COORDINATOR: "COORDINATOR",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
