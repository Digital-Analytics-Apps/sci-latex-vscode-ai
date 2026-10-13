export const MEMBER_ROLE_LABELS = {
  AUTHOR: "Pesquisador / Integrante",
  REVIEWER: "Revisor Técnico de Artigo",
  COORDINATOR: "Coordenador de Laboratório",
  MANAGER: "Gerente Institucional",
  ADMIN: "Administrador",
} as const;

export const MEMBER_ROLE_COLORS = {
  AUTHOR: "info",
  REVIEWER: "secondary",
  COORDINATOR: "warning",
  MANAGER: "primary",
  ADMIN: "error",
} as const;

export const TEAM_MANAGEMENT_LABELS = {
  TITLE: "Gestão de Equipes & Laboratórios de Pesquisa",
  SUBTITLE:
    "Gerencie equipes, atribua coordenadores e vincule pesquisadores com papéis definidos",
  NEW_TEAM_BUTTON: "Nova Equipe",
  NEW_USER_BUTTON: "Cadastrar Membro",
  MANAGE_TEAM_BUTTON: "Gerenciar Equipe",
  DELETE_TEAM_CONFIRM: (name: string) =>
    `Tem certeza que deseja excluir a equipe "${name}"?`,
  TAB_GENERAL: "Dados Gerais da Equipe",
  TAB_MEMBERS: "Integrantes & Funções",
} as const;
