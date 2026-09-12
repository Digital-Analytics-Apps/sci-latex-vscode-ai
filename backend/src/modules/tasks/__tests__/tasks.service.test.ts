import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tasksService } from '../tasks.service';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    task: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    workspace: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../git/git.service', () => ({
  GitService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../k8s/k8s-pod-manager.service', () => ({
  K8sPodManagerService: vi.fn().mockImplementation(() => ({
    claimPodForProject: vi.fn().mockResolvedValue({
      podName: 'workspace-p1-user1-12345',
      pvcName: 'pvc-project-p1',
      status: 'created_on_demand',
      codeServerUrl: 'http://localhost:30080',
    }),
  })),
}));

describe('TasksService (Unit Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new Task and generate a clean branch name', async () => {
    const mockTask = {
      id: 'task-uuid-123',
      projectId: 'proj-1',
      assignedToId: 'user-1',
      title: 'Escrever a Introdução',
      branchName: 'pending',
      status: 'NOT_STARTED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.task.create as any).mockResolvedValue(mockTask);
    (prisma.task.update as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ ...mockTask, ...data })
    );

    const result = await tasksService.createTask({
      projectId: 'proj-1',
      assignedToId: 'user-1',
      title: 'Escrever a Introdução',
    });

    expect(prisma.task.create).toHaveBeenCalled();
    expect(result.branchName).toBe('task/escrever-a-introducao-task-u');
  });

  it('should list tasks for a project', async () => {
    const mockTasks = [
      { id: 'task-1', title: 'Task 1', projectId: 'proj-1' },
      { id: 'task-2', title: 'Task 2', projectId: 'proj-1' },
    ];

    (prisma.task.findMany as any).mockResolvedValue(mockTasks);

    const result = await tasksService.getTasksByProject('proj-1');

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(mockTasks);
  });
});
