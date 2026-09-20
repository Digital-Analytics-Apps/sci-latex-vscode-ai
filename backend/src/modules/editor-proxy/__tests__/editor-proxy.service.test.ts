import { describe, expect, it, vi } from 'vitest';
import { EditorProxyService } from '../editor-proxy.service';

describe('EditorProxyService', () => {
  it('deve lançar erro PROJECT_NOT_FOUND quando o projeto não for localizado no banco', async () => {
    const mockProjectsRepo: any = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const mockTasksRepo: any = { findById: vi.fn() };
    const mockWorkspacesRepo: any = { upsertWorkspace: vi.fn() };
    const mockK8sPodManager: any = { claimPodForProject: vi.fn() };

    const service = new EditorProxyService(
      mockProjectsRepo,
      mockTasksRepo,
      mockWorkspacesRepo,
      mockK8sPodManager
    );

    await expect(
      service.prepareWorkspaceSession({
        projectId: 'invalido',
        userId: 'u1',
      })
    ).rejects.toThrow('PROJECT_NOT_FOUND');
  });

  it('deve resolver a branch da task e preparar a sessão da workspace com sucesso', async () => {
    const mockProject = {
      id: 'p1',
      name: 'Artigo TeX Teste',
      gitRepoPath: 'sci-paper-test',
    };
    const mockTask = {
      id: 't1',
      title: 'Seção Introdução',
      branchName: 'task/secao-introducao-123456',
    };

    const mockProjectsRepo: any = {
      findById: vi.fn().mockResolvedValue(mockProject),
    };
    const mockTasksRepo: any = {
      findById: vi.fn().mockResolvedValue(mockTask),
    };
    const mockWorkspacesRepo: any = {
      upsertWorkspace: vi.fn().mockResolvedValue({ id: 'w1', status: 'PROVISIONING' }),
    };
    const mockK8sPodManager: any = {
      claimPodForProject: vi.fn().mockResolvedValue({
        podName: 'workspace-p1-u1',
        codeServerUrl: 'http://localhost:30080',
      }),
    };

    const service = new EditorProxyService(
      mockProjectsRepo,
      mockTasksRepo,
      mockWorkspacesRepo,
      mockK8sPodManager
    );

    // Mock das chamadas internas de E/S, Git e HTTP para evitar operações reais no filesystem e timeout
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    vi.spyOn(service, 'ensureGitRepositoryWorkspace').mockImplementation(async () => {});
    vi.spyOn(service, 'ensureTeXTemplateFiles').mockImplementation(async () => {});

    const result = await service.prepareWorkspaceSession({
      projectId: 'p1',
      userId: 'u1',
      taskId: 't1',
      token: 'jwt-token-123',
    });

    expect(result.project).toBe(mockProject);
    expect(result.targetBranch).toBe('task/secao-introducao-123456');
    expect(mockK8sPodManager.claimPodForProject).toHaveBeenCalledWith('p1', 'u1');
    expect(mockWorkspacesRepo.upsertWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p1',
        userId: 'u1',
        taskId: 't1',
        podName: 'workspace-p1-u1',
      })
    );
  });
});
