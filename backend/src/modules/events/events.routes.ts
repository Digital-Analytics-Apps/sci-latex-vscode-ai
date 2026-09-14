import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { EventsController } from './events.controller';

export const eventsRoutes: FastifyPluginAsyncZod = async (app) => {
  const controller = new EventsController();

  // GET /api/v1/events/stream - Stream de notificações SSE
  app.get(
    '/stream',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['Events'],
        summary: 'Stream SSE de Notificações em Tempo Real',
        description:
          'Conexão Server-Sent Events (SSE) para receber alertas de compilação PDF, atualizações de PRs e prazos em tempo real.',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          projectId: z.string().optional(),
        }),
      },
    },
    controller.streamEvents.bind(controller)
  );
};
