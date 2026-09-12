import { beforeEach, describe, expect, it, vi } from 'vitest';
import { releasesService } from '../releases.service';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    releaseCandidate: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    release: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
  },
}));

describe('ReleasesService (Unit Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new Release Candidate with generated RC tag', async () => {
    const mockRC = {
      id: 'rc-123',
      projectId: 'proj-1',
      versionTag: 'RC-1',
      commitSha: 'sha-abcdef',
      status: 'SUBMITTED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.releaseCandidate.count as any).mockResolvedValue(0);
    (prisma.releaseCandidate.create as any).mockResolvedValue(mockRC);

    const result = await releasesService.createReleaseCandidate({
      projectId: 'proj-1',
      versionTag: '',
    });

    expect(prisma.releaseCandidate.create).toHaveBeenCalled();
    expect(result.versionTag).toBe('RC-1');
  });

  it('should create an official Release on main branch and update project publishedAt', async () => {
    const mockRelease = {
      id: 'release-123',
      projectId: 'proj-1',
      versionTag: 'v1.0',
      commitSha: 'main-sha-123',
      title: 'Submissão Congresso IEEE',
      conference: 'IEEE ICSE 2026',
      createdAt: new Date(),
    };

    (prisma.release.create as any).mockResolvedValue(mockRelease);
    (prisma.project.update as any).mockResolvedValue({ id: 'proj-1' });

    const result = await releasesService.createRelease({
      projectId: 'proj-1',
      versionTag: 'v1.0',
      title: 'Submissão Congresso IEEE',
      conference: 'IEEE ICSE 2026',
    });

    expect(prisma.release.create).toHaveBeenCalled();
    expect(prisma.project.update).toHaveBeenCalled();
    expect(result.versionTag).toBe('v1.0');
  });
});
