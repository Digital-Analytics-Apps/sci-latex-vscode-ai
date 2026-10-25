import { Task, TaskStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksService } from '../tasks.service';
import { ITasksRepository } from '../../../repositories/tasks.repository';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    workspace: {
      upsert: vi.fn(),
    },
    githubIntegration: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    project: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    githubIssueProjection: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    },
  },
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

  it('should create a new Task', async () => {
    const mockTask = {
      id: 'task-uuid-123',
      projectId: 'proj-1',
      assignedToId: 'user-1',
      title: 'Escrever a Introdução',
      status: 'NOT_STARTED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockTasksRepository.create).mockImplementation((data) =>
      Promise.resolve({ ...mockTask, ...data } as unknown as any)
    );

    const result = await service.createTask({
      projectId: 'proj-1',
      assignedToId: 'user-1',
      title: 'Escrever a Introdução',
      stageId: 'stage-1',
    });

    expect(mockTasksRepository.create).toHaveBeenCalled();
    expect(result.title).toBe('Escrever a Introdução');
    expect(result.status).toBe('NOT_STARTED');
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
    expect(result).toEqual([
      {
        id: 'task-1',
        title: 'Task 1',
        projectId: 'proj-1',
        isBlockedByPrevious: false,
      },
      {
        id: 'task-2',
        title: 'Task 2',
        projectId: 'proj-1',
        isBlockedByPrevious: false,
      },
    ]);
  });

  it('should request review for a task (author -> REVIEW_REQUESTED)', async () => {
    const existingTask = {
      id: 'task-1',
      projectId: 'proj-1',
      title: 'Intro',
      assignedToId: null,
      stageId: null,
      status: TaskStatus.IN_PROGRESS,
      startDate: null,
      startedAt: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Task;
    vi.mocked(mockTasksRepository.findById).mockResolvedValue(existingTask);
    vi.mocked(mockTasksRepository.update).mockImplementation((_id, data) =>
      Promise.resolve({ ...existingTask, ...data })
    );

    const result = await service.requestTaskReview('proj-1', 'task-1', 'user-1', 'Seção concluída');
    expect(mockTasksRepository.update).toHaveBeenCalledWith('task-1', {
      status: TaskStatus.REVIEW_REQUESTED,
    });
    expect(result.status).toBe(TaskStatus.REVIEW_REQUESTED);
  });

  it('should start task review (reviewer -> IN_REVIEW)', async () => {
    const existingTask = {
      id: 'task-1',
      projectId: 'proj-1',
      title: 'Intro',
      assignedToId: null,
      stageId: null,
      status: TaskStatus.REVIEW_REQUESTED,
      startDate: null,
      startedAt: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Task;
    vi.mocked(mockTasksRepository.findById).mockResolvedValue(existingTask);
    vi.mocked(mockTasksRepository.update).mockImplementation((_id, data) =>
      Promise.resolve({ ...existingTask, ...data })
    );

    const result = await service.startTaskReview('proj-1', 'task-1', 'rev-1');
    expect(mockTasksRepository.update).toHaveBeenCalledWith('task-1', {
      status: TaskStatus.IN_REVIEW,
    });
    expect(result.status).toBe(TaskStatus.IN_REVIEW);
  });

  it('should approve task decision (decision APPROVED -> COMPLETED)', async () => {
    const existingTask = {
      id: 'task-1',
      projectId: 'proj-1',
      title: 'Intro',
      assignedToId: null,
      stageId: null,
      status: TaskStatus.IN_REVIEW,
      startDate: null,
      startedAt: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Task;
    vi.mocked(mockTasksRepository.findById).mockResolvedValue(existingTask);
    vi.mocked(mockTasksRepository.update).mockImplementation((_id, data) =>
      Promise.resolve({ ...existingTask, ...data })
    );

    const result = await service.reviewTaskDecision('proj-1', 'task-1', 'rev-1', 'APPROVED', 'Excelente');
    expect(mockTasksRepository.update).toHaveBeenCalledWith('task-1', {
      status: TaskStatus.COMPLETED,
    });
    expect(result.status).toBe(TaskStatus.COMPLETED);
  });

  it('should request changes task decision (decision CHANGES_REQUESTED -> CHANGES_REQUESTED)', async () => {
    const existingTask = {
      id: 'task-1',
      projectId: 'proj-1',
      title: 'Intro',
      assignedToId: null,
      stageId: null,
      status: TaskStatus.IN_REVIEW,
      startDate: null,
      startedAt: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Task;
    vi.mocked(mockTasksRepository.findById).mockResolvedValue(existingTask);
    vi.mocked(mockTasksRepository.update).mockImplementation((_id, data) =>
      Promise.resolve({ ...existingTask, ...data })
    );

    const result = await service.reviewTaskDecision('proj-1', 'task-1', 'rev-1', 'CHANGES_REQUESTED', 'Faltam referências');
    expect(mockTasksRepository.update).toHaveBeenCalledWith('task-1', {
      status: TaskStatus.CHANGES_REQUESTED,
    });
    expect(result.status).toBe(TaskStatus.CHANGES_REQUESTED);
  });
});
