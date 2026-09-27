import { Role } from "../constants/roles";
import type { UserMemberItem } from "../types/user.types";
import { api } from "./api";

export type { UserMemberItem } from "../types/user.types";

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
    return this.searchUsers("", Role.AUTHOR);
  },

  // Buscar lista de revisores técnicos disponíveis na API REST real
  async getReviewers(): Promise<UserMemberItem[]> {
    return this.searchUsers("", Role.REVIEWER);
  },

  // Cadastrar novo usuário/pesquisador no sistema
  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<UserMemberItem> {
    const response = await api.post("/auth/register", data);
    return response.data.user || response.data;
  },
};
