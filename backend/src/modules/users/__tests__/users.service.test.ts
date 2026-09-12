import { beforeEach, describe, expect, it } from 'vitest';
import { UsersService } from '../users.service';
import { Role } from '@prisma/client';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockUsersRepo: any;

  beforeEach(() => {
    mockUsersRepo = {
      searchMany: async ({ search, role }: any) => {
        const users = [
          { id: 'usr-1', name: 'João Silva', email: 'joao.silva@nit.edu.br', role: Role.AUTHOR },
          { id: 'usr-2', name: 'Maria Souza', email: 'maria.souza@nit.edu.br', role: Role.AUTHOR },
          {
            id: 'usr-3',
            name: 'Dr. Carlos Lima',
            email: 'carlos.lima@nit.edu.br',
            role: Role.REVIEWER,
          },
        ];

        return users.filter((u) => {
          const matchesRole = !role || u.role === role;
          const matchesSearch =
            !search ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
          return matchesRole && matchesSearch;
        });
      },
    };

    usersService = new UsersService(mockUsersRepo);
  });

  it('should search users by query substring', async () => {
    const results = await usersService.searchUsers('silva');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('João Silva');
  });

  it('should filter users by role', async () => {
    const results = await usersService.searchUsers(undefined, Role.REVIEWER);
    expect(results).toHaveLength(1);
    expect(results[0].role).toBe(Role.REVIEWER);
    expect(results[0].name).toBe('Dr. Carlos Lima');
  });
});
