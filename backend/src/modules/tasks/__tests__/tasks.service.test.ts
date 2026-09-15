import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksService } from '../tasks.service';
import { ITasksRepository } from '../../../repositories/tasks.repository';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    workspace: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../git/git.service', () => ({
  GitService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../../infra/k8s/k8s-pod-manager.service', () => ({
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
  let mockTasksRepository: ITasksRepository;
  let service: TasksService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTasksRepository = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn(),
    };
    service = new TasksService(mockTasksRepository);
  });

  it('should create a new Task and generate a clean branch name', async () => {
    const mockTask: any = {
      id: 'task-uuid-123',
      projectId: 'proj-1',
      assignedToId: 'user-1',
      title: 'Escrever a Introdução',
      branchName: 'pending',
      status: 'NOT_STARTED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (mockTasksRepository.create as any).mockResolvedValue(mockTask);
    (mockTasksRepository.update as any).mockImplementation((_id: string, data: any) =>
      Promise.resolve({ ...mockTask, ...data })
    );

    const result = await service.createTask({
      projectId: 'proj-1',
      assignedToId: 'user-1',
      title: 'Escrever a Introdução',
    });

    expect(mockTasksRepository.create).toHaveBeenCalled();
    expect(result.branchName).toBe('task/escrever-a-introducao-task-u');
  });

  it('should list tasks for a project', async () => {
    const mockTasks: any = [
      { id: 'task-1', title: 'Task 1', projectId: 'proj-1' },
      { id: 'task-2', title: 'Task 2', projectId: 'proj-1' },
    ];

    (mockTasksRepository.findMany as any).mockResolvedValue(mockTasks);

    const result = await service.getTasksByProject('proj-1');

    expect(mockTasksRepository.findMany).toHaveBeenCalledWith({
      projectId: 'proj-1',
      assignedToId: undefined,
    });
    expect(result).toEqual(mockTasks);
  });
});
