import { Role } from '@prisma/client';
import { IUsersRepository } from '../../repositories/users.repository';

export class UsersService {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async searchUsers(search?: string, role?: Role, teamId?: string) {
    const users = await this.usersRepository.searchMany({
      search,
      role,
      teamId,
      limit: 100,
    });

    return users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      teams: (u.teamMemberships || []).map((m: any) => ({
        id: m.team.id,
        name: m.team.name,
        role: m.role,
      })),
      projectCount: u._count?.projects ?? 0,
      createdAt: u.createdAt,
    }));
  }
}
