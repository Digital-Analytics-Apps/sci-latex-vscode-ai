import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { GitService } from '../git.service';
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
    } catch (_) {}
  });

  it('should initialize a local git repository in fallback mode during test environment', async () => {
    const repoPath = await gitService.initBareRepository(testProjectId, 'Quantum Computing Paper');

    expect(repoPath).toContain(`${testProjectId}.git`);
    const stats = await fs.stat(repoPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('should commit a file successfully into the repository', async () => {
    await gitService.initBareRepository(testProjectId, 'AI Paper');

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
});
