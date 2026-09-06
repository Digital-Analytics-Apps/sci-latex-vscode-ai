import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { env } from '../../config/env';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { PrismaProjectsRepository } from '../../repositories/projects.repository';

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
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };

      const project = await projectsRepository.findById(projectId);
      if (!project) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Projeto acadêmico não encontrado.',
        });
      }

      // Garante que o diretório de trabalho do projeto exista e tenha permissão total de escrita (chmod 777 para o container code-server)
      const projectDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
      await fs.mkdir(projectDir, { recursive: true, mode: 0o777 });
      try {
        await fs.chmod(projectDir, 0o777);
      } catch {
        // Ignora erro se chmod não puder ser alterado
      }

      // Garante que o arquivo main.tex inicial exista com permissão de escrita
      const mainTexPath = path.join(projectDir, 'main.tex');
      try {
        await fs.access(mainTexPath);
      } catch {
        const initialContent = `% SCI-LaTeX Paper Workspace: ${project.name}
\\documentclass[conference]{IEEEtran}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}

\\title{${project.name.replace(/[{}]/g, '')}}
\\author{\\IEEEauthorblockN{Gilson Russo}\\IEEEauthorblockA{Programa de Pós-Graduação em Computação}}

\\begin{document}
\\maketitle

\\begin{abstract}
Este artigo apresenta uma abordagem inovadora utilizando aprendizado profundo e processamento de sinais para otimização de redes.
\\end{abstract}

\\section{Introdução}
A escrita científica estruturada garante o rigor metodológico e a reprodutibilidade dos experimentos.

\\section{Metodologia}
Descreva os métodos e experimentos realizados.

\\section{Resultados e Discussão}
Apresente os resultados obtidos.

\\section{Conclusão}
Resuma os achados do trabalho.

\\end{document}
`;
        await fs.writeFile(mainTexPath, initialContent, 'utf-8');
      }
      try {
        await fs.chmod(mainTexPath, 0o777);
      } catch {
        // Ignora erro se chmod não puder ser alterado
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
