import { User, Role } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}

export class PrismaUsersRepository implements IUsersRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? Role.AUTHOR,
      },
    });
  }
}
