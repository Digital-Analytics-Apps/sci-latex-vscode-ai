import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
        description: 'Conexão Server-Sent Events (SSE) para receber alertas de compilação PDF, atualizações de PRs e prazos em tempo real.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.sub;

      // Configura cabeçalhos HTTP padrão para SSE (Server-Sent Events)
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no');

      // Envia mensagem inicial de confirmação de conexão
      reply.raw.write(`: connected\n\n`);

      eventsManager.addClient(userId, reply);

      // Heartbeat a cada 30 segundos para manter a conexão viva
      const keepAliveInterval = setInterval(() => {
        reply.raw.write(`: ping\n\n`);
      }, 30000);

      // Trata a desconexão do cliente
      request.raw.on('close', () => {
        clearInterval(keepAliveInterval);
        eventsManager.removeClient(userId, reply);
      });
    }
  );
}
