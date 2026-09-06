import { Session, User } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateSessionData {
  userId: string;
  refreshToken: string;
  expiresAt: Date;
}

export type SessionWithUser = Session & { user: User };

export interface ISessionsRepository {
  create(data: CreateSessionData): Promise<Session>;
  findByRefreshToken(refreshToken: string): Promise<SessionWithUser | null>;
  deleteById(id: string): Promise<void>;
  deleteByRefreshToken(refreshToken: string): Promise<void>;
}

export class PrismaSessionsRepository implements ISessionsRepository {
  async create(data: CreateSessionData): Promise<Session> {
    return prisma.session.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<SessionWithUser | null> {
    return prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });
  }

  async deleteById(id: string): Promise<void> {
    await prisma.session.delete({ where: { id } });
  }

  async deleteByRefreshToken(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }
}
