import { FastifyReply, FastifyRequest } from 'fastify';
import { AdminService } from './admin.service';

export class AdminController {
  constructor(private service: AdminService = new AdminService()) {}

  async getOverview(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.getOverview();
    return reply.status(200).send(data);
  }

  async getWorkflow(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.getWorkflow();
    return reply.status(200).send(data);
  }

  async getInfrastructure(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.getInfrastructure();
    return reply.status(200).send(data);
  }

  async getCollaboration(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.getCollaboration();
    return reply.status(200).send(data);
  }

  async getActivity(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.getActivity();
    return reply.status(200).send(data);
  }

  async getEventsStream(_request: FastifyRequest, reply: FastifyReply) {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    // Dispara evento inicial de sincronização
    try {
      const initialOverview = await this.service.getOverview();
      reply.raw.write(`event: OVERVIEW_TICK\ndata: ${JSON.stringify(initialOverview)}\n\n`);
    } catch {
      // Ignora erro no evento inicial caso conexão feche rápido
    }

    // Heartbeat e atualização periódica a cada 10 segundos
    const interval = setInterval(async () => {
      try {
        const overview = await this.service.getOverview();
        reply.raw.write(`event: OVERVIEW_TICK\ndata: ${JSON.stringify(overview)}\n\n`);
      } catch {
        clearInterval(interval);
      }
    }, 10000);

    reply.raw.on('close', () => {
      clearInterval(interval);
    });
  }
}
