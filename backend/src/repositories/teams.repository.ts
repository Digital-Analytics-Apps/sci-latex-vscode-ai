import { Role, Team } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateTeamData {
  name: string;
  description?: string;
  coordinatorId?: string;
  coordinatorEmail?: string;
  managerId?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  coordinatorId?: string;
  coordinatorEmail?: string;
  managerId?: string;
}

export interface ITeamsRepository {
  create(data: CreateTeamData): Promise<Team>;
  findById(id: string): Promise<Team | null>;
  findAll(params?: { managerId?: string; search?: string }): Promise<Team[]>;
  update(id: string, data: UpdateTeamData): Promise<Team>;
  addMember(teamId: string, userId: string, role: Role): Promise<void>;
  removeMember(teamId: string, userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  findDefaultTeamForUser(userId: string): Promise<Team | null>;
  getOrCreateDefaultTeam(coordinatorId: string): Promise<Team>;
}

export class PrismaTeamsRepository implements ITeamsRepository {
  async create(data: CreateTeamData): Promise<Team> {
    const coordinatorId = data.coordinatorId;
    if (!coordinatorId) {
      throw new Error('COORDINATOR_ID_REQUIRED');
    }

    return prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        coordinator: {
          connect: { id: coordinatorId },
        },
        ...(data.managerId ? { manager: { connect: { id: data.managerId } } } : {}),
        members: {
          create: {
            userId: coordinatorId,
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
    return prisma.team.findFirst({
      where: { id, deletedAt: null },
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        projects: { where: { deletedAt: null } },
      },
    });
  }

  async findAll(params?: { managerId?: string; search?: string }): Promise<Team[]> {
    const managerId = params?.managerId;
    const search = params?.search;

    const where: any = {
      deletedAt: null,
      ...(managerId ? { managerId } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { coordinator: { email: { contains: search, mode: 'insensitive' } } },
        { coordinator: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return prisma.team.findMany({
      where,
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
    await prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async findDefaultTeamForUser(userId: string): Promise<Team | null> {
    const member = await prisma.teamMember.findFirst({
      where: { userId },
      include: { team: true },
    });
    if (member?.team) return member.team;

    return prisma.team.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOrCreateDefaultTeam(coordinatorId: string): Promise<Team> {
    const existingTeam = await this.findDefaultTeamForUser(coordinatorId);
    if (existingTeam) return existingTeam;

    return this.create({
      name: 'Equipe de Pesquisa Padrão',
      description: 'Equipe padrão para projetos de escrita científica',
      coordinatorId,
    });
  }
}
