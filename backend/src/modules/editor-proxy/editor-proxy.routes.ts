import { exec } from 'child_process';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import { env } from '../../config/env';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { PrismaProjectsRepository } from '../../repositories/projects.repository';

const execAsync = promisify(exec);

async function ensureGitRepositoryWorkspace(
  projectId: string,
  gitRepoPath?: string,
  targetBranch?: string
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

  if (!gitRepoPath) return;

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
      await execAsync(`git ${gitFlags} clone "${repoUrl}" "${tempDir}"`);
      await fs.cp(tempDir, projectDir, { recursive: true });
      await fs.rm(tempDir, { recursive: true, force: true });

      await execAsync(`git config user.name "SCI-LaTeX User"`, { cwd: projectDir });
      await execAsync(`git config user.email "user@sci-latex.org"`, { cwd: projectDir });
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

    // Permissões de escrita total para o container code-server (usuário coder)
    await execAsync(`chmod -R 777 "${projectDir}"`).catch(() => {});
  } catch (err: any) {
    console.warn(`⚠️ Warning ensuring Git workspace for ${projectId}:`, err.message || err);
  }
}

export async function editorProxyRoutes(app: FastifyInstance) {
  const projectsRepository = new PrismaProjectsRepository();

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
          sectionId: z.string().optional(),
          mode: z.string().optional(),
          token: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { sectionId } = request.query as { sectionId?: string; mode?: string };

      const project = await projectsRepository.findById(projectId);
      if (!project) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Projeto acadêmico não encontrado.',
        });
      }

      // Determina a branch de destino no Git
      let targetBranch = 'dev';
      if (sectionId) {
        targetBranch = `section/${sectionId}-${projectId.slice(0, 8)}`;
      }

      // Garante que o diretório de trabalho do projeto seja um repositório Git completo e sincronizado na branch correta
      const projectDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
      await ensureGitRepositoryWorkspace(projectId, project.gitRepoPath, targetBranch);

      // Garante a existência do diretório de seções modulares
      const sectionsDir = path.join(projectDir, 'sections');
      try {
        await fs.mkdir(sectionsDir, { recursive: true });
        
        const sec1Path = path.join(sectionsDir, '01-introduction.tex');
        const sec2Path = path.join(sectionsDir, '02-methodology.tex');
        const sec3Path = path.join(sectionsDir, '03-results.tex');
        const sec4Path = path.join(sectionsDir, '04-conclusion.tex');

        if (!(await fs.access(sec1Path).then(() => true).catch(() => false))) {
          await fs.writeFile(sec1Path, `\\section{Introdução & Trabalhos Relacionados}\nBem-vindo ao seu novo artigo científico! Escreva a introdução e trabalhos relacionados aqui.\n`, 'utf-8');
        }
        if (!(await fs.access(sec2Path).then(() => true).catch(() => false))) {
          await fs.writeFile(sec2Path, `\\section{Metodologia & Formulação}\nDescreva os métodos, hipóteses e modelos formulados neste trabalho.\n`, 'utf-8');
        }
        if (!(await fs.access(sec3Path).then(() => true).catch(() => false))) {
          await fs.writeFile(sec3Path, `\\section{Resultados & Experimentos}\nApresente os resultados obtidos, tabelas e gráficos experimentais.\n`, 'utf-8');
        }
        if (!(await fs.access(sec4Path).then(() => true).catch(() => false))) {
          await fs.writeFile(sec4Path, `\\section{Conclusão}\nResuma as principais conclusões do trabalho e direções de pesquisas futuras.\n`, 'utf-8');
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

      // Verifica se o serviço do code-server está ativo na porta 8080
      let isCodeServerUp = false;
      const urlsToCheck = [codeServerUrl, 'http://code-server:8080', 'http://127.0.0.1:8080'];

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
        const publicCodeServerHost = process.env.PUBLIC_CODE_SERVER_URL || 'http://localhost:8080';
        const targetUrl = `${publicCodeServerHost}/?folder=/home/coder/storage/projects/${projectId}`;
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
