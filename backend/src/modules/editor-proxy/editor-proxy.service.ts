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

export interface PrepareWorkspaceSessionParams {
  projectId: string;
  userId: string;
  taskId?: string;
  branchName?: string;
  token?: string;
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
    private readonly k8sPodManager: K8sPodManagerService = new K8sPodManagerService()
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

  // Garantia do repositório Git local e por usuário com sincronização da branch
  async ensureTaskWorkspace(params: {
    projectId: string;
    userId: string;
    taskId: string;
    branchName: string;
    gitRepoPath?: string;
  }): Promise<string> {
    const { projectId, userId, taskId, branchName, gitRepoPath } = params;
    const projectDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
    await fs.mkdir(projectDir, { recursive: true, mode: 0o777 });

    let hostGitPath = gitRepoPath;
    if (gitRepoPath && !path.isAbsolute(gitRepoPath)) {
      hostGitPath = path.resolve(env.STORAGE_PATH, 'git', gitRepoPath);
    } else if (!gitRepoPath) {
      hostGitPath = path.resolve(env.STORAGE_PATH, 'git', `${projectId}.git`);
    }

    const gitDir = path.join(projectDir, '.git');
    let hasGit = false;
    try {
      await fs.access(gitDir);
      hasGit = true;
    } catch {
      hasGit = false;
    }

    if (!hasGit && hostGitPath) {
      try {
        await fs.access(hostGitPath);
        await execAsync(`git clone "${hostGitPath}" "${projectDir}"`);
        await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
        hasGit = true;
      } catch {
        await execAsync(`git init "${projectDir}"`);
        await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
      }
    } else if (!hasGit) {
      await execAsync(`git init "${projectDir}"`);
      await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
    }

    await execAsync(`git -C "${projectDir}" config core.fileMode false`).catch(() => {});

    // Caminho físico exclusivo do Workspace da Task: projects/${projectId}/users/${userId}/tasks/${taskId}
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

    if (!taskHasGit) {
      const entries = await fs.readdir(projectDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'users' || entry.name === 'tasks' || entry.name === '.git') continue;
        const srcPath = path.join(projectDir, entry.name);
        const destPath = path.join(taskWorkspaceDir, entry.name);
        await fs.cp(srcPath, destPath, { recursive: true }).catch(() => {});
      }
    }

    await execAsync(`chmod -R 777 "${taskWorkspaceDir}"`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config core.fileMode false`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config safe.directory "*"`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config user.name "Usuario"`).catch(() => {});
    await execAsync(`git -C "${taskWorkspaceDir}" config user.email "user@sci-latex.com"`).catch(
      () => {}
    );

    try {
      await execAsync(
        `git -C "${taskWorkspaceDir}" fetch "${projectDir}" "+refs/heads/*:refs/remotes/origin/*"`
      ).catch(() => {});
      await execAsync(`git -C "${taskWorkspaceDir}" fetch --all`).catch(() => {});
    } catch {
      // Ignora erro de fetch
    }

    try {
      await execAsync(`git -C "${taskWorkspaceDir}" checkout "${branchName}"`);
    } catch {
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

    // Invariante 4: Validação de Branch (Garante que HEAD pertence exclusivamente à branchName da tarefa)
    try {
      const currentHeadRes = await execAsync(
        `git -C "${taskWorkspaceDir}" rev-parse --abbrev-ref HEAD`
      );
      const currentHead = currentHeadRes.stdout.trim();
      if (currentHead !== branchName && currentHead !== 'HEAD') {
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

    await this.ensureTaskWorkspace({
      projectId: params.projectId,
      userId,
      taskId,
      branchName: targetBranch,
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
