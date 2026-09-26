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
  reviewRoundId?: string;
  userId: string;
  lineNumer?: number;
  comment: string;
}

export interface UpdateNITData {
  nitStatus: NITStatus;
  nitNotes?: string;
  sentToNitAt?: Date | null;
  sentToNitNotes?: string | null;
  nitApprovedAt?: Date | null;
}

export interface ListPRFilters {
  projectId?: string;
  status?: PRStatus | 'ALL' | string;
  nitStatus?: NITStatus | 'ALL' | string;
  search?: string;
  page?: number;
  limit?: number;
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

  async findAll(
    filters?: ListPRFilters
  ): Promise<{ pullRequests: PullRequestWithRelations[]; total: number }> {
    const where: Prisma.PullRequestWhereInput = {};

    if (filters?.projectId && filters.projectId !== 'all') {
      where.projectId = filters.projectId;
    }

    if (filters?.status && (filters.status as string) !== 'ALL') {
      where.status = filters.status as PRStatus;
    }

    if (filters?.nitStatus && (filters.nitStatus as string) !== 'ALL') {
      where.nitStatus = filters.nitStatus as NITStatus;
    }

    if (filters?.search && filters.search.trim() !== '') {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { author: { email: { contains: term, mode: 'insensitive' } } },
        { author: { name: { contains: term, mode: 'insensitive' } } },
        { project: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 50;
    const skip = (page - 1) * limit;

    const [pullRequests, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where,
        include: prInclude,
        orderBy: { createdAt: 'desc' },
        skip: filters?.limit ? skip : undefined,
        take: filters?.limit ? limit : undefined,
      }),
      prisma.pullRequest.count({ where }),
    ]);

    return { pullRequests: pullRequests as unknown as PullRequestWithRelations[], total };
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

  async updateNITStatus(id: string, data: UpdateNITData): Promise<PullRequestWithRelations> {
    return prisma.pullRequest.update({
      where: { id },
      data: {
        nitStatus: data.nitStatus,
        nitNotes: data.nitNotes,
        sentToNitAt: data.sentToNitAt !== undefined ? data.sentToNitAt : undefined,
        sentToNitNotes: data.sentToNitNotes !== undefined ? data.sentToNitNotes : undefined,
        nitApprovedAt:
          data.nitApprovedAt !== undefined
            ? data.nitApprovedAt
            : data.nitStatus === NITStatus.APPROVED_NIT
              ? new Date()
              : undefined,
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
