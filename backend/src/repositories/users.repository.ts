import { Role, User } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}

export interface SearchUsersParams {
  search?: string;
  role?: Role;
  teamId?: string;
  limit?: number;
}

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  searchMany(params: SearchUsersParams): Promise<User[]>;
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

  async searchMany({ search, role, teamId, limit = 100 }: SearchUsersParams): Promise<User[]> {
    const where: any = {
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (teamId) {
      where.teamMemberships = {
        some: {
          teamId,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.user.findMany({
      where,
      take: limit,
      include: {
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
