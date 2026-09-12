import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { eventsManager } from './events.manager';

export async function eventsRoutes(app: FastifyInstance) {
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
          projectId: z.string().uuid().optional(),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.sub;
      const { projectId } = (request.query as { projectId?: string }) || {};

      // Configura cabeçalhos CORS e HTTP padrão para SSE (Server-Sent Events)
      const origin = (request.headers.origin as string) || '*';
      reply.raw.setHeader('Access-Control-Allow-Origin', origin);
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no');

      // Envia mensagem inicial de confirmação de conexão
      reply.raw.write(`: connected\n\n`);

      eventsManager.addClient(userId, reply, projectId);

      // Heartbeat a cada 30 segundos para manter a conexão viva
      const keepAliveInterval = setInterval(() => {
        reply.raw.write(`: ping\n\n`);
      }, 30000);

      // Trata a desconexão do cliente
      request.raw.on('close', () => {
        clearInterval(keepAliveInterval);
        eventsManager.removeClient(userId, reply, projectId);
      });
    }
  );
}
