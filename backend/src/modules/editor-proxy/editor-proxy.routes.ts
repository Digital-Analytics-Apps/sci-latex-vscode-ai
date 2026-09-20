import httpProxy from '@fastify/http-proxy';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { EditorProxyController } from './editor-proxy.controller';

export const editorProxyRoutes: FastifyPluginAsyncZod = async (app) => {
  const controller = new EditorProxyController();

  // Registra o Reverse Proxy HTTP e WebSocket para o VS Code Web (code-server)
  const upstreamUrl =
    process.env.INTERNAL_CODE_SERVER_URL || 'http://sci-latex-kind-control-plane:30080';

  await app.register(httpProxy, {
    upstream: upstreamUrl,
    prefix: '/app',
    websocket: true,
    rewritePrefix: '/',
  });

  app.addHook('onRequest', verifyJwt);

  app.get(
    '/:projectId',
    {
      schema: {
        tags: ['EditorProxy'],
        summary: 'VS Code Web Editor Proxy para Workspace de Escrita LaTeX',
        description:
          'Garante o provisionamento do diretório do artigo e redireciona para o Reverse Proxy do VS Code Web.',
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
