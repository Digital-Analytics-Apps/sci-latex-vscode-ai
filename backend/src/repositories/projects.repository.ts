import { Project, Prisma, Role, SubmissionStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateProjectData {
  name: string;
  description?: string;
  gitRepoPath: string;
  teamId: string;
  academicPeriodId?: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  creatorId: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  gitRepoPath?: string;
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
  teamId?: string;
  academicPeriodId?: string;
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
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        gitRepoPath: data.gitRepoPath,
        teamId: data.teamId,
        academicPeriodId: data.academicPeriodId,
        targetConferenceName: data.targetConferenceName,
        targetConferenceDate: data.targetConferenceDate,
        backupConferenceName: data.backupConferenceName,
        backupConferenceDate: data.backupConferenceDate,
        members: {
          create: {
            userId: data.creatorId,
            role: Role.AUTHOR,
          },
        },
      },
      include: {
        team: true,
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

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        team: true,
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
        sections: true,
        prs: {
          select: {
            id: true,
            title: true,
            status: true,
            nitStatus: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findAll(filters?: ProjectFilterOptions): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
    };

    if (filters?.teamId) {
      where.teamId = filters.teamId;
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
        team: true,
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
        team: true,
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
