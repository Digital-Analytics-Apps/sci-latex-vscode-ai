import { describe, it, expect, beforeEach } from 'vitest';
import { PRStatus, NITStatus } from '@prisma/client';
import { PullRequestsService } from '../pull-requests.service';
import { PrismaPullRequestsRepository } from '../../../repositories/pull-requests.repository';

describe('PullRequestsService', () => {
  let prService: PullRequestsService;
  let mockPrRepository: any;

  beforeEach(() => {
    mockPrRepository = {
      create: async (data: any) => ({
        id: 'pr-123',
        ...data,
        status: PRStatus.UNDER_REVIEW,
        nitStatus: NITStatus.WAITING_NIT,
        section: { branchName: 'feature/intro' },
      }),
      findById: async (id: string) => {
        if (id === 'pr-123') {
          return {
            id: 'pr-123',
            projectId: 'proj-1',
            authorId: 'author-1',
            status: PRStatus.UNDER_REVIEW,
            nitStatus: NITStatus.WAITING_NIT,
            section: { branchName: 'feature/intro' },
          };
        }
        if (id === 'pr-approved') {
          return {
            id: 'pr-approved',
            projectId: 'proj-1',
            authorId: 'author-1',
            status: PRStatus.APPROVED,
            nitStatus: NITStatus.APPROVED_NIT,
            section: { branchName: 'feature/intro' },
          };
        }
        if (id === 'pr-pending-nit') {
          return {
            id: 'pr-pending-nit',
            projectId: 'proj-1',
            authorId: 'author-1',
            status: PRStatus.APPROVED,
            nitStatus: NITStatus.WAITING_NIT,
            section: { branchName: 'feature/intro' },
          };
        }
        return null;
      },
      updateStatus: async (id: string, status: PRStatus) => ({
        id,
        status,
        mergedAt: status === PRStatus.MERGED ? new Date() : undefined,
      }),
      updateNITStatus: async (id: string, nitStatus: NITStatus) => ({
        id,
        nitStatus,
      }),
      addComment: async (data: any) => ({ id: 'comm-1', ...data }),
    };

    prService = new PullRequestsService(mockPrRepository as any);
  });

  it('should block merge if PR is not approved by reviewer', async () => {
    await expect(prService.mergePR('pr-123', 'user-1')).rejects.toThrow(
      'PR_NOT_APPROVED_BY_REVIEWER'
    );
  });

  it('should block merge if NIT is not approved', async () => {
    await expect(prService.mergePR('pr-pending-nit', 'user-1')).rejects.toThrow(
      'NIT_NOT_APPROVED'
    );
  });

  it('should allow merge when both Reviewer and NIT are approved', async () => {
    const mergedPR = await prService.mergePR('pr-approved', 'user-1');
    expect(mergedPR.status).toBe(PRStatus.MERGED);
    expect(mergedPR.mergedAt).toBeDefined();
  });
});
