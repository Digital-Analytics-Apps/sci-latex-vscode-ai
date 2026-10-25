import { Prisma, Project, Role, SubmissionStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateProjectData {
  id?: string;
  name: string;
  description?: string;
  academicPeriodId?: string;
  coordinatorId: string;
  managerId: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  creatorId: string;
  additionalAuthorIds?: string[];
  reviewerId?: string;
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
    const memberCreates: Prisma.ProjectMemberCreateManyProjectInput[] = [
      { userId: data.creatorId, role: Role.AUTHOR },
      { userId: data.coordinatorId, role: Role.COORDINATOR },
      { userId: data.managerId, role: Role.MANAGER },
    ];

    if (data.reviewerId) {
      memberCreates.push({ userId: data.reviewerId, role: Role.REVIEWER });
    }

    if (data.additionalAuthorIds && data.additionalAuthorIds.length > 0) {
      for (const authorId of data.additionalAuthorIds) {
        if (!memberCreates.some((m) => m.userId === authorId)) {
          memberCreates.push({ userId: authorId, role: Role.AUTHOR });
        }
      }
    }

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
