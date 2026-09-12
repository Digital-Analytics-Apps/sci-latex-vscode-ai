import { api } from "./api";

export interface ReleaseCandidateItem {
  id: string;
  projectId: string;
  versionTag: string;
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
  feedback?: string;
  createdAt: string;
}

export interface CreateRCInput {
  feedbackNotes?: string;
}

export const releasesService = {
  // Buscar Release Candidates do projeto diretamente da API REST real
  async getReleaseCandidates(
    projectId: string,
  ): Promise<ReleaseCandidateItem[]> {
    if (!projectId) return [];
    const response = await api.get(`/projects/${projectId}/release-candidates`);
    return response.data.releaseCandidates || [];
  },

  // Gerar e submeter nova RC
  async createReleaseCandidate(
    projectId: string,
    data?: CreateRCInput,
  ): Promise<ReleaseCandidateItem> {
    const response = await api.post(
      `/projects/${projectId}/release-candidates`,
      data || {},
    );
    return response.data.releaseCandidate;
  },

  // Publicar release oficial na branch main (v1.0)
  async publishRelease(projectId: string, versionTag: string = "v1.0") {
    const response = await api.post(`/projects/${projectId}/releases`, {
      versionTag,
    });
    return response.data.release;
  },
};
