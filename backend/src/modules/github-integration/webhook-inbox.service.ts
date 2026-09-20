import crypto from 'node:crypto';
import { prisma } from '../../db/prisma';

export interface ProcessWebhookInput {
  deliveryId: string;
  eventType: string;
  action?: string;
  signature: string;
  secret: string;
  payload: any;
}

export class WebhookInboxService {
  /**
   * Valida a assinatura HMAC SHA-256 enviada no cabeçalho x-hub-signature-256 do GitHub
   */
  verifySignature(payload: string | object, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = `sha256=${hmac.update(payloadString).digest('hex')}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf-8'),
        Buffer.from(expectedSignature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Registra o evento no Webhook Inbox de forma idempotente e segura
   */
  async recordEvent(input: ProcessWebhookInput) {
    const isSignatureValid = this.verifySignature(input.payload, input.signature, input.secret);

    // Idempotência: verifica se o deliveryId já foi registrado anteriormente
    const existing = await prisma.githubWebhookEvent.findUnique({
      where: { deliveryId: input.deliveryId },
    });

    if (existing) {
      return { duplicate: true, event: existing };
    }

    const installationId = BigInt(input.payload.installation?.id || 0);

    const event = await prisma.githubWebhookEvent.create({
      data: {
        deliveryId: input.deliveryId,
        eventType: input.eventType,
        action: input.action || input.payload.action || null,
        signatureValid: isSignatureValid,
        installationId,
        payload: input.payload,
        status: isSignatureValid ? 'PENDING' : 'REJECTED',
      },
    });

    return { duplicate: false, event };
  }
}

export const webhookInboxService = new WebhookInboxService();
