import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '../../config/env';

const execAsync = promisify(exec);

export class GitService {
  private baseStoragePath: string;

  constructor() {
    this.baseStoragePath = path.resolve(env.STORAGE_PATH, 'git');
  }

  // Garante que o diretório base de repositórios temporários exista
  private async ensureStorageDir() {
    await fs.mkdir(this.baseStoragePath, { recursive: true });
  }

  // Obtém o caminho ou URL do repositório
  getRepoPath(projectId: string): string {
    if (env.GITHUB_TOKEN && env.NODE_ENV !== 'test') {
      const repoName = `${env.GITHUB_REPO_PREFIX}${projectId}`;
      const owner = env.GITHUB_ORG || 'user';
      return `https://github.com/${owner}/${repoName}.git`;
    }
    return path.join(this.baseStoragePath, `${projectId}.git`);
  }

  // Inicializa um novo repositório (no GitHub via API ou Bare local como fallback)
  async initBareRepository(projectId: string, projectTitle: string): Promise<string> {
    await this.ensureStorageDir();

    const isGitHubMode = Boolean(env.GITHUB_TOKEN && env.NODE_ENV !== 'test');
    let remoteUrl: string;
    let repoName = `${env.GITHUB_REPO_PREFIX}${projectId}`;

    if (isGitHubMode) {
      // 1. Criar repositório remoto no GitHub via REST API
      const apiUrl = env.GITHUB_ORG
        ? `https://api.github.com/orgs/${env.GITHUB_ORG}/repos`
        : `https://api.github.com/user/repos`;

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'SCI-LaTeX-Backend',
          },
          body: JSON.stringify({
            name: repoName,
            private: true,
            description: `Paper: ${projectTitle}`,
            auto_init: false,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as any;
          throw new Error(`GITHUB_API_ERROR: ${errorData.message || response.statusText}`);
        }

        const repoData = (await response.json()) as any;
        const owner = repoData.owner?.login || env.GITHUB_ORG || 'user';
        remoteUrl = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${owner}/${repoName}.git`;
      } catch (error: any) {
        console.error('❌ Error creating GitHub repository:', error.message);
        throw error;
      }
    } else {
      // Fallback Local (Servidor Bare para desenvolvimento offline e testes)
      const bareRepoPath = path.join(this.baseStoragePath, `${projectId}.git`);
      try {
        await fs.stat(bareRepoPath);
        throw new Error('REPOSITORY_ALREADY_EXISTS');
      } catch (err: any) {
        if (err.message === 'REPOSITORY_ALREADY_EXISTS') throw err;
      }
      await fs.mkdir(bareRepoPath, { recursive: true });
      await execAsync(`git init --bare --initial-branch=main`, { cwd: bareRepoPath });
      remoteUrl = bareRepoPath;
    }

    // 2. Criar repositório temporário para efetuar o commit inicial do main.tex
    const tempDir = path.join(this.baseStoragePath, `temp-${projectId}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      await execAsync(`git init --initial-branch=main`, { cwd: tempDir });

      const templateContent = `% SCI-LaTeX Paper Template
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}

\\title{${projectTitle.replace(/[\{\}\\]/g, '')}}
\\author{SCI-LaTeX Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introdução}
Bem-vindo ao seu novo artigo científico! Escreva a introdução aqui.

\\section{Metodologia}
Descreva os métodos e experimentos realizados.

\\section{Resultados e Discussão}
Apresente os resultados obtidos.

\\section{Conclusão}
Resuma os achados do trabalho.

\\end{document}
`;

      await fs.writeFile(path.join(tempDir, 'main.tex'), templateContent, 'utf-8');

      // Configura autor do commit inicial
      await execAsync(`git config user.name "SCI-LaTeX System"`, { cwd: tempDir });
      await execAsync(`git config user.email "system@sci-latex.org"`, { cwd: tempDir });

      await execAsync(`git add main.tex`, { cwd: tempDir });
      await execAsync(`git commit -m "Initial commit: LaTeX paper template main.tex"`, { cwd: tempDir });

      // Push para o repositório remoto (GitHub ou Bare local)
      await execAsync(`git remote add origin "${remoteUrl}"`, { cwd: tempDir });
      await execAsync(`git push origin main`, { cwd: tempDir });
    } finally {
      // Limpa o diretório temporário
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    return isGitHubMode
      ? `https://github.com/${env.GITHUB_ORG || 'user'}/${repoName}`
      : path.join(this.baseStoragePath, `${projectId}.git`);
  }

  // Realiza o commit silencioso de uma alteração em um arquivo do projeto
  async commitFile(data: {
    projectId: string;
    branchName: string;
    filePath: string;
    content: string;
    commitMessage: string;
    authorName: string;
    authorEmail: string;
    repoUrl?: string;
  }): Promise<string> {
    await this.ensureStorageDir();
    const isGitHubMode = Boolean(env.GITHUB_TOKEN && env.NODE_ENV !== 'test');
    
    let repoLocation = data.repoUrl || this.getRepoPath(data.projectId);
    if (isGitHubMode && !repoLocation.includes('x-access-token')) {
      const repoName = `${env.GITHUB_REPO_PREFIX}${data.projectId}`;
      const owner = env.GITHUB_ORG || 'user';
      repoLocation = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${owner}/${repoName}.git`;
    }

    const tempDir = path.join(this.baseStoragePath, `temp-commit-${data.projectId}-${Date.now()}`);

    try {
      // Clona a branch do repositório
      await execAsync(`git clone --branch ${data.branchName} "${repoLocation}" "${tempDir}"`, {
        cwd: this.baseStoragePath,
      });

      const fullFilePath = path.join(tempDir, data.filePath);
      await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
      await fs.writeFile(fullFilePath, data.content, 'utf-8');

      await execAsync(`git config user.name "${data.authorName.replace(/"/g, '')}"`, { cwd: tempDir });
      await execAsync(`git config user.email "${data.authorEmail.replace(/"/g, '')}"`, { cwd: tempDir });

      await execAsync(`git add "${data.filePath}"`, { cwd: tempDir });
      await execAsync(`git commit -m "${data.commitMessage.replace(/"/g, '')}"`, { cwd: tempDir });
      await execAsync(`git push origin ${data.branchName}`, { cwd: tempDir });

      // Retorna o hash do commit gerado
      const { stdout } = await execAsync(`git rev-parse HEAD`, { cwd: tempDir });
      return stdout.trim();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
