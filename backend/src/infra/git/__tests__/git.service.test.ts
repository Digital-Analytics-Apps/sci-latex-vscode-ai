import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { generateRepoName, GitService } from '../git.service';
import { env } from '../../../config/env';

describe('GitService', () => {
  let gitService: GitService;
  const testProjectId = 'test-proj-' + Date.now();
  const storageGitDir = path.resolve(env.STORAGE_PATH, 'git');

  beforeEach(() => {
    gitService = new GitService();
  });

  afterEach(async () => {
    // Limpa repositórios de teste
    try {
      const repoPath = path.join(storageGitDir, `${testProjectId}.git`);
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error if directory does not exist
    }
  });

  it('should generate clean human-readable repo name with title slug and short UUID suffix', () => {
    const uuid = '5550a24e-0c16-480e-a5e3-043d7a9d5b2e';
    const title = 'Otimização de Compiladores TeX Isolados!';
    const name = generateRepoName(uuid, title);

    expect(name).toContain('otimizacao-de-compiladores-tex-isolados-5550a24e');
  });

  it('should initialize a test git repository during test environment', async () => {
    const repoPath = await gitService.initRepository(testProjectId, 'Quantum Computing Paper');

    expect(repoPath).toContain(`${testProjectId}.git`);
    const stats = await fs.stat(repoPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('should commit a file successfully into the repository', async () => {
    await gitService.initRepository(testProjectId, 'AI Paper');

    const commitHash = await gitService.commitFile({
      projectId: testProjectId,
      branchName: 'main',
      filePath: 'sections/introduction.tex',
      content: '\\section{Introduction}\nThis is a test introduction.',
      commitMessage: 'feat: add introduction section',
      authorName: 'Dr. Alan Turing',
      authorEmail: 'turing@example.com',
    });

    expect(commitHash).toBeDefined();
    expect(commitHash.length).toBe(40); // 40-character SHA-1 hash
  });

  it('should throw CANNOT_DELETE_PROTECTED_BRANCH when trying to delete main or dev branch', async () => {
    await expect(
      gitService.deleteBranch({ projectId: testProjectId, branchName: 'main' })
    ).rejects.toThrow('CANNOT_DELETE_PROTECTED_BRANCH');

    await expect(
      gitService.deleteBranch({ projectId: testProjectId, branchName: 'dev' })
    ).rejects.toThrow('CANNOT_DELETE_PROTECTED_BRANCH');
  });

  it('should throw GITHUB_TOKEN_REQUIRED error in development mode when token is missing', async () => {
    const originalNodeEnv = env.NODE_ENV;
    const originalToken = env.GITHUB_TOKEN;

    try {
      (env as any).NODE_ENV = 'development';
      (env as any).GITHUB_TOKEN = undefined;

      await expect(gitService.initRepository('no-token-proj', 'No Token Paper')).rejects.toThrow(
        'GITHUB_TOKEN_REQUIRED'
      );
    } finally {
      (env as any).NODE_ENV = originalNodeEnv;
      (env as any).GITHUB_TOKEN = originalToken;
    }
  });
});
