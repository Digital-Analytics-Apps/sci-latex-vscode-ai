import { api } from "./api";
import type { TaskItem } from "./tasksService";

export interface ArticleMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export interface ArticleItem {
  id: string;
  projectId: string;
  title: string;
  conference: string;
  repo: string;
  role: "Autor Principal" | "Co-Autor" | "Revisor de Par";
  status: string;
  progress: number;
  tasks: TaskItem[];
  members: ArticleMember[];
}

export const articlesService = {
  // Buscar artigos científicos do usuário diretamente da API REST real (/projects)
  async getUserArticles(): Promise<ArticleItem[]> {
    const response = await api.get("/projects");
    const rawProjects = response.data.projects || response.data || [];
    if (!Array.isArray(rawProjects)) return [];

    return rawProjects.map((proj: any) => ({
      id: proj.id,
      projectId: proj.id,
      title: proj.name,
      conference: proj.targetConferenceName || "Conferência TeX",
      repo: proj.gitRepoPath || `github.com/org/${proj.id.slice(0, 8)}`,
      role:
        proj.members?.[0]?.role === "REVIEWER"
          ? "Revisor de Par"
          : proj.members?.[0]?.role === "CO_AUTHOR"
            ? "Co-Autor"
            : "Autor Principal",
      status: proj.submissionStatus || "RC-1 em Andamento",
      progress: proj.progress || 0,
      tasks: proj.tasks || [],
      members: proj.members || [],
    }));
  },
};
