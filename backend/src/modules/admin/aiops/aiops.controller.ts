import { FastifyReply, FastifyRequest } from 'fastify';
import { ActionAuditService } from './action-audit.service';
import {
  AiopsActionExecutionRequest,
  AiopsChatHistoryQuery,
  AiopsChatSendRequest,
  AiopsIncidentListQuery,
} from './aiops.schemas';
import { AiopsService } from './aiops.service';

export class AiopsController {
  constructor(
    private readonly service: AiopsService = new AiopsService(),
    private readonly auditService: ActionAuditService = new ActionAuditService()
  ) {}

  async listIncidents(
    request: FastifyRequest<{ Querystring: AiopsIncidentListQuery }>,
    reply: FastifyReply
  ) {
    const data = await this.service.listIncidents(request.query);
    return reply.status(200).send(data);
  }

  async getIncident(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const data = await this.service.getIncidentById(request.params.id);
    return reply.status(200).send(data);
  }

  async runDiagnosis(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const data = await this.service.runRcaDiagnosis(request.params.id);
    return reply.status(200).send(data);
  }

  async getChatHistory(
    request: FastifyRequest<{ Querystring: AiopsChatHistoryQuery }>,
    reply: FastifyReply
  ) {
    const data = await this.service.getChatHistory(request.query);
    return reply.status(200).send(data);
  }

  async chat(request: FastifyRequest<{ Body: AiopsChatSendRequest }>, reply: FastifyReply) {
    const userId = request.user?.sub ?? 'admin-user';
    const userEmail = request.user?.email ?? 'admin@scia.system';

    // Emissão de Token M2M com Escopos Granulares e Delegação Contextual (ADR-012)
    const m2mToken = request.server.jwt.sign(
      {
        type: 'SERVICE',
        sub: 'service:aiops',
        scopes: ['aiops:chat', 'observability:read'],
        actor: {
          userId,
          email: userEmail,
        },
      },
      { expiresIn: '15m' }
    );

    const data = await this.service.chatWithAgent(userId, request.body, m2mToken);
    return reply.status(200).send(data);
  }

  async executeAction(
    request: FastifyRequest<{ Body: AiopsActionExecutionRequest }>,
    reply: FastifyReply
  ) {
    const userId = request.user?.sub ?? 'admin-user';
    const userEmail = request.user?.email ?? 'admin@scia.system';
    const userIp = request.ip || '127.0.0.1';

    const data = await this.auditService.executeRemediationAction(
      userId,
      userEmail,
      userIp,
      request.body
    );

    return reply.status(200).send(data);
  }

  async streamChat(request: FastifyRequest<{ Body: AiopsChatSendRequest }>, reply: FastifyReply) {
    const userId = request.user?.sub ?? 'admin-user';
    const userEmail = request.user?.email ?? 'admin@scia.system';

    const m2mToken = request.server.jwt.sign(
      {
        type: 'SERVICE',
        sub: 'service:aiops',
        scopes: ['aiops:chat', 'observability:read'],
        actor: {
          userId,
          email: userEmail,
        },
      },
      { expiresIn: '15m' }
    );

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    try {
      reply.raw.write(
        `event: THINKING\ndata: ${JSON.stringify({ status: 'Consultando servidores MCP...' })}\n\n`
      );

      const result = await this.service.chatWithAgent(userId, request.body, m2mToken);

      reply.raw.write(`event: MESSAGE\ndata: ${JSON.stringify(result)}\n\n`);
      reply.raw.write(`event: DONE\ndata: {}\n\n`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro interno no AIOps Copilot.';
      reply.raw.write(`event: ERROR\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    } finally {
      reply.raw.end();
    }
  }
}
