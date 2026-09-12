import { Role } from '@prisma/client';
import { IUsersRepository } from '../../repositories/users.repository';

export class UsersService {
  constructor(private usersRepository: IUsersRepository) {}

  async searchUsers(search?: string, role?: Role) {
    const users = await this.usersRepository.searchMany({
      search,
      role,
      limit: 20,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }
}
