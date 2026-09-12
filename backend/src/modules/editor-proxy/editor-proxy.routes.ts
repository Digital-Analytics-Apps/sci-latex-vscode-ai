import { exec } from 'child_process';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import { env } from '../../config/env';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { PrismaProjectsRepository } from '../../repositories/projects.repository';
import { K8sPodManagerService } from '../k8s/k8s-pod-manager.service';

const execAsync = promisify(exec);

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

  if (gitRepoPath) {
    let gitFlags = '';
    let repoUrl = gitRepoPath;

    if (env.GITHUB_TOKEN && env.NODE_ENV !== 'test') {
      const authHeader = Buffer.from(`x-access-token:${env.GITHUB_TOKEN}`).toString('base64');
      gitFlags = `-c http.extraHeader="Authorization: Basic ${authHeader}"`;
    }

    if (repoUrl.includes('@github.com/')) {
      repoUrl = repoUrl.replace(/https:\/\/[^@]+@github\.com\//, 'https://github.com/');
    }
    if (repoUrl.startsWith('https://github.com/') && !repoUrl.endsWith('.git')) {
      repoUrl += '.git';
    }

    try {
      if (!hasGit) {
        const tempDir = path.resolve(
          env.STORAGE_PATH,
          'projects',
          `temp-clone-${projectId}-${Date.now()}`
        );
        await execAsync(`git ${gitFlags} clone "${repoUrl}" "${tempDir}"`).catch(() => {});
        if (
          await fs
            .access(path.join(tempDir, 'main.tex'))
            .then(() => true)
            .catch(() => false)
        ) {
          await fs.cp(tempDir, projectDir, { recursive: true });
        }
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

        await execAsync(`git config user.name "SCI-LaTeX User"`, { cwd: projectDir }).catch(
          () => {}
        );
        await execAsync(`git config user.email "user@sci-latex.org"`, { cwd: projectDir }).catch(
          () => {}
        );
        await execAsync(`git ${gitFlags} fetch --all`, { cwd: projectDir }).catch(() => {});
      } else {
        await execAsync(`git ${gitFlags} fetch --all`, { cwd: projectDir }).catch(() => {});
      }

      if (targetBranch) {
        await execAsync(`git checkout "${targetBranch}"`, { cwd: projectDir }).catch(async () => {
          await execAsync(`git checkout -b "${targetBranch}" "origin/${targetBranch}"`, {
            cwd: projectDir,
          }).catch(() => {});
        });
      } else if (!hasGit) {
        await execAsync(`git checkout dev`, { cwd: projectDir }).catch(() => {});
      }

      await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
    } catch (err: any) {
      console.warn(`⚠️ Warning ensuring Git workspace for ${projectId}:`, err.message || err);
    }
  }

  // Se um userId for especificado, garante que a subpasta do usuário projects/${projectId}/users/${userId} esteja populada
  if (userId) {
    const userWorkspaceDir = path.resolve(env.STORAGE_PATH, 'projects', projectId, 'users', userId);
    await fs.mkdir(userWorkspaceDir, { recursive: true, mode: 0o777 });

    const userMainTex = path.join(userWorkspaceDir, 'main.tex');
    const hasUserFiles = await fs
      .access(userMainTex)
      .then(() => true)
      .catch(() => false);

    if (!hasUserFiles) {
      await fs.cp(projectDir, userWorkspaceDir, { recursive: true }).catch(() => {});
    }

    if (targetBranch) {
      await execAsync(`git config user.name "SCI-LaTeX User"`, { cwd: userWorkspaceDir }).catch(
        () => {}
      );
      await execAsync(`git config user.email "user@sci-latex.org"`, {
        cwd: userWorkspaceDir,
      }).catch(() => {});
      await execAsync(`git checkout "${targetBranch}"`, { cwd: userWorkspaceDir }).catch(
        async () => {
          await execAsync(`git checkout -b "${targetBranch}"`, { cwd: userWorkspaceDir }).catch(
            () => {}
          );
        }
      );
    }

    await execAsync(`chmod -R 777 "${userWorkspaceDir}"`).catch(() => {});
  }
}

export async function editorProxyRoutes(app: FastifyInstance) {
  const projectsRepository = new PrismaProjectsRepository();
  const k8sPodManager = new K8sPodManagerService();

  app.addHook('onRequest', verifyJwt);

  const codeServerUrl = env.CODE_SERVER_URL;

  app.get(
    '/:projectId',
    {
      schema: {
        tags: ['EditorProxy'],
        summary: 'VS Code Web Editor Proxy para Workspace de Escrita LaTeX',
        description:
          'Garante o provisionamento do diretório do artigo e redireciona para o VS Code Web (code-server).',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().uuid(),
        }),
        querystring: z.object({
          taskId: z.string().optional(),
          branchName: z.string().optional(),
          sectionId: z.string().optional(),
          mode: z.string().optional(),
          token: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { taskId, branchName, sectionId } = request.query as {
        taskId?: string;
        branchName?: string;
        sectionId?: string;
        mode?: string;
      };
      const userId = (request.user as any)?.sub || 'user';

      const project = await projectsRepository.findById(projectId);
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
        const task = await prisma.task.findUnique({ where: { id: taskId } }).catch(() => null);
        if (task?.branchName) {
          targetBranch = task.branchName;
        }
      } else if (sectionId) {
        targetBranch = `task/${sectionId}-${projectId.slice(0, 8)}`;
      }

      const projectDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
      await ensureGitRepositoryWorkspace(projectId, project.gitRepoPath, targetBranch, userId);

      // Garante a existência do diretório de seções modulares e arquivos de início
      const sectionsDir = path.join(projectDir, 'sections');
      try {
        await fs.mkdir(sectionsDir, { recursive: true });

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
        // Ignora erros ao criar pasta de seções
      }

      // Garante que o arquivo main.tex inicial exista com a estrutura modular
      const mainTexPath = path.join(projectDir, 'main.tex');
      try {
        await fs.access(mainTexPath);
      } catch {
        const initialContent = `% SCI-LaTeX Paper Workspace: ${project.name}
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}

\\title{${project.name.replace(/[{}]/g, '')}}
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
      try {
        await fs.chmod(mainTexPath, 0o777);
      } catch {
        // Ignora erro se chmod não puder ser alterado
      }

      // Garante que o arquivo de classe IEEEtran.cls exista na pasta do projeto para compilação local
      const ieeeClsPath = path.join(projectDir, 'IEEEtran.cls');
      try {
        await fs.access(ieeeClsPath);
      } catch {
        const sourceIeeePath = path.resolve(
          __dirname,
          '../../../../docker/code-server/IEEEtran.cls'
        );
        try {
          await fs.copyFile(sourceIeeePath, ieeeClsPath);
          await fs.chmod(ieeeClsPath, 0o777);
        } catch {
          // Ignora erro se não for possível copiar
        }
      }

      // 2. Reivindica/Cria o Pod isolado do projeto no K8s montando estritamente a pasta do artigo
      const podResult = await k8sPodManager.claimPodForProject(projectId, userId);
      request.log.info({ podResult }, 'K8s Pod claimed for project workspace');

      // 3. Verifica se o serviço do code-server está ativo na porta 30080 (NodePort do KinD) ou 8080
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

      if (isCodeServerUp) {
        const publicCodeServerHost = process.env.PUBLIC_CODE_SERVER_URL || 'http://localhost:30080';
        const targetUrl = `${publicCodeServerHost}/?folder=/home/coder/project`;
        return reply.redirect(targetUrl);
      }

      // Fallback gracioso caso o container ainda esteja subindo
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>VS Code Web Editor - ${project.name}</title>
  <style>
    body { background: #0b0f17; color: #10b981; font-family: monospace; padding: 40px; text-align: center; }
    .card { background: #161b22; border: 1px solid #30363d; padding: 24px; border-radius: 8px; max-width: 500px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚡ Conectando ao VS Code Server...</h2>
    <p style="color: #8b949e; margin-top: 12px;">Carregando ambiente TeX Live e extensão LaTeX Workshop.</p>
  </div>
</body>
</html>`;

      return reply.type('text/html').send(htmlContent);
    }
  );
}
