import { exec } from 'child_process';
import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
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

async function ensureTeXTemplateFiles(targetDir: string, projectName: string) {
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

async function ensureGitRepositoryWorkspace(
  projectId: string,
  gitRepoPath?: string,
  targetBranch?: string,
  userId?: string
) {
  const projectDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
  await fs.mkdir(projectDir, { recursive: true, mode: 0o777 });

  const gitDir = path.join(projectDir, '.git');
  let hasGit = false;
  try {
    await fs.access(gitDir);
    hasGit = true;
  } catch {
    hasGit = false;
  }

  if (!hasGit && gitRepoPath) {
    try {
      let hostGitPath = gitRepoPath;
      if (!path.isAbsolute(gitRepoPath)) {
        hostGitPath = path.resolve(env.STORAGE_PATH, 'git', gitRepoPath);
      }
      await fs.access(hostGitPath);
      await execAsync(`git clone "${hostGitPath}" "${projectDir}"`);
      await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
    } catch {
      await execAsync(`git init "${projectDir}"`);
      await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
    }
  } else if (!hasGit) {
    await execAsync(`git init "${projectDir}"`);
    await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
  }

  await execAsync(`git -C "${projectDir}" config core.fileMode false`).catch(() => {});

  if (targetBranch && targetBranch !== 'dev' && targetBranch !== 'main') {
    try {
      await execAsync(`git -C "${projectDir}" checkout "${targetBranch}"`);
    } catch {
      await execAsync(`git -C "${projectDir}" checkout -b "${targetBranch}"`);
    }
  }

  if (userId) {
    const userWorkspaceDir = path.resolve(env.STORAGE_PATH, 'projects', projectId, 'users', userId);
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
    await execAsync(`git -C "${userWorkspaceDir}" config user.name "Autor"`).catch(() => {});
    await execAsync(`git -C "${userWorkspaceDir}" config user.email "author@sci-latex.com"`).catch(
      () => {}
    );

    if (targetBranch && targetBranch !== 'dev' && targetBranch !== 'main') {
      try {
        await execAsync(`git -C "${userWorkspaceDir}" checkout "${targetBranch}"`);
      } catch {
        await execAsync(`git -C "${userWorkspaceDir}" checkout -b "${targetBranch}"`);
      }
    }

    // Garante que o repositório Git do workspace do usuário possua um commit inicial para que os arquivos não fiquem como "U" (Untracked)
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

export class EditorProxyController {
  constructor(
    private projectsRepository: IProjectsRepository = new PrismaProjectsRepository(),
    private tasksRepository: ITasksRepository = new PrismaTasksRepository(),
    private workspacesRepository: IWorkspacesRepository = new PrismaWorkspacesRepository(),
    private k8sPodManager: K8sPodManagerService = new K8sPodManagerService()
  ) {}

  async handleProxy(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { taskId, branchName } = request.query as {
      taskId?: string;
      branchName?: string;
      mode?: string;
    };
    const userId = (request.user as any)?.sub || 'user';

    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Projeto acadêmico não encontrado.',
      });
    }

    // 1. Determina a branch de destino no Git priorizando taskId / branchName
    let targetBranch = 'dev';
    if (branchName) {
      targetBranch = branchName;
    } else if (taskId) {
      const task = await this.tasksRepository.findById(taskId).catch(() => null);
      if (task?.branchName) {
        targetBranch = task.branchName;
      }
    }

    const projectDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
    await ensureGitRepositoryWorkspace(projectId, project.gitRepoPath, targetBranch, userId);
    await ensureTeXTemplateFiles(projectDir, project.name);

    if (userId) {
      const userWorkspaceDir = path.resolve(
        env.STORAGE_PATH,
        'projects',
        projectId,
        'users',
        userId
      );
      await ensureTeXTemplateFiles(userWorkspaceDir, project.name);
    }

    // 2. Reivindica/Cria o Pod isolado do projeto no K8s montando estritamente a pasta do artigo
    const podResult = await this.k8sPodManager.claimPodForProject(projectId, userId);
    request.log.info({ podResult }, 'K8s Pod claimed for project workspace');

    const codeServerUrl = env.CODE_SERVER_URL;
    let isCodeServerUp = false;
    const urlsToCheck = [
      'http://host.docker.internal:30080',
      'http://localhost:30080',
      'http://127.0.0.1:30080',
      codeServerUrl,
    ];

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

    // Grava a sessão ativa na tabela Workspace com status sincronizado (READY se respondendo, PROVISIONING se subindo)
    await this.workspacesRepository
      .upsertWorkspace({
        projectId,
        userId,
        taskId: taskId || null,
        podName: podResult.podName,
        status: isCodeServerUp ? 'READY' : 'PROVISIONING',
      })
      .catch(() => {});

    if (isCodeServerUp) {
      const token =
        (request.query as any)?.token || request.headers.authorization?.replace('Bearer ', '');
      const tokenParam = token ? `&token=${token}` : '';
      const targetUrl = `/api/v1/editor-proxy/app/?folder=/home/coder/project${tokenParam}`;
      return reply.redirect(targetUrl);
    }

    // Fallback gracioso com auto-reload automático de 2s enquanto o container completa a inicialização
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="2">
  <title>VS Code Web Editor - ${project.name}</title>
  <style>
    body { background: #0b0f17; color: #10b981; font-family: monospace; padding: 40px; text-align: center; }
    .card { background: #161b22; border: 1px solid #30363d; padding: 24px; border-radius: 8px; max-width: 500px; margin: 0 auto; }
    .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid rgba(16,185,129,0.3); border-radius: 50%; border-top-color: #10b981; animation: spin 1s ease-in-out infinite; margin-bottom: 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>⚡ Conectando ao VS Code Server...</h2>
    <p style="color: #8b949e; margin-top: 12px;">Carregando ambiente TeX Live e extensão LaTeX Workshop no Pod do Kubernetes.</p>
  </div>
  <script>
    setTimeout(() => window.location.reload(), 2000);
  </script>
</body>
</html>`;

    return reply.type('text/html').send(htmlContent);
  }
}
