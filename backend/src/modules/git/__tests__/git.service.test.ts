import { describe, it, expect, afterAll } from 'vitest';
import { GitService } from '../git.service';
import fs from 'fs/promises';

describe('GitService', () => {
  const gitService = new GitService();
  const testProjectId = `test-project-${Date.now()}`;

  afterAll(async () => {
    // Limpa o repositório de teste
    try {
      const repoPath = gitService.getRepoPath(testProjectId);
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch {}
  });

  it('should initialize a bare repository with initial main.tex template', async () => {
    const repoPath = await gitService.initBareRepository(testProjectId, 'Artigo Científico de Teste');
    expect(repoPath).toContain(testProjectId);

    const stat = await fs.stat(repoPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('should throw error if repository already exists', async () => {
    await expect(
      gitService.initBareRepository(testProjectId, 'Artigo Científico de Teste')
    ).rejects.toThrow('REPOSITORY_ALREADY_EXISTS');
  });
});
