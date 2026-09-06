import { PullRequest, PRStatus, NITStatus, ReviewComment, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

export type PullRequestWithRelations = Prisma.PullRequestGetPayload<{
  include: {
    author: { select: { id: true; name: true; email: true; role: true } };
    reviewer: { select: { id: true; name: true; email: true; role: true } };
    section: true;
    project?: true;
  };
}>;

export interface CreatePRData {
  title: string;
  description?: string;
  sectionId: string;
  projectId: string;
  authorId: string;
  reviewerId?: string;
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
        sectionId: data.sectionId,
        projectId: data.projectId,
        authorId: data.authorId,
        reviewerId: data.reviewerId,
        nitStatus: data.nitStatus || NITStatus.WAITING_NIT,
        status: PRStatus.UNDER_REVIEW,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
        section: true,
        project: true,
      },
    });
  }

  async findById(id: string): Promise<PullRequestWithRelations | null> {
    return prisma.pullRequest.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
        section: true,
        project: true,
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
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
        section: true,
      },
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
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
        section: true,
      },
    });
  }

  async updateNITStatus(id: string, nitStatus: NITStatus, nitNotes?: string): Promise<PullRequestWithRelations> {
    return prisma.pullRequest.update({
      where: { id },
      data: {
        nitStatus,
        nitNotes,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
        section: true,
      },
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
}
