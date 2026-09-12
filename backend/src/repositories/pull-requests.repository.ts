import { NITStatus, Prisma, PRStatus, ReviewComment } from '@prisma/client';
import { prisma } from '../db/prisma';

export const prInclude = {
  author: { select: { id: true, name: true, email: true, role: true } },
  reviewer: { select: { id: true, name: true, email: true, role: true } },
  task: true,
  project: true,
} as const;

export type PullRequestWithRelations = Prisma.PullRequestGetPayload<{
  include: typeof prInclude;
}>;

export interface CreatePRData {
  title: string;
  description?: string | null;
  taskId?: string;
  projectId: string;
  authorId?: string;
  reviewerId?: string | null;
  nitStatus?: NITStatus;
}

export interface AddCommentData {
  pullRequestId: string;
  userId: string;
  lineNumer?: number;
  comment: string;
}

export class PrismaPullRequestsRepository {
  async create(data: CreatePRData): Promise<PullRequestWithRelations> {
    return prisma.pullRequest.create({
      data: {
        title: data.title,
        description: data.description,
        taskId: data.taskId,
        projectId: data.projectId,
        authorId: data.authorId || '',
        reviewerId: data.reviewerId,
        nitStatus: data.nitStatus || NITStatus.WAITING_NIT,
        status: PRStatus.UNDER_REVIEW,
      },
      include: prInclude,
    }) as unknown as Promise<PullRequestWithRelations>;
  }

  async findById(id: string): Promise<(PullRequestWithRelations & { comments: any[] }) | null> {
    return prisma.pullRequest.findUnique({
      where: { id },
      include: {
        ...prInclude,
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findAll(projectId?: string): Promise<PullRequestWithRelations[]> {
    return prisma.pullRequest.findMany({
      where: projectId ? { projectId } : undefined,
      include: prInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: PRStatus): Promise<PullRequestWithRelations> {
    return prisma.pullRequest.update({
      where: { id },
      data: {
        status,
        mergedAt: status === PRStatus.MERGED ? new Date() : undefined,
      },
      include: prInclude,
    });
  }

  async updateNITStatus(
    id: string,
    nitStatus: NITStatus,
    nitNotes?: string
  ): Promise<PullRequestWithRelations> {
    return prisma.pullRequest.update({
      where: { id },
      data: {
        nitStatus,
        nitNotes,
      },
      include: prInclude,
    });
  }

  async addComment(data: AddCommentData): Promise<ReviewComment> {
    return prisma.reviewComment.create({
      data,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async updateReviewer(id: string, reviewerId: string): Promise<PullRequestWithRelations> {
    return prisma.pullRequest.update({
      where: { id },
      data: { reviewerId },
      include: prInclude,
    });
  }
}
