import type {
  CreateTeamInput,
  TeamItem,
  UpdateTeamInput,
} from "../types/team.types";
import { api } from "./api";

export type {
  CreateTeamInput,
  TeamItem,
  UpdateTeamInput,
} from "../types/team.types";

export const teamsService = {
  // Buscar lista de equipes
  async getTeams(): Promise<TeamItem[]> {
    const response = await api.get("/teams");
    return response.data.teams || response.data || [];
  },

  // Obter detalhes de uma equipe específica
  async getTeamById(id: string): Promise<TeamItem> {
    const response = await api.get(`/teams/${id}`);
    return response.data.team || response.data;
  },

  // Criar nova equipe
  async createTeam(data: CreateTeamInput): Promise<TeamItem> {
    const response = await api.post("/teams", data);
    return response.data.team || response.data;
  },

  // Atualizar dados de uma equipe existente (nome / coordenador)
  async updateTeam(id: string, data: UpdateTeamInput): Promise<TeamItem> {
    const response = await api.patch(`/teams/${id}`, data);
    return response.data.team || response.data;
  },

  // Excluir equipe
  async deleteTeam(id: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/teams/${id}`);
    return response.data;
  },

  // Adicionar membro à equipe
  async addMember(teamId: string, userId: string, role: string = "AUTHOR") {
    const response = await api.post(`/teams/${teamId}/members`, { userId, role });
    return response.data;
  },

  // Remover membro da equipe
  async removeMember(teamId: string, userId: string) {
    const response = await api.delete(`/teams/${teamId}/members/${userId}`);
    return response.data;
  },
};
