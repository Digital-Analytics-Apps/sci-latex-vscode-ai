import { Team, Role } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateTeamData {
  name: string;
  description?: string;
  coordinatorId: string;
  managerId?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  coordinatorId?: string;
  managerId?: string;
}

export class PrismaTeamsRepository {
  async create(data: CreateTeamData): Promise<Team> {
    return prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        coordinatorId: data.coordinatorId,
        managerId: data.managerId,
        members: {
          create: {
            userId: data.coordinatorId,
            role: Role.COORDINATOR,
          },
        },
      },
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        projects: { select: { id: true, name: true, submissionStatus: true } },
      },
    });
  }

  async findById(id: string): Promise<Team | null> {
    return prisma.team.findUnique({
      where: { id },
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        projects: true,
      },
    });
  }

  async findAll(managerId?: string): Promise<Team[]> {
    return prisma.team.findMany({
      where: managerId ? { managerId } : undefined,
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        _count: { select: { projects: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateTeamData): Promise<Team> {
    return prisma.team.update({
      where: { id },
      data,
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
  }

  async addMember(teamId: string, userId: string, role: Role): Promise<void> {
    await prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      update: { role },
      create: {
        teamId,
        userId,
        role,
      },
    });
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await prisma.teamMember.deleteMany({
      where: {
        teamId,
        userId,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.team.delete({
      where: { id },
    });
  }
}
