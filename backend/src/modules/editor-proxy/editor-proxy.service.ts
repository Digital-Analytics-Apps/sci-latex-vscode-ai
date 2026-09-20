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
  async ensureGitRepositoryWorkspace(
    projectId: string,
    gitRepoPath?: string,
    targetBranch?: string,
    userId?: string
  ) {
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

    if (hasGit && hostGitPath) {
      try {
        await fs.access(hostGitPath);
        await execAsync(`git -C "${projectDir}" fetch --all`).catch(() => {});
      } catch {
        // Ignora erro de fetch no host
      }
    }

    if (targetBranch) {
      try {
        await execAsync(`git -C "${projectDir}" checkout "${targetBranch}"`);
        await execAsync(`git -C "${projectDir}" pull origin "${targetBranch}"`).catch(() => {});
      } catch {
        await execAsync(
          `git -C "${projectDir}" checkout -b "${targetBranch}" origin/"${targetBranch}"`
        ).catch(async () => {
          await execAsync(`git -C "${projectDir}" checkout -b "${targetBranch}"`).catch(() => {});
        });
      }
    }

    if (userId) {
      const userWorkspaceDir = path.resolve(
        env.STORAGE_PATH,
        'projects',
        projectId,
        'users',
        userId
      );
      await fs.mkdir(userWorkspaceDir, { recursive: true, mode: 0o777 });

      const userGitDir = path.join(userWorkspaceDir, '.git');
      let userHasGit = false;
      try {
        await fs.access(userGitDir);
        userHasGit = true;
      } catch {
        userHasGit = false;
      }

      if (!userHasGit) {
        // Copia arquivos do projeto base (incluindo .git) ignorando a pasta 'users' para evitar recursão
        const entries = await fs.readdir(projectDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'users') continue;
          const srcPath = path.join(projectDir, entry.name);
          const destPath = path.join(userWorkspaceDir, entry.name);
          await fs.cp(srcPath, destPath, { recursive: true }).catch(() => {});
        }
      }

      await execAsync(`chmod -R 777 "${userWorkspaceDir}"`).catch(() => {});
      await execAsync(`git -C "${userWorkspaceDir}" config core.fileMode false`).catch(() => {});
      await execAsync(`git -C "${userWorkspaceDir}" config safe.directory "*"`).catch(() => {});
      await execAsync(`git -C "${userWorkspaceDir}" config user.name "Usuario"`).catch(() => {});
      await execAsync(`git -C "${userWorkspaceDir}" config user.email "user@sci-latex.com"`).catch(
        () => {}
      );

      // Sincroniza os refs do Git do projeto base com o workspace do usuário
      try {
        await execAsync(
          `git -C "${userWorkspaceDir}" fetch "${projectDir}" "+refs/heads/*:refs/remotes/origin/*"`
        ).catch(() => {});
        await execAsync(`git -C "${userWorkspaceDir}" fetch --all`).catch(() => {});
      } catch {
        // Ignora erro de fetch
      }

      if (targetBranch) {
        try {
          await execAsync(`git -C "${userWorkspaceDir}" checkout "${targetBranch}"`);
          await execAsync(
            `git -C "${userWorkspaceDir}" reset --hard origin/"${targetBranch}"`
          ).catch(() => {});
        } catch {
          await execAsync(
            `git -C "${userWorkspaceDir}" checkout -b "${targetBranch}" origin/"${targetBranch}"`
          ).catch(async () => {
            await execAsync(`git -C "${userWorkspaceDir}" checkout -b "${targetBranch}"`).catch(
              () => {}
            );
          });
        }
      }

      // Copia arquivos TeX atualizados do projeto base para o workspace do usuário (se não for build artifact)
      const isIgnoredBuildArtifact = (srcPath: string) => {
        const normalized = srcPath.replaceAll('\\', '/');
        const fileName = path.basename(normalized);
        const ignoredExtensions = [
          '.aux',
          '.log',
          '.fdb_latexmk',
          '.fls',
          '.synctex.gz',
          '.toc',
          '.out',
          '.nav',
          '.snm',
          '.bbl',
          '.blg',
          '.vrb',
          '.pdf',
        ];
        return (
          normalized.includes('/.git') ||
          normalized.includes('/.vscode') ||
          normalized.includes('/users/') ||
          normalized.endsWith('/users') ||
          fileName === 'indent.log' ||
          ignoredExtensions.some((ext) => fileName.endsWith(ext))
        );
      };

      try {
        await fs.cp(projectDir, userWorkspaceDir, {
          recursive: true,
          filter: (src) => !isIgnoredBuildArtifact(src),
        });
      } catch {
        // Ignora erro se falhar a cópia complementar
      }

      // Garante que o repositório Git do workspace do usuário possua um commit válido
      try {
        await execAsync(`git -C "${userWorkspaceDir}" rev-parse HEAD`);
      } catch {
        await execAsync(`git -C "${userWorkspaceDir}" add -A`).catch(() => {});
        await execAsync(`git -C "${userWorkspaceDir}" commit -m "Initial workspace commit"`).catch(
          () => {}
        );
      }
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

    // 1. Determina a branch de destino no Git priorizando taskId / branchName
    let targetBranch = 'dev';
    if (params.branchName) {
      targetBranch = params.branchName;
    } else if (params.taskId) {
      const task = await this.tasksRepository.findById(params.taskId).catch(() => null);
      if (task?.branchName) {
        targetBranch = task.branchName;
      }
    }

    const projectDir = path.resolve(env.STORAGE_PATH, 'projects', params.projectId);
    await this.ensureGitRepositoryWorkspace(
      params.projectId,
      project.gitRepoPath,
      targetBranch,
      params.userId
    );
    await this.ensureTeXTemplateFiles(projectDir, project.name);

    if (params.userId) {
      const userWorkspaceDir = path.resolve(
        env.STORAGE_PATH,
        'projects',
        params.projectId,
        'users',
        params.userId
      );
      await this.ensureTeXTemplateFiles(userWorkspaceDir, project.name);
    }

    // 2. Reivindica/Cria o Pod isolado do projeto no K8s
    const podResult = await this.k8sPodManager.claimPodForProject(params.projectId, params.userId);

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

    // Grava a sessão ativa na tabela Workspace com status sincronizado (READY se respondendo, PROVISIONING se subindo)
    await this.workspacesRepository
      .upsertWorkspace({
        projectId: params.projectId,
        userId: params.userId,
        taskId: params.taskId || null,
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
