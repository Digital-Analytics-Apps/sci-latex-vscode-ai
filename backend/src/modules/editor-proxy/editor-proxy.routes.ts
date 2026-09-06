import { FastifyInstance } from 'fastify';
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
          'Redireciona para o code-server Docker ou renderiza a interface de fallback do editor LaTeX.',
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

      // Verifica se o serviço do code-server está ativo na porta 8080 (usando 127.0.0.1 para evitar latência IPv6)
      let isCodeServerUp = false;
      const checkUrl = codeServerUrl.replace('localhost', '127.0.0.1');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);
        const response = await fetch(checkUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok || response.status < 500) {
          isCodeServerUp = true;
        }
      } catch {
        isCodeServerUp = false;
      }

      if (isCodeServerUp) {
        const targetUrl = `${codeServerUrl}/?folder=/home/coder/storage/git/${projectId}`;
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
