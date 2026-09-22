import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../db/prisma';
import { PrismaWorkspacesRepository } from '../workspaces.repository';

vi.mock('../../db/prisma', () => ({
  prisma: {
    workspace: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('PrismaWorkspacesRepository', () => {
  let repository: PrismaWorkspacesRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaWorkspacesRepository();
  });

  it('should upsert a workspace session record with projectId, userId, and taskId', async () => {
    const mockWorkspace = {
      id: 'ws-1',
      projectId: 'proj-1',
      userId: 'user-1',
      taskId: 'task-1',
      podName: 'workspace-pod-1',
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.workspace.upsert).mockResolvedValue(mockWorkspace as any);

    const result = await repository.upsertWorkspace({
      projectId: 'proj-1',
      userId: 'user-1',
      taskId: 'task-1',
      podName: 'workspace-pod-1',
      status: 'READY',
    });

    expect(prisma.workspace.upsert).toHaveBeenCalledWith({
      where: {
        projectId_userId_taskId: { projectId: 'proj-1', userId: 'user-1', taskId: 'task-1' },
      },
      create: {
        projectId: 'proj-1',
        userId: 'user-1',
        taskId: 'task-1',
        podName: 'workspace-pod-1',
        status: 'READY',
      },
      update: {
        podName: 'workspace-pod-1',
        status: 'READY',
        updatedAt: expect.any(Date),
      },
    });

    expect(result).toEqual(mockWorkspace);
  });

  it('should delete workspace sessions by projectId', async () => {
    vi.mocked(prisma.workspace.deleteMany).mockResolvedValue({ count: 1 });

    await repository.deleteByProjectId('proj-1');

    expect(prisma.workspace.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
    });
  });

  it('should find workspace by projectId, userId and taskId', async () => {
    const mockWorkspace = {
      id: 'ws-1',
      projectId: 'proj-1',
      userId: 'user-1',
      taskId: 'task-1',
      podName: 'pod-1',
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);

    const result = await repository.findByProjectIdUserIdAndTaskId('proj-1', 'user-1', 'task-1');

    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: {
        projectId_userId_taskId: { projectId: 'proj-1', userId: 'user-1', taskId: 'task-1' },
      },
    });

    expect(result).toEqual(mockWorkspace);
  });

  it('should update workspace status by projectId', async () => {
    vi.mocked(prisma.workspace.updateMany).mockResolvedValue({ count: 1 });

    await repository.updateStatusByProjectId('proj-1', 'TERMINATED');

    expect(prisma.workspace.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
      data: {
        status: 'TERMINATED',
        podName: null,
        updatedAt: expect.any(Date),
      },
    });
  });
});
