import { Role } from '@prisma/client';
import { IUsersRepository } from '../../repositories/users.repository';

export class UsersService {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async searchUsers(search?: string, role?: Role) {
    const users = await this.usersRepository.searchMany({
      search,
      role,
      limit: 100,
    });

    return users.map((u) => {
      const withCount = u as typeof u & { _count?: { projects?: number } };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        teams: [],
        projectCount: withCount._count?.projects ?? 0,
        createdAt: u.createdAt,
      };
    });
  }
}
