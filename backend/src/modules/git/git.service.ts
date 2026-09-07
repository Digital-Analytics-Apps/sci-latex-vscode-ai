import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { env } from '../../config/env';

const execAsync = promisify(exec);

// Helper para gerar um nome de repositório amigável no GitHub com Slug do título + Sufixo Hash de 8 caracteres do UUID
export function generateRepoName(projectId: string, projectTitle?: string): string {
  const shortId = projectId.length > 8 ? projectId.slice(0, 8) : projectId;
  if (!projectTitle || projectTitle.trim() === '') {
    return `${env.GITHUB_REPO_PREFIX}${shortId}`;
  }

  const slug = projectTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');

  return slug
    ? `${env.GITHUB_REPO_PREFIX}${slug}-${shortId}`
    : `${env.GITHUB_REPO_PREFIX}${shortId}`;
}

export class GitService {
  private baseStoragePath: string;
  private cachedOwner?: string;

  constructor() {
    this.baseStoragePath = path.resolve(env.STORAGE_PATH, 'git');
  }

  // Obtém o nome de usuário autenticado do GitHub ou a organização
  private async getOwner(): Promise<string> {
    if (env.GITHUB_ORG) {
      return env.GITHUB_ORG;
    }
    if (this.cachedOwner) {
      return this.cachedOwner;
    }
    if (!env.GITHUB_TOKEN) {
      return 'user';
    }
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'User-Agent': 'SCI-LaTeX-Backend',
        },
      });
      if (response.ok) {
        const userData = (await response.json()) as any;
        if (userData.login) {
          this.cachedOwner = userData.login;
          return userData.login;
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Warning fetching GitHub user profile:', err.message || err);
    }
    return 'user';
  }

  // Garante que o diretório base de repositórios temporários exista
  private async ensureStorageDir() {
    await fs.mkdir(this.baseStoragePath, { recursive: true });
  }

  // Obtém o caminho ou URL do repositório
  getRepoPath(projectId: string, projectTitle?: string): string {
    if (env.GITHUB_TOKEN && env.NODE_ENV !== 'test') {
      const repoName = generateRepoName(projectId, projectTitle);
      const owner = env.GITHUB_ORG || 'user';
      return `https://github.com/${owner}/${repoName}.git`;
    }
    return path.join(this.baseStoragePath, `${projectId}.git`);
  }

  // Inicializa um novo repositório obrigatoriamente no GitHub via REST API
  async initRepository(projectId: string, projectTitle: string): Promise<string> {
    await this.ensureStorageDir();

    const isTestMode = env.NODE_ENV === 'test';
    if (!env.GITHUB_TOKEN && !isTestMode) {
      throw new Error(
        'GITHUB_TOKEN_REQUIRED: GITHUB_TOKEN environment variable is required to create GitHub repositories.'
      );
    }

    let remoteUrl: string;
    const repoName = generateRepoName(projectId, projectTitle);
    let owner = env.GITHUB_ORG || 'user';

    if (!isTestMode) {
      // 1. Criar repositório remoto no GitHub via REST API (Desenvolvimento e Produção)
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
        owner = repoData.owner?.login || owner;
        remoteUrl = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${owner}/${repoName}.git`;
      } catch (error: any) {
        console.error('❌ Error creating GitHub repository:', error.message);
        throw error;
      }
    } else {
      // Modo exclusivo para suíte de testes automatizados sem rede
      const bareRepoPath = path.join(this.baseStoragePath, `${projectId}.git`);
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

\\title{${projectTitle.replace(/[{}]/g, '')}}
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
      await execAsync(`git commit -m "Initial commit: LaTeX paper template main.tex"`, {
        cwd: tempDir,
      });

      // Push para o repositório remoto (GitHub ou Bare local): envia main e dev
      await execAsync(`git remote add origin "${remoteUrl}"`, { cwd: tempDir });
      await execAsync(`git push origin main`, { cwd: tempDir });
      await execAsync(`git checkout -b dev`, { cwd: tempDir });
      await execAsync(`git push origin dev`, { cwd: tempDir });
    } finally {
      // Limpa o diretório temporário
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    return !isTestMode
      ? `https://github.com/${owner}/${repoName}`
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
      if (repoLocation.startsWith('https://github.com/')) {
        repoLocation = repoLocation.replace(
          'https://github.com/',
          `https://x-access-token:${env.GITHUB_TOKEN}@github.com/`
        );
        if (!repoLocation.endsWith('.git')) {
          repoLocation += '.git';
        }
      } else {
        const repoName = generateRepoName(data.projectId);
        const owner = env.GITHUB_ORG || 'user';
        repoLocation = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${owner}/${repoName}.git`;
      }
    }

    const tempDir = path.join(this.baseStoragePath, `temp-commit-${data.projectId}-${Date.now()}`);

    try {
      // Tenta clonar a branch de trabalho da seção. Se ela ainda não existir no remoto, clona a dev e cria a nova branch
      try {
        await execAsync(`git clone --branch ${data.branchName} "${repoLocation}" "${tempDir}"`, {
          cwd: this.baseStoragePath,
        });
      } catch {
        // Fallback: Clona a branch dev (ou main se dev falhar) e cria a branch da seção localmente
        try {
          await execAsync(`git clone --branch dev "${repoLocation}" "${tempDir}"`, {
            cwd: this.baseStoragePath,
          });
        } catch {
          await execAsync(`git clone --branch main "${repoLocation}" "${tempDir}"`, {
            cwd: this.baseStoragePath,
          });
        }
        await execAsync(`git checkout -b ${data.branchName}`, { cwd: tempDir });
      }

      const fullFilePath = path.join(tempDir, data.filePath);
      await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
      await fs.writeFile(fullFilePath, data.content, 'utf-8');

      await execAsync(`git config user.name "${data.authorName.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });
      await execAsync(`git config user.email "${data.authorEmail.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });

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

  // Realiza a fusão (git merge) de uma branch de origem (ex: section/intro-a1b2c3d4) em uma branch alvo (ex: dev ou main)
  async mergeBranch(data: {
    projectId: string;
    sourceBranch: string;
    targetBranch: string;
    authorName: string;
    authorEmail: string;
    commitMessage?: string;
    repoUrl?: string;
  }): Promise<string> {
    await this.ensureStorageDir();
    const isGitHubMode = Boolean(env.GITHUB_TOKEN && env.NODE_ENV !== 'test');

    let repoLocation = data.repoUrl || this.getRepoPath(data.projectId);
    if (isGitHubMode && !repoLocation.includes('x-access-token')) {
      if (repoLocation.startsWith('https://github.com/')) {
        repoLocation = repoLocation.replace(
          'https://github.com/',
          `https://x-access-token:${env.GITHUB_TOKEN}@github.com/`
        );
        if (!repoLocation.endsWith('.git')) {
          repoLocation += '.git';
        }
      } else {
        const repoName = generateRepoName(data.projectId);
        const owner = env.GITHUB_ORG || 'user';
        repoLocation = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${owner}/${repoName}.git`;
      }
    }

    const tempDir = path.join(this.baseStoragePath, `temp-merge-${data.projectId}-${Date.now()}`);

    try {
      // Clona a branch de destino (targetBranch)
      await execAsync(`git clone --branch ${data.targetBranch} "${repoLocation}" "${tempDir}"`, {
        cwd: this.baseStoragePath,
      });

      await execAsync(`git config user.name "${data.authorName.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });
      await execAsync(`git config user.email "${data.authorEmail.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });

      // Busca a branch de origem no remoto
      await execAsync(`git fetch origin ${data.sourceBranch}`, { cwd: tempDir });

      const msg =
        data.commitMessage || `Merge branch '${data.sourceBranch}' into ${data.targetBranch}`;
      await execAsync(`git merge origin/${data.sourceBranch} -m "${msg.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });

      await execAsync(`git push origin ${data.targetBranch}`, { cwd: tempDir });

      const { stdout } = await execAsync(`git rev-parse HEAD`, { cwd: tempDir });
      return stdout.trim();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  // Remove uma branch mesclada no repositório remoto com proteção estrita para 'main' e 'dev'
  async deleteBranch(data: {
    projectId: string;
    branchName: string;
    repoUrl?: string;
  }): Promise<void> {
    const protectedBranches = ['main', 'dev', 'master'];
    const normalizedName = data.branchName.trim().toLowerCase();

    if (protectedBranches.includes(normalizedName)) {
      throw new Error(
        `CANNOT_DELETE_PROTECTED_BRANCH: A branch "${data.branchName}" é protegida e não pode ser excluída.`
      );
    }

    await this.ensureStorageDir();
    const isGitHubMode = Boolean(env.GITHUB_TOKEN && env.NODE_ENV !== 'test');

    let repoLocation = data.repoUrl || this.getRepoPath(data.projectId);
    if (isGitHubMode && !repoLocation.includes('x-access-token')) {
      if (repoLocation.startsWith('https://github.com/')) {
        repoLocation = repoLocation.replace(
          'https://github.com/',
          `https://x-access-token:${env.GITHUB_TOKEN}@github.com/`
        );
        if (!repoLocation.endsWith('.git')) {
          repoLocation += '.git';
        }
      } else {
        const repoName = generateRepoName(data.projectId);
        const owner = env.GITHUB_ORG || 'user';
        repoLocation = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${owner}/${repoName}.git`;
      }
    }

    const tempDir = path.join(this.baseStoragePath, `temp-del-${data.projectId}-${Date.now()}`);

    try {
      await execAsync(`git clone --branch dev "${repoLocation}" "${tempDir}"`, {
        cwd: this.baseStoragePath,
      });

      await execAsync(`git push origin --delete ${data.branchName}`, { cwd: tempDir });
    } catch (err: any) {
      console.warn(`⚠️ Warning deleting remote branch ${data.branchName}:`, err.message || err);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  // Cria um Draft Pull Request no GitHub via REST API
  async createDraftPullRequest(data: {
    projectId: string;
    headBranch: string;
    baseBranch?: string;
    title: string;
    body?: string;
    projectTitle?: string;
    repoUrl?: string;
  }): Promise<{ number: number; htmlUrl: string; nodeId?: string }> {
    const isGitHubMode = Boolean(env.GITHUB_TOKEN && env.NODE_ENV !== 'test');
    const baseBranch = data.baseBranch || 'dev';

    if (!isGitHubMode) {
      return {
        number: 1,
        htmlUrl: `http://localhost/mock-pr/${data.headBranch}`,
      };
    }

    let owner = await this.getOwner();
    let repoName = generateRepoName(data.projectId, data.projectTitle);

    if (data.repoUrl) {
      const match = data.repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
      if (match) {
        owner = match[1];
        repoName = match[2].replace(/\.git$/, '');
      }
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/pulls`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SCI-LaTeX-Backend',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title: data.title,
          body: data.body || `Draft PR for ${data.headBranch}`,
          head: data.headBranch,
          base: baseBranch,
          draft: true,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        if (response.status === 422 && errorData.message?.includes('already exists')) {
          const listUrl = `https://api.github.com/repos/${owner}/${repoName}/pulls?head=${owner}:${data.headBranch}&state=all`;
          const listRes = await fetch(listUrl, {
            headers: {
              Authorization: `Bearer ${env.GITHUB_TOKEN}`,
              'User-Agent': 'SCI-LaTeX-Backend',
            },
          });
          if (listRes.ok) {
            const prs = (await listRes.json()) as any[];
            if (prs.length > 0) {
              return {
                number: prs[0].number,
                htmlUrl: prs[0].html_url,
                nodeId: prs[0].node_id,
              };
            }
          }
        }
        console.warn(
          `⚠️ Warning creating GitHub draft PR: ${errorData.message || response.statusText}`
        );
        return {
          number: 1,
          htmlUrl: `https://github.com/${owner}/${repoName}/pulls`,
        };
      }

      const prData = (await response.json()) as any;
      return {
        number: prData.number,
        htmlUrl: prData.html_url,
        nodeId: prData.node_id,
      };
    } catch (error: any) {
      console.error('❌ Error creating GitHub draft PR:', error.message || error);
      return {
        number: 1,
        htmlUrl: `https://github.com/${owner}/${repoName}/pulls`,
      };
    }
  }

  // Transiciona um Draft Pull Request para Ready for Review no GitHub via GraphQL/REST API
  async markPullRequestReadyForReview(data: {
    projectId: string;
    prNumber?: number;
    projectTitle?: string;
    nodeId?: string;
    headBranch?: string;
    repoUrl?: string;
  }): Promise<boolean> {
    const isGitHubMode = Boolean(env.GITHUB_TOKEN && env.NODE_ENV !== 'test');
    if (!isGitHubMode) {
      return true;
    }

    let owner = await this.getOwner();
    let repoName = generateRepoName(data.projectId, data.projectTitle);

    if (data.repoUrl) {
      const match = data.repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
      if (match) {
        owner = match[1];
        repoName = match[2].replace(/\.git$/, '');
      }
    }

    try {
      let nodeId = data.nodeId;
      const prNumber = data.prNumber || 1;

      if (!nodeId) {
        const graphqlQuery = {
          query: `query { repository(owner: "${owner}", name: "${repoName}") { pullRequest(number: ${prNumber}) { id } } }`,
        };
        const gqlRes = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'SCI-LaTeX-Backend',
          },
          body: JSON.stringify(graphqlQuery),
        });
        if (gqlRes.ok) {
          const gqlData = (await gqlRes.json()) as any;
          nodeId = gqlData.data?.repository?.pullRequest?.id;
        }
      }

      if (nodeId) {
        const mutation = {
          query: `mutation { markPullRequestReadyForReview(input: {pullRequestId: "${nodeId}"}) { pullRequest { id isDraft } } }`,
        };
        await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'SCI-LaTeX-Backend',
          },
          body: JSON.stringify(mutation),
        });
      }

      return true;
    } catch (error: any) {
      console.error('❌ Error marking GitHub PR ready for review:', error.message || error);
      return false;
    }
  }
}
