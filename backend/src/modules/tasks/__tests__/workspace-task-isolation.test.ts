import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../config/env';
import { TasksService } from '../tasks.service';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn().mockResolvedValue({ id: 'proj-1', gitRepoPath: 'sci-paper-test' }),
    },
    workspace: {
      upsert: vi.fn().mockResolvedValue({ id: 'ws-1', status: 'READY' }),
      findUnique: vi.fn(),
    },
    githubIntegration: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    githubIssueProjection: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

describe('Workspace Task Isolation (User + Article + Task)', () => {
  const testProjectId = `proj-iso-${Date.now()}`;
  const testUserId = `user-iso-${Date.now()}`;

  const mockTasksRepo: any = {
    findById: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn().mockImplementation(async (id, data) => ({ id, ...data })),
  };

  const mockK8sPodManager: any = {
    claimPodForTask: vi.fn().mockImplementation(async (projectId, userId, taskId) => ({
      podName: `workspace-${projectId.slice(0, 6)}-${userId.slice(0, 6)}-${taskId.slice(0, 6)}`,
      pvcName: `pvc-${projectId.slice(0, 8)}`,
      status: 'created_on_demand',
      codeServerUrl: 'http://localhost:30080',
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    const projectDir = path.resolve(env.STORAGE_PATH, 'projects', testProjectId);
    await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('Invariante 3 & 8: Deve criar diretórios físicos completamente isolados para Task A e Task B', async () => {
    const service = new TasksService(mockTasksRepo, mockK8sPodManager);

    const taskA = {
      id: 'task-a-111',
      projectId: testProjectId,
      title: 'Task A - Introdução',
      branchName: 'task/111-introducao',
      status: 'NOT_STARTED',
    };
    const taskB = {
      id: 'task-b-222',
      projectId: testProjectId,
      title: 'Task B - Metodologia',
      branchName: 'task/222-metodologia',
      status: 'NOT_STARTED',
    };

    mockTasksRepo.findById.mockImplementation(async (id: string) => {
      if (id === taskA.id) return taskA;
      if (id === taskB.id) return taskB;
      return null;
    });

    // 1. Iniciar Task A
    await service.startTaskWorkspace(testProjectId, taskA.id, testUserId);

    // 2. Iniciar Task B
    await service.startTaskWorkspace(testProjectId, taskB.id, testUserId);

    // 3. Verificar se os diretórios físicos são disjuntos
    const pathA = path.resolve(
      env.STORAGE_PATH,
      'projects',
      testProjectId,
      'users',
      testUserId,
      'tasks',
      taskA.id
    );
    const pathB = path.resolve(
      env.STORAGE_PATH,
      'projects',
      testProjectId,
      'users',
      testUserId,
      'tasks',
      taskB.id
    );

    expect(pathA).not.toBe(pathB);
    expect(pathA).toContain(`tasks/${taskA.id}`);
    expect(pathB).toContain(`tasks/${taskB.id}`);

    // Simular escrita na Task A
    const mainTexA = path.join(pathA, 'main.tex');
    await fs.mkdir(pathA, { recursive: true });
    await fs.writeFile(mainTexA, '\\section{Conteudo Exclusivo da Task A}', 'utf-8');

    // Simular escrita na Task B
    const mainTexB = path.join(pathB, 'main.tex');
    await fs.mkdir(pathB, { recursive: true });
    await fs.writeFile(mainTexB, '\\section{Conteudo Exclusivo da Task B}', 'utf-8');

    // Asserts de Isolamento Físico Absoluto (Bug Original corrigido)
    const contentA = await fs.readFile(mainTexA, 'utf-8');
    const contentB = await fs.readFile(mainTexB, 'utf-8');

    expect(contentA).toContain('Task A');
    expect(contentA).not.toContain('Task B');

    expect(contentB).toContain('Task B');
    expect(contentB).not.toContain('Task A');
  });

  it('Invariante 6: Reabrir tarefa existente (A -> B -> A) não reseta nem sobrescreve as edições da Task A', async () => {
    const service = new TasksService(mockTasksRepo, mockK8sPodManager);

    const taskA = {
      id: 'task-a-333',
      projectId: testProjectId,
      title: 'Task A - Referencial',
      branchName: 'task/333-referencial',
      status: 'IN_PROGRESS',
    };

    mockTasksRepo.findById.mockResolvedValue(taskA);

    const pathA = path.resolve(
      env.STORAGE_PATH,
      'projects',
      testProjectId,
      'users',
      testUserId,
      'tasks',
      taskA.id
    );
    await fs.mkdir(pathA, { recursive: true });
    const mainTexA = path.join(pathA, 'main.tex');
    await fs.writeFile(mainTexA, '\\section{Versao 1 da Task A}', 'utf-8');

    // Reabrir Task A
    await service.startTaskWorkspace(testProjectId, taskA.id, testUserId);

    // O conteúdo anterior deve ser preservado intacto
    const contentAfterReopen = await fs.readFile(mainTexA, 'utf-8');
    expect(contentAfterReopen).toBe('\\section{Versao 1 da Task A}');
  });

  it('Invariante de Idempotência: Chamadas simultâneas para a mesma tarefa não geram duplicação', async () => {
    const service = new TasksService(mockTasksRepo, mockK8sPodManager);

    const taskConcurrent = {
      id: 'task-conc-444',
      projectId: testProjectId,
      title: 'Task Concorrente',
      branchName: 'task/444-concorrente',
      status: 'NOT_STARTED',
    };

    mockTasksRepo.findById.mockResolvedValue(taskConcurrent);

    // Executa duas chamadas concorrentes do startTaskWorkspace
    await Promise.all([
      service.startTaskWorkspace(testProjectId, taskConcurrent.id, testUserId),
      service.startTaskWorkspace(testProjectId, taskConcurrent.id, testUserId),
    ]);

    expect(mockK8sPodManager.claimPodForTask).toHaveBeenCalledTimes(2);
    expect(mockK8sPodManager.claimPodForTask).toHaveBeenLastCalledWith(
      testProjectId,
      testUserId,
      taskConcurrent.id
    );
  });
});
