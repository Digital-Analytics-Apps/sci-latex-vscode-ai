import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { env } from '../../config/env';
import { K8sPodManagerService } from '../../infra/k8s/k8s-pod-manager.service';
import {
  IProjectsRepository,
  PrismaProjectsRepository,
} from '../../repositories/projects.repository';
import { ITasksRepository, PrismaTasksRepository } from '../../repositories/tasks.repository';
import { prisma } from '../../db/prisma';
import {
  IWorkspacesRepository,
  PrismaWorkspacesRepository,
} from '../../repositories/workspaces.repository';

const execAsync = promisify(exec);

import { GitService } from '../../infra/git/git.service';
import { redisService } from '../../infra/redis/redis.service';

export interface PrepareWorkspaceSessionParams {
  projectId: string;
  userId: string;
  taskId?: string;
  branchName?: string;
  token?: string;
  mode?: string;
}

export interface PrepareWorkspaceSessionResult {
  project: any;
  targetBranch: string;
  isCodeServerUp: boolean;
  podResult: any;
  redirectUrl?: string;
}

export class EditorProxyService {
  constructor(
    private readonly projectsRepository: IProjectsRepository = new PrismaProjectsRepository(),
    private readonly tasksRepository: ITasksRepository = new PrismaTasksRepository(),
    private readonly workspacesRepository: IWorkspacesRepository = new PrismaWorkspacesRepository(),
    private readonly k8sPodManager: K8sPodManagerService = new K8sPodManagerService(),
    private readonly gitService: GitService = new GitService()
  ) {}

  // Semeadura inicial da estrutura TeX (main.tex, seções, IEEEtran.cls, .gitignore)
  async ensureTeXTemplateFiles(targetDir: string, projectName: string) {
    const sectionsDir = path.join(targetDir, 'sections');
    try {
      await fs.mkdir(sectionsDir, { recursive: true, mode: 0o777 });

      const sec1Path = path.join(sectionsDir, '01-introduction.tex');
      const sec2Path = path.join(sectionsDir, '02-methodology.tex');
      const sec3Path = path.join(sectionsDir, '03-results.tex');
      const sec4Path = path.join(sectionsDir, '04-conclusion.tex');

      if (
        !(await fs
          .access(sec1Path)
          .then(() => true)
          .catch(() => false))
      ) {
        await fs.writeFile(
          sec1Path,
          `\\section{Introdução \\& Trabalhos Relacionados}\nBem-vindo ao seu novo artigo científico! Escreva a introdução e trabalhos relacionados aqui.\n`,
          'utf-8'
        );
      }
      if (
        !(await fs
          .access(sec2Path)
          .then(() => true)
          .catch(() => false))
      ) {
        await fs.writeFile(
          sec2Path,
          `\\section{Metodologia \\& Formulação}\nDescreva os métodos, hipóteses e modelos formulados neste trabalho.\n`,
          'utf-8'
        );
      }
      if (
        !(await fs
          .access(sec3Path)
          .then(() => true)
          .catch(() => false))
      ) {
        await fs.writeFile(
          sec3Path,
          `\\section{Resultados \\& Experimentos}\nApresente os resultados obtidos, tabelas e gráficos experimentais.\n`,
          'utf-8'
        );
      }
      if (
        !(await fs
          .access(sec4Path)
          .then(() => true)
          .catch(() => false))
      ) {
        await fs.writeFile(
          sec4Path,
          `\\section{Conclusão}\nResuma as principais conclusões do trabalho e direções de pesquisas futuras.\n`,
          'utf-8'
        );
      }
    } catch {
      // Ignora erro de pasta de seções
    }

    const mainTexPath = path.join(targetDir, 'main.tex');
    try {
      await fs.access(mainTexPath);
    } catch {
      const initialContent = `% SCI-LaTeX Paper Workspace: ${projectName}
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}

\\title{${projectName.replace(/[{}]/g, '')}}
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
      await fs.writeFile(mainTexPath, initialContent, 'utf-8');
    }

    const ieeeClsPath = path.join(targetDir, 'IEEEtran.cls');
    try {
      await fs.access(ieeeClsPath);
    } catch {
      const sourceIeeePath = path.resolve(__dirname, '../../../../docker/code-server/IEEEtran.cls');
      try {
        await fs.copyFile(sourceIeeePath, ieeeClsPath);
      } catch {
        // Ignora se fonte não encontrada
      }
    }

    const gitignorePath = path.join(targetDir, '.gitignore');
    try {
      await fs.access(gitignorePath);
    } catch {
      const gitignoreContent = `# TeX temporary build artifacts
        *.aux
        *.log
        *.out
        *.toc
        *.fls
        *.fdb_latexmk
        *.synctex.gz
        *.bbl
        *.blg
        *.run.xml
        *.bcf
        `;
      await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
    }

    await execAsync(`chmod -R 777 "${targetDir}"`).catch(() => {});
  }

  // Garantia do repositório Git por usuário/task via clone/fetch direto do GitHub (Zero arquivos estáticos fs.cp)
  async ensureTaskWorkspace(params: {
    projectId: string;
    userId: string;
    taskId: string;
    branchName: string;
    targetCommitHash?: string;
    gitRepoPath?: string;
  }): Promise<string> {
    const { projectId, userId, taskId, branchName, targetCommitHash, gitRepoPath } = params;

    // 1. Resolver a URL remota do GitHub ou o diretório host local
    let remoteUrl: string | undefined = undefined;
    let hostGitPath: string | undefined = undefined;

    if (gitRepoPath) {
      if (
        gitRepoPath.startsWith('http://') ||
        gitRepoPath.startsWith('https://') ||
        gitRepoPath.startsWith('git@')
      ) {
        remoteUrl = this.gitService.cleanRepoUrl(gitRepoPath);
      } else if (path.isAbsolute(gitRepoPath)) {
        hostGitPath = gitRepoPath;
      } else {
        hostGitPath = path.resolve(env.STORAGE_PATH, 'git', gitRepoPath);
      }
    } else {
      remoteUrl = this.gitService.getRepoPath(projectId);
    }

    const gitFlags = this.gitService.getGitAuthFlags();
    const repoTarget = remoteUrl || hostGitPath || this.gitService.getRepoPath(projectId);

    // 2. Resolver o caminho físico exclusivo do Workspace da Task: projects/${projectId}/users/${userId}/tasks/${taskId}
    const taskWorkspaceDir = this.workspacesRepository.getTaskWorkspacePath(
      projectId,
      userId,
      taskId
    );
    await fs.mkdir(taskWorkspaceDir, { recursive: true, mode: 0o777 });

    const taskGitDir = path.join(taskWorkspaceDir, '.git');
    let taskHasGit = false;
    try {
      await fs.access(taskGitDir);
      taskHasGit = true;
    } catch {
      taskHasGit = false;
    }

    // 3. Se o workspace não possui .git, efetuar git clone diretamente do repositório remoto/host do GitHub (Zero fs.cp)
    if (!taskHasGit) {
      try {
        if (remoteUrl) {
          await execAsync(`git ${gitFlags} clone "${remoteUrl}" "${taskWorkspaceDir}"`);
        } else if (hostGitPath) {
          await execAsync(`git clone "${hostGitPath}" "${taskWorkspaceDir}"`);
        } else {
          await execAsync(`git init "${taskWorkspaceDir}"`);
        }
      } catch {
        // Fallback: se o clone falhar (ex: repositório remoto sem commits ou ambiente de teste sem rede), inicializa git init
        await execAsync(`git init "${taskWorkspaceDir}"`).catch(() => {});
      }
    }

    // Configura permissões e metadados do repositório Git local
    await execAsync(`chmod -R 777 "${taskWorkspaceDir}"`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config core.fileMode false`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config safe.directory "*"`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config user.name "Usuario"`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config user.email "user@sci-latex.com"`).catch(
      () => {}
    );

    // 4. Efetuar fetch das atualizações mais recentes do remoto do GitHub para o workspace
    try {
      if (remoteUrl) {
        await execAsync(`git -C "${taskWorkspaceDir}" ${gitFlags} fetch origin`).catch(() => {});
        await execAsync(`git -C "${taskWorkspaceDir}" ${gitFlags} fetch --all`).catch(() => {});
      } else if (hostGitPath) {
        await execAsync(
          `git -C "${taskWorkspaceDir}" fetch "${hostGitPath}" "+refs/heads/*:refs/remotes/origin/*"`
        ).catch(() => {});
      }
    } catch {
      // Ignora falhas de fetch offline
    }

    // 5. Checkout da branch ou do commit imutável da submissão (submittedCommitHash)
    try {
      if (targetCommitHash) {
        // Modo Revisão: checkout direto no SHA exato do commit da submissão enviado pelo autor ao GitHub
        await execAsync(`git -C "${taskWorkspaceDir}" checkout "${targetCommitHash}"`).catch(
          async () => {
            await execAsync(
              `git -C "${taskWorkspaceDir}" reset --hard "${targetCommitHash}"`
            ).catch(() => {});
          }
        );
      } else {
        // Modo Autor: checkout na branch da tarefa (ex: task/123-secao)
        await execAsync(`git -C "${taskWorkspaceDir}" checkout "${branchName}"`).catch(async () => {
          await execAsync(
            `git -C "${taskWorkspaceDir}" checkout -b "${branchName}" origin/"${branchName}"`
          );
        });
        await execAsync(`git -C "${taskWorkspaceDir}" reset --hard origin/"${branchName}"`).catch(
          async () => {
            await execAsync(`git -C "${taskWorkspaceDir}" reset --hard "${branchName}"`).catch(
              () => {}
            );
          }
        );
      }
    } catch {
      // Fallback em caso de nova tarefa ou branch ainda não existente no remoto
      await execAsync(
        `git -C "${taskWorkspaceDir}" checkout -b "${branchName}" origin/"${branchName}"`
      ).catch(async () => {
        await execAsync(`git -C "${taskWorkspaceDir}" checkout -b "${branchName}" dev`).catch(
          async () => {
            await execAsync(`git -C "${taskWorkspaceDir}" checkout -b "${branchName}"`).catch(
              () => {}
            );
          }
        );
      });
    }

    // 6. Invariante: Validação de Head
    try {
      const currentHeadRes = await execAsync(
        `git -C "${taskWorkspaceDir}" rev-parse --abbrev-ref HEAD`
      );
      const currentHead = currentHeadRes.stdout.trim();
      if (!targetCommitHash && currentHead !== branchName && currentHead !== 'HEAD') {
        await execAsync(`git -C "${taskWorkspaceDir}" checkout "${branchName}"`).catch(() => {});
      }
    } catch {
      // Ignora falha de verificação
    }

    try {
      await execAsync(`git -C "${taskWorkspaceDir}" rev-parse HEAD`);
    } catch {
      await execAsync(`git -C "${taskWorkspaceDir}" add -A`).catch(() => {});
      await execAsync(
        `git -C "${taskWorkspaceDir}" commit -m "Initial task workspace commit"`
      ).catch(() => {});
    }

    await this.ensureTeXTemplateFiles(taskWorkspaceDir, 'Artigo SCI-LaTeX');

    return taskWorkspaceDir;
  }

  async ensureGitRepositoryWorkspace(
    projectId: string,
    gitRepoPath?: string,
    targetBranch?: string,
    userId?: string
  ) {
    if (userId) {
      await this.ensureTaskWorkspace({
        projectId,
        userId,
        taskId: 'default-task',
        branchName: targetBranch || 'dev',
        gitRepoPath,
      });
    }
  }

  // Prepara e inicializa toda a sessão de edição do projeto no Pod
  async prepareWorkspaceSession(
    params: PrepareWorkspaceSessionParams
  ): Promise<PrepareWorkspaceSessionResult> {
    const project = await this.projectsRepository.findById(params.projectId);
    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }
    let taskId = params.taskId || 'default-task';
    const userId = params.userId;

    if (params.taskId && params.taskId !== 'default-task' && params.mode !== 'review') {
      const activeUserId = await redisService.findActiveUserForTask(
        params.projectId,
        params.taskId
      );
      if (activeUserId && activeUserId !== userId) {
        const activeUser = await prisma.user
          .findUnique({
            where: { id: activeUserId },
            select: { name: true },
          })
          .catch(() => null);
        const activeName = activeUser?.name || 'outro usuário';
        throw new Error(
          `TASK_WORKSPACE_OCCUPIED: Esta tarefa está sendo editada por ${activeName} no momento.`
        );
      }
    }

    // 1. Determina a branch de destino no Git e resolve canonical taskId
    let targetBranch = params.branchName || 'dev';

    if (params.taskId && params.taskId !== 'default-task') {
      let task = await this.tasksRepository.findById(params.taskId).catch(() => null);

      if (!task && params.taskId.startsWith('github-issue-')) {
        const issueIdStr = params.taskId.replace('github-issue-', '');
        try {
          const issueProjection = await prisma.githubIssueProjection.findUnique({
            where: { githubIssueId: BigInt(issueIdStr) },
          });

          if (issueProjection) {
            const slug = issueProjection.title
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/[\s_]+/g, '-')
              .replace(/-+/g, '-')
              .slice(0, 30);
            const branchName = `task/${issueProjection.issueNumber}-${slug || 'item'}`;

            const localTasks = await this.tasksRepository.findMany({ projectId: params.projectId });
            const existing = localTasks.find((t) => t.branchName === branchName);

            if (existing) {
              task = existing;
            } else {
              task = await this.tasksRepository.create({
                projectId: params.projectId,
                assignedToId: userId,
                title: issueProjection.title,
                branchName,
                status: 'NOT_STARTED',
              });
            }
          }
        } catch {
          // Ignora falha de resolução de virtual issue
        }
      }

      if (task) {
        taskId = task.id;
        if (!params.branchName && task.branchName) {
          targetBranch = task.branchName;
        }
      } else if (!params.branchName) {
        const parsedBigInt = BigInt(params.taskId.replaceAll(/\D/g, '') || '-1');
        const issueProj = await prisma.githubIssueProjection
          .findFirst({
            where: {
              OR: [
                { githubIssueId: parsedBigInt },
                { issueNumber: Number.parseInt(params.taskId, 10) || -1 },
              ],
            },
          })
          .catch(() => null);

        if (issueProj) {
          const slug = issueProj.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 30);
          targetBranch = `task/${issueProj.issueNumber}-${slug}`;
        }
      }
    }

    let targetCommitHash: string | undefined = undefined;
    if (params.mode === 'review') {
      const pr = await prisma.pullRequest
        .findFirst({
          where: { projectId: params.projectId, taskId },
          include: { rounds: { orderBy: { roundNumber: 'desc' }, take: 1 } },
        })
        .catch(() => null);

      if (pr?.rounds?.[0]?.submittedCommitHash) {
        targetCommitHash = pr.rounds[0].submittedCommitHash;
      }
    }

    await this.ensureTaskWorkspace({
      projectId: params.projectId,
      userId,
      taskId,
      branchName: targetBranch,
      targetCommitHash,
      gitRepoPath: project.gitRepoPath,
    });

    // 2. Reivindica o Pod isolado da Task do projeto no K8s
    const podResult = await this.k8sPodManager.claimPodForTask(params.projectId, userId, taskId);

    const codeServerUrl = env.CODE_SERVER_URL;
    let isCodeServerUp = false;
    const urlsToCheck = [
      'http://host.docker.internal:30080',
      'http://localhost:30080',
      'http://127.0.0.1:30080',
      codeServerUrl,
    ];

    const startTime = Date.now();
    const maxTimeoutMs = 10000;

    while (!isCodeServerUp && Date.now() - startTime < maxTimeoutMs) {
      for (const url of urlsToCheck) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 600);
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok || response.status < 500) {
            isCodeServerUp = true;
            break;
          }
        } catch {
          // Tenta próxima URL
        }
      }
      if (!isCodeServerUp) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    // Grava a sessão ativa na tabela Workspace com a tríade (projectId, userId, taskId)
    await this.workspacesRepository
      .upsertWorkspace({
        projectId: params.projectId,
        userId: params.userId,
        taskId,
        podName: podResult.podName,
        status: isCodeServerUp ? 'READY' : 'PROVISIONING',
      })
      .catch(() => {});

    let redirectUrl: string | undefined;
    if (isCodeServerUp) {
      const tokenParam = params.token ? `&token=${params.token}` : '';
      redirectUrl = `/api/v1/editor-proxy/app/?folder=/home/coder/project${tokenParam}`;
    }

    return {
      project,
      targetBranch,
      isCodeServerUp,
      podResult,
      redirectUrl,
    };
  }
}

export const editorProxyService = new EditorProxyService();
