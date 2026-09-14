import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { EditorProxyController } from './editor-proxy.controller';

export const editorProxyRoutes: FastifyPluginAsyncZod = async (app) => {
  const controller = new EditorProxyController();

  app.addHook('onRequest', verifyJwt);

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
          projectId: z.string().min(1),
        }),
        querystring: z.object({
          taskId: z.string().optional(),
          branchName: z.string().optional(),
          mode: z.string().optional(),
          token: z.string().optional(),
        }),
      },
    },
    controller.handleProxy.bind(controller)
  );
};
