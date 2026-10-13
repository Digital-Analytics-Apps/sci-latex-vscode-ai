import { Role } from "../constants/roles";
import type { ArticleItem, ProjectDetails } from "../types/project.types";
import { api } from "./api";

export type { ArticleItem } from "../types/project.types";
export type { ProjectMember as ArticleMember } from "../types/user.types";

export const articlesService = {
  // Buscar artigos científicos do usuário diretamente da API REST real (/projects)
  async getUserArticles(): Promise<ArticleItem[]> {
    const response = await api.get("/projects");
    const rawProjects: ProjectDetails[] =
      response.data.projects || response.data || [];
    if (!Array.isArray(rawProjects)) return [];

    return rawProjects.map((proj) => ({
      id: proj.id,
      projectId: proj.id,
      title: proj.name,
      conference: proj.targetConferenceName || "Sem conferência",
      repo: proj.gitRepoPath,
      role:
        proj.members?.[0]?.role === Role.REVIEWER ? "Revisor de Par" : "Autor",
      status: proj.submissionStatus,
      progress: 0,
      tasks: [],
      members: proj.members || [],
    }));
  },
};
