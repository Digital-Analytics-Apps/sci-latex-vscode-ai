import { Prisma, Project, Role, SubmissionStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateProjectData {
  id?: string;
  name: string;
  description?: string;
  academicPeriodId?: string;
  coordinatorId?: string | null;
  managerId?: string | null;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  creatorId: string;
  additionalAuthorIds?: string[];
  reviewerId?: string;
  templateId?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  submissionStatus?: SubmissionStatus;
  doi?: string;
  publicationUrl?: string;
  datasetUrl?: string;
  publishedAt?: Date;
  reviewerFeedback?: string;
}

export interface ProjectFilterOptions {
  academicPeriodId?: string;
  coordinatorId?: string;
  managerId?: string;
  userId?: string;
}

export interface IProjectsRepository {
  create(data: CreateProjectData): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findAll(filters?: ProjectFilterOptions): Promise<Project[]>;
  update(id: string, data: UpdateProjectData): Promise<Project>;
  addMember(projectId: string, userId: string, role: Role): Promise<void>;
  removeMember(projectId: string, userId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export class PrismaProjectsRepository implements IProjectsRepository {
  async create(data: CreateProjectData): Promise<Project> {
    const memberRoles: Record<string, Role> = {};
    // O criador do projeto é sempre associado com papel AUTHOR
    memberRoles[data.creatorId] = Role.AUTHOR;

    // Coordenador (se for usuário distinto)
    if (data.coordinatorId && !memberRoles[data.coordinatorId]) {
      memberRoles[data.coordinatorId] = Role.COORDINATOR;
    }

    // Gerente (se for usuário distinto)
    if (data.managerId && !memberRoles[data.managerId]) {
      memberRoles[data.managerId] = Role.MANAGER;
    }

    if (data.reviewerId && !memberRoles[data.reviewerId]) {
      memberRoles[data.reviewerId] = Role.REVIEWER;
    }

    if (data.additionalAuthorIds && data.additionalAuthorIds.length > 0) {
      for (const authorId of data.additionalAuthorIds) {
        if (!memberRoles[authorId]) {
          memberRoles[authorId] = Role.AUTHOR;
        }
      }
    }

    const memberCreates: Prisma.ProjectMemberCreateManyProjectInput[] = Object.entries(
      memberRoles
    ).map(([userId, role]) => ({ userId, role }));
    return prisma.project.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        academicPeriodId: data.academicPeriodId,
        coordinatorId: data.coordinatorId,
        managerId: data.managerId,
        targetConferenceName: data.targetConferenceName,
        targetConferenceDate: data.targetConferenceDate,
        backupConferenceName: data.backupConferenceName,
        backupConferenceDate: data.backupConferenceDate,
        templateId: data.templateId,
        members: {
          createMany: {
            data: memberCreates,
          },
        },
      },
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        academicPeriod: true,
        template: true,
        stages: {
          orderBy: { order: 'asc' },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        academicPeriod: true,
        stages: {
          include: {
            tasks: {
              select: {
                id: true,
                title: true,
                status: true,
                assignedToId: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(filters?: ProjectFilterOptions): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
    };

    if (filters?.coordinatorId) {
      where.coordinatorId = filters.coordinatorId;
    }

    if (filters?.managerId) {
      where.managerId = filters.managerId;
    }

    if (filters?.academicPeriodId) {
      where.academicPeriodId = filters.academicPeriodId;
    }

    if (filters?.userId) {
      where.members = {
        some: {
          userId: filters.userId,
        },
      };
    }

    return prisma.project.findMany({
      where,
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        academicPeriod: true,
        stages: {
          orderBy: { order: 'asc' },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        coordinator: { select: { id: true, name: true, email: true, role: true } },
        manager: { select: { id: true, name: true, email: true, role: true } },
        academicPeriod: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async addMember(projectId: string, userId: string, role: Role): Promise<void> {
    await prisma.projectMember.upsert({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      update: { role },
      create: {
        projectId,
        userId,
        role,
      },
    });
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await prisma.projectMember.deleteMany({
      where: {
        projectId,
        userId,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
