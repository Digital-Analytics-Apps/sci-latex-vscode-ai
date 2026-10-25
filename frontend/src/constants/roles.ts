export const Role = {
  AUTHOR: "AUTHOR",
  REVIEWER: "REVIEWER",
  COORDINATOR: "COORDINATOR",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  AUTHOR: "Pesquisador / Membro",
  REVIEWER: "Revisor do Artigo",
  COORDINATOR: "Coordenador",
  MANAGER: "Gerente Institucional",
  ADMIN: "Administrador",
};

export const MEMBER_ROLE_COLORS: Record<
  string,
  "info" | "secondary" | "warning" | "primary" | "error" | "default"
> = {
  AUTHOR: "info",
  REVIEWER: "secondary",
  COORDINATOR: "warning",
  MANAGER: "primary",
  ADMIN: "error",
};
