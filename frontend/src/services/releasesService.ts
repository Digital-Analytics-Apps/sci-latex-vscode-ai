import type {
  CreateRCInput,
  ReleaseCandidateItem,
} from "../types/release-candidate.types";
import { api } from "./api";

export type {
  CreateRCInput,
  ReleaseCandidateItem,
} from "../types/release-candidate.types";

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
