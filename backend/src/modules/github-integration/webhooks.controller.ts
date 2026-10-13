import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env';
import { eventProcessorService } from './event-processor.service';
import { webhookInboxService } from './webhook-inbox.service';

export class WebhooksController {
  async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
    const deliveryId = (request.headers['x-github-delivery'] as string) || '';
    const eventType = (request.headers['x-github-event'] as string) || '';
    const signature = (request.headers['x-hub-signature-256'] as string) || '';
    const secret = env.JWT_SECRET || 'github-webhook-secret';
    const payload = request.body as any;

    if (!deliveryId || !eventType) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Cabeçalhos x-github-delivery e x-github-event são obrigatórios.',
      });
    }

    const { duplicate, event } = await webhookInboxService.recordEvent({
      deliveryId,
      eventType,
      signature,
      secret,
      payload,
    });

    if (!event.signatureValid) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Assinatura HMAC X-Hub-Signature-256 inválida.',
      });
    }

    if (duplicate) {
      return reply.status(200).send({
        status: 'DUPLICATE_IGNORED',
        deliveryId,
      });
    }

    // Processa o evento de forma assíncrona para atualizar a Local Projection e emitir SSE
    void eventProcessorService.processEvent(event.id);

    return reply.status(200).send({
      status: 'ACCEPTED',
      deliveryId,
      eventId: event.id,
    });
  }
}

export const webhooksController = new WebhooksController();
