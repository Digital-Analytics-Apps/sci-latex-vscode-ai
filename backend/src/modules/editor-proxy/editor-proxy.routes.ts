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
          'Redireciona e provê proxy seguro para a sessão do VS Code Web (code-server) do projeto.',
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

      // Redireciona para o code-server com a pasta do projeto carregada
      const targetUrl = `${codeServerUrl}/?folder=/home/coder/storage/git/${projectId}`;
      return reply.redirect(targetUrl);
    }
  );
}
