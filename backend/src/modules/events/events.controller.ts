import { FastifyReply, FastifyRequest } from 'fastify';
import { eventsManager, EventsManagerService } from './events.manager';

export class EventsController {
  constructor(private manager: EventsManagerService = eventsManager) {}

  async streamEvents(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub;
    const { projectId } = request.query as { projectId?: string };

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

    this.manager.addClient(userId, reply, projectId);

    // Heartbeat a cada 30 segundos para manter a conexão viva
    const keepAliveInterval = setInterval(() => {
      reply.raw.write(`: ping\n\n`);
    }, 30000);

    // Trata a desconexão do cliente
    request.raw.on('close', () => {
      clearInterval(keepAliveInterval);
      this.manager.removeClient(userId, reply, projectId);
    });
  }
}
