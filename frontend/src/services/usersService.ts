import { api } from "./api";

export interface UserMemberItem {
  id: string;
  name: string;
  email: string;
  role: "AUTHOR" | "REVIEWER" | "COORDINATOR" | "MANAGER" | "ADMIN";
}

export const usersService = {
  // Buscar lista de usuários com suporte a termo de busca (debounced) e papel (role)
  async searchUsers(
    search: string = "",
    role?: string,
  ): Promise<UserMemberItem[]> {
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (role) {
        params.append("role", role);
      }
      const response = await api.get(`/users?${params.toString()}`);
      return response.data.users || [];
    } catch {
      return [];
    }
  },

  // Buscar lista de co-autores disponíveis na API REST real
  async getCoAuthors(): Promise<UserMemberItem[]> {
    return this.searchUsers("", "AUTHOR");
  },

  // Buscar lista de revisores técnicos disponíveis na API REST real
  async getReviewers(): Promise<UserMemberItem[]> {
    return this.searchUsers("", "REVIEWER");
  },
};
