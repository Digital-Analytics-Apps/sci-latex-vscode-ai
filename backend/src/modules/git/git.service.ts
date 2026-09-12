import { Octokit } from '@octokit/rest';
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
  private octokitClient?: Octokit;

  constructor() {
    this.baseStoragePath = path.resolve(env.STORAGE_PATH, 'git');
  }

  // Obtém a instância autenticada da SDK oficial do GitHub (@octokit/rest)
  private getOctokit(): Octokit {
    if (!this.octokitClient) {
      if (env.GITHUB_TOKEN) {
        this.octokitClient = new Octokit({ auth: env.GITHUB_TOKEN });
      } else {
        throw new Error(
          'GITHUB_TOKEN_REQUIRED: GITHUB_TOKEN environment variable is required to interact with GitHub API.'
        );
      }
    }
    return this.octokitClient;
  }

  // Retorna a flag -c http.extraHeader para autenticar comandos Git CLI via cabeçalho HTTP efêmero em memória
  private getGitAuthFlags(): string {
    if (env.GITHUB_TOKEN && env.NODE_ENV !== 'test') {
      const authHeader = Buffer.from(`x-access-token:${env.GITHUB_TOKEN}`).toString('base64');
      return `-c http.extraHeader="Authorization: Basic ${authHeader}"`;
    }
    return '';
  }

  // Sanitiza a URL do repositório garantindo a remoção de credenciais expostas
  cleanRepoUrl(url: string): string {
    if (url.includes('@github.com/')) {
      return url.replace(/https:\/\/[^@]+@github\.com\//, 'https://github.com/');
    }
    return url;
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
      const octokit = this.getOctokit();
      const { data } = await octokit.rest.users.getAuthenticated();
      if (data?.login) {
        this.cachedOwner = data.login;
        return data.login;
      }
    } catch (err: any) {
      console.warn('⚠️ Warning fetching GitHub user profile via Octokit:', err.message || err);
    }
    return 'user';
  }

  // Garante que o diretório base de repositórios temporários exista
  private async ensureStorageDir() {
    await fs.mkdir(this.baseStoragePath, { recursive: true });
  }

  // Obtém o caminho ou URL limpa do repositório
  getRepoPath(projectId: string, projectTitle?: string): string {
    if (env.GITHUB_TOKEN && env.NODE_ENV !== 'test') {
      const repoName = generateRepoName(projectId, projectTitle);
      const owner = env.GITHUB_ORG || this.cachedOwner || 'user';
      return `https://github.com/${owner}/${repoName}.git`;
    }
    return path.join(this.baseStoragePath, `${projectId}.git`);
  }

  // Inicializa um novo repositório obrigatoriamente no GitHub via Octokit REST API
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
      try {
        const octokit = this.getOctokit();
        let repoData: any;
        if (env.GITHUB_ORG) {
          const res = await octokit.rest.repos.createInOrg({
            org: env.GITHUB_ORG,
            name: repoName,
            private: true,
            description: `Paper: ${projectTitle}`,
            auto_init: false,
          });
          repoData = res.data;
        } else {
          const res = await octokit.rest.repos.createForAuthenticatedUser({
            name: repoName,
            private: true,
            description: `Paper: ${projectTitle}`,
            auto_init: false,
          });
          repoData = res.data;
        }

        owner = repoData.owner?.login || owner;
        remoteUrl = `https://github.com/${owner}/${repoName}.git`;
      } catch (error: any) {
        console.error('❌ Error creating GitHub repository via Octokit:', error.message || error);
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

      // Criar diretório de seções modulares para evitar conflitos de mesclagem
      const sectionsDir = path.join(tempDir, 'sections');
      await fs.mkdir(sectionsDir, { recursive: true });

      const introContent = `\\section{Introdução \\& Trabalhos Relacionados}\nBem-vindo ao seu novo artigo científico! Escreva a introdução e trabalhos relacionados aqui.\n`;
      const methodContent = `\\section{Metodologia \\& Formulação}\nDescreva os métodos, hipóteses e modelos formulados neste trabalho.\n`;
      const resultsContent = `\\section{Resultados \\& Experimentos}\nApresente os resultados obtidos, tabelas e gráficos experimentais.\n`;
      const conclusionContent = `\\section{Conclusão}\nResuma as principais conclusões do trabalho e direções de pesquisas futuras.\n`;

      await fs.writeFile(path.join(sectionsDir, '01-introduction.tex'), introContent, 'utf-8');
      await fs.writeFile(path.join(sectionsDir, '02-methodology.tex'), methodContent, 'utf-8');
      await fs.writeFile(path.join(sectionsDir, '03-results.tex'), resultsContent, 'utf-8');
      await fs.writeFile(path.join(sectionsDir, '04-conclusion.tex'), conclusionContent, 'utf-8');

      const templateContent = `% SCI-LaTeX Paper Template
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}

\\title{${projectTitle.replace(/[{}]/g, '')}}
\\author{SCI-LaTeX Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\input{sections/01-introduction.tex}
\\input{sections/02-methodology.tex}
\\input{sections/03-results.tex}
\\input{sections/04-conclusion.tex}

\\end{document}
`;

      await fs.writeFile(path.join(tempDir, 'main.tex'), templateContent, 'utf-8');

      // Configura autor do commit inicial
      await execAsync(`git config user.name "SCI-LaTeX System"`, { cwd: tempDir });
      await execAsync(`git config user.email "system@sci-latex.org"`, { cwd: tempDir });

      await execAsync(`git add .`, { cwd: tempDir });
      await execAsync(
        `git commit -m "Initial commit: Modular LaTeX paper template main.tex and sections/"`,
        {
          cwd: tempDir,
        }
      );

      const gitFlags = this.getGitAuthFlags();
      const cleanRemoteUrl = this.cleanRepoUrl(remoteUrl);

      // Push seguro para o repositório remoto (GitHub ou Bare local): envia main e dev
      await execAsync(`git ${gitFlags} remote add origin "${cleanRemoteUrl}"`, { cwd: tempDir });
      await execAsync(`git ${gitFlags} push origin main`, { cwd: tempDir });
      await execAsync(`git checkout -b dev`, { cwd: tempDir });
      await execAsync(`git ${gitFlags} push origin dev`, { cwd: tempDir });
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
    const gitFlags = this.getGitAuthFlags();
    const cleanRepoLocation = this.cleanRepoUrl(data.repoUrl || this.getRepoPath(data.projectId));

    const tempDir = path.join(this.baseStoragePath, `temp-commit-${data.projectId}-${Date.now()}`);

    try {
      // Tenta clonar a branch de trabalho da seção. Se ela ainda não existir no remoto, clona a dev e cria a nova branch
      try {
        await execAsync(
          `git ${gitFlags} clone --branch ${data.branchName} "${cleanRepoLocation}" "${tempDir}"`,
          {
            cwd: this.baseStoragePath,
          }
        );
      } catch {
        // Fallback: Clona a branch dev (ou main se dev falhar) e cria a branch da seção localmente
        try {
          await execAsync(
            `git ${gitFlags} clone --branch dev "${cleanRepoLocation}" "${tempDir}"`,
            {
              cwd: this.baseStoragePath,
            }
          );
        } catch {
          await execAsync(
            `git ${gitFlags} clone --branch main "${cleanRepoLocation}" "${tempDir}"`,
            {
              cwd: this.baseStoragePath,
            }
          );
        }
        await execAsync(`git checkout -b ${data.branchName}`, { cwd: tempDir });
      }

      // Copia todo o conteúdo atualizado da workspace do autor (storage/projects/:projectId) para o tempDir do commit
      const projectDir = path.resolve(env.STORAGE_PATH, 'projects', data.projectId);
      try {
        const stats = await fs.stat(projectDir);
        if (stats.isDirectory()) {
          await fs.cp(projectDir, tempDir, {
            recursive: true,
            filter: (src) => !src.includes('/.git'),
          });
        }
      } catch {
        // Ignora erro se o diretório da workspace não existir
      }

      const fullFilePath = path.join(tempDir, data.filePath);
      await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
      if (data.content && data.content.trim() !== '') {
        await fs.writeFile(fullFilePath, data.content, 'utf-8');
      }

      await execAsync(`git config user.name "${data.authorName.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });
      await execAsync(`git config user.email "${data.authorEmail.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });

      await execAsync(`git add -A`, { cwd: tempDir });
      await execAsync(`git commit -m "${data.commitMessage.replace(/"/g, '')}"`, { cwd: tempDir });
      await execAsync(`git ${gitFlags} push origin ${data.branchName}`, { cwd: tempDir });

      // Retorna o hash do commit gerado
      const { stdout } = await execAsync(`git rev-parse HEAD`, { cwd: tempDir });
      return stdout.trim();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  // Realiza a fusão (git merge) de uma branch de origem (ex: task/intro-a1b2c3d4) em uma branch alvo (ex: dev ou main)
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
    const gitFlags = this.getGitAuthFlags();
    const cleanRepoLocation = this.cleanRepoUrl(data.repoUrl || this.getRepoPath(data.projectId));

    const tempDir = path.join(this.baseStoragePath, `temp-merge-${data.projectId}-${Date.now()}`);

    try {
      // Clona a branch de destino (targetBranch)
      await execAsync(
        `git ${gitFlags} clone --branch ${data.targetBranch} "${cleanRepoLocation}" "${tempDir}"`,
        {
          cwd: this.baseStoragePath,
        }
      );

      await execAsync(`git config user.name "${data.authorName.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });
      await execAsync(`git config user.email "${data.authorEmail.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });

      // Busca a branch de origem no remoto
      await execAsync(`git ${gitFlags} fetch origin ${data.sourceBranch}`, { cwd: tempDir });

      const msg =
        data.commitMessage || `Merge branch '${data.sourceBranch}' into ${data.targetBranch}`;
      await execAsync(`git merge origin/${data.sourceBranch} -m "${msg.replace(/"/g, '')}"`, {
        cwd: tempDir,
      });

      await execAsync(`git ${gitFlags} push origin ${data.targetBranch}`, { cwd: tempDir });

      const { stdout } = await execAsync(`git rev-parse HEAD`, { cwd: tempDir });
      return stdout.trim();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  // Realiza o merge oficial de um Pull Request no GitHub via Octokit REST API
  async mergePullRequestOnGitHub(data: {
    projectId: string;
    headBranch: string;
    baseBranch?: string;
    projectTitle?: string;
    repoUrl?: string;
    prNumber?: number;
    commitTitle?: string;
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

    let prNumber = data.prNumber;
    if (!prNumber && data.headBranch) {
      try {
        const octokit = this.getOctokit();
        const res = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          head: `${owner}:${data.headBranch}`,
          state: 'all',
        });
        if (res.data.length > 0) {
          prNumber = res.data[0].number;
        }
      } catch {
        // Fallback
      }
    }

    if (!prNumber) {
      return false;
    }

    try {
      const octokit = this.getOctokit();
      await octokit.rest.pulls.merge({
        owner,
        repo: repoName,
        pull_number: prNumber,
        commit_title:
          data.commitTitle || `Merge section ${data.headBranch} into ${data.baseBranch || 'dev'}`,
        merge_method: 'merge',
      });

      return true;
    } catch (error: any) {
      console.warn('⚠️ Error merging PR on GitHub via Octokit:', error.message || error);
      return false;
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
    const gitFlags = this.getGitAuthFlags();
    const cleanRepoLocation = this.cleanRepoUrl(data.repoUrl || this.getRepoPath(data.projectId));

    const tempDir = path.join(this.baseStoragePath, `temp-del-${data.projectId}-${Date.now()}`);

    try {
      await execAsync(`git ${gitFlags} clone --branch dev "${cleanRepoLocation}" "${tempDir}"`, {
        cwd: this.baseStoragePath,
      });

      await execAsync(`git ${gitFlags} push origin --delete ${data.branchName}`, {
        cwd: tempDir,
      });
    } catch (err: any) {
      console.warn(`⚠️ Warning deleting remote branch ${data.branchName}:`, err.message || err);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  // Cria um Draft Pull Request no GitHub via Octokit REST API
  async createDraftPullRequest(data: {
    projectId: string;
    headBranch: string;
    baseBranch?: string;
    title: string;
    body?: string;
    projectTitle?: string;
    repoUrl?: string;
    authorName?: string;
    authorEmail?: string;
    authorRole?: string;
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

    const userMeta = [
      data.authorName,
      data.authorEmail ? `<${data.authorEmail}>` : null,
      data.authorRole ? `[${data.authorRole}]` : null,
    ]
      .filter(Boolean)
      .join(' ');

    let prBody = data.body || `Draft PR for ${data.headBranch}`;
    if (userMeta) {
      prBody = `👤 **Autor Original:** ${userMeta}\n\n${prBody}`;
    }

    try {
      const octokit = this.getOctokit();
      const res = await octokit.rest.pulls.create({
        owner,
        repo: repoName,
        title: data.title,
        body: prBody,
        head: data.headBranch,
        base: baseBranch,
        draft: true,
      });

      return {
        number: res.data.number,
        htmlUrl: res.data.html_url,
        nodeId: res.data.node_id,
      };
    } catch (error: any) {
      if (error.status === 422 || error.message?.includes('already exists')) {
        try {
          const octokit = this.getOctokit();
          const listRes = await octokit.rest.pulls.list({
            owner,
            repo: repoName,
            head: `${owner}:${data.headBranch}`,
            state: 'all',
          });
          if (listRes.data.length > 0) {
            return {
              number: listRes.data[0].number,
              htmlUrl: listRes.data[0].html_url,
              nodeId: listRes.data[0].node_id,
            };
          }
        } catch {
          // Fallback
        }
      }
      console.warn('⚠️ Warning creating GitHub draft PR via Octokit:', error.message || error);
      return {
        number: 1,
        htmlUrl: `https://github.com/${owner}/${repoName}/pulls`,
      };
    }
  }

  // Transiciona um Draft Pull Request para Ready for Review no GitHub via Octokit GraphQL API
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
      const octokit = this.getOctokit();
      let nodeId = data.nodeId;
      const prNumber = data.prNumber || 1;

      if (!nodeId) {
        const query = `query { repository(owner: "${owner}", name: "${repoName}") { pullRequest(number: ${prNumber}) { id } } }`;
        const gqlRes: any = await octokit.graphql(query);
        nodeId = gqlRes?.repository?.pullRequest?.id;
      }

      if (nodeId) {
        const mutation = `mutation { markPullRequestReadyForReview(input: {pullRequestId: "${nodeId}"}) { pullRequest { id isDraft } } }`;
        await octokit.graphql(mutation);
      }

      return true;
    } catch (error: any) {
      console.error(
        '❌ Error marking GitHub PR ready for review via Octokit:',
        error.message || error
      );
      return false;
    }
  }

  // Envia a avaliação e comentários do Revisor diretamente no Pull Request no GitHub via Octokit REST API
  async submitPullRequestReviewOnGitHub(data: {
    projectId: string;
    headBranch?: string;
    projectTitle?: string;
    repoUrl?: string;
    prNumber?: number;
    status?: 'APPROVED' | 'CHANGES_REQUESTED' | 'UNDER_REVIEW';
    comment?: string;
    lineNumer?: number;
    reviewerName?: string;
    reviewerEmail?: string;
    reviewerRole?: string;
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

    let prNumber = data.prNumber;
    if (!prNumber && data.headBranch) {
      try {
        const octokit = this.getOctokit();
        const res = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          head: `${owner}:${data.headBranch}`,
          state: 'all',
        });
        if (res.data.length > 0) {
          prNumber = res.data[0].number;
        }
      } catch {
        // Fallback
      }
    }

    if (!prNumber) {
      prNumber = 1;
    }

    const reviewEventMap: Record<string, 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'> = {
      APPROVED: 'APPROVE',
      CHANGES_REQUESTED: 'REQUEST_CHANGES',
      UNDER_REVIEW: 'COMMENT',
    };

    const event = data.status ? reviewEventMap[data.status] || 'COMMENT' : 'COMMENT';

    const userMeta = [
      data.reviewerName,
      data.reviewerEmail ? `<${data.reviewerEmail}>` : null,
      data.reviewerRole ? `[${data.reviewerRole}]` : null,
    ]
      .filter(Boolean)
      .join(' ');

    let bodyText = data.comment || '';
    if (data.lineNumer) {
      bodyText = `[Linha #${data.lineNumer}] ${bodyText}`;
    }
    if (!bodyText.trim()) {
      if (event === 'REQUEST_CHANGES') bodyText = 'Ajustes solicitados pelo Revisor Técnico.';
      else if (event === 'APPROVE') bodyText = 'Seção aprovada pelo Revisor Técnico.';
      else bodyText = 'Comentário do Revisor Técnico.';
    }

    if (userMeta) {
      bodyText = `👤 **${userMeta}**\n\n${bodyText}`;
    }

    try {
      const octokit = this.getOctokit();
      await octokit.rest.pulls.createReview({
        owner,
        repo: repoName,
        pull_number: prNumber,
        event,
        body: bodyText,
      });
    } catch {
      // Fallback para Issue Comment se PR review de self-approval for negado
      try {
        const octokit = this.getOctokit();
        await octokit.rest.issues.createComment({
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: bodyText,
        });
      } catch {
        // Fallback ignorado
      }
    }

    return true;
  }
}
