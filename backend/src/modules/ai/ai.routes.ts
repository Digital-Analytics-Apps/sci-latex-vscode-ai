import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../../config/env';
import { verifyJwt } from '../../middlewares/auth.middleware';

const chatStreamSchema = z.object({
  conversationId: z.string().min(1, 'conversationId é obrigatório'),
  message: z.string().min(1, 'message é obrigatório'),
  context: z.record(z.string(), z.unknown()).optional(),
});

const chatResumeSchema = z.object({
  conversationId: z.string().min(1, 'conversationId é obrigatório'),
  decision: z.record(z.string(), z.unknown()),
});

export const aiRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', verifyJwt);

  // POST /api/v1/ai/chat/stream - Proxy SSE para Onboarding e Copilot do SciAI
  app.post(
    '/chat/stream',
    {
      schema: {
        tags: ['AI Assistant'],
        summary: 'Stream conversacional com os agentes de IA (Onboarding / Copilot)',
        security: [{ bearerAuth: [] }],
        body: chatStreamSchema,
      },
    },
    async (request, reply) => {
      const { conversationId, message, context } = request.body;
      const userId = request.user?.sub || 'anonymous';

      const abortController = new AbortController();
      reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
          abortController.abort();
        }
      });

      try {
        const upstreamUrl = `${env.AI_SERVICE_URL}/internal/v1/chat/stream`;
        const upstreamResponse = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': env.INTERNAL_SERVICE_KEY,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            message,
            user_id: userId,
            context: context || {},
          }),
          signal: abortController.signal,
        });

        if (!upstreamResponse.ok) {
          const errText = await upstreamResponse.text().catch(() => '');
          request.log.error(
            { status: upstreamResponse.status, err: errText },
            '[AI Proxy] Upstream error from ai-service'
          );
          return reply.status(upstreamResponse.status).send({
            statusCode: upstreamResponse.status,
            error: 'AI_SERVICE_ERROR',
            message: `Falha no motor de IA: ${upstreamResponse.statusText}`,
          });
        }
        // Configura cabeçalhos CORS e HTTP para SSE (Server-Sent Events)
        const origin = (request.headers.origin as string) || '*';
        reply.raw.setHeader('Access-Control-Allow-Origin', origin);
        reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
        reply.raw.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('X-Accel-Buffering', 'no');
        if (!upstreamResponse.body) {
          reply.raw.end();
          return;
        }

        // Transmissão de chunks linha a linha
        const reader = upstreamResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          reply.raw.write(value);
        }
        reply.raw.end();
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) {
          request.log.info('[AI Proxy] Cliente encerrou a conexão de streaming.');
          return;
        }
        request.log.error({ err }, '[AI Proxy] Falha na transmissão SSE');
        if (!reply.raw.headersSent) {
          return reply.status(502).send({
            statusCode: 502,
            error: 'BAD_GATEWAY',
            message: 'Não foi possível conectar ao motor de IA (ai-service).',
          });
        }
        reply.raw.end();
      }
    }
  );

  // POST /api/v1/ai/chat/resume - Retomada de decisão Human-in-the-Loop
  app.post(
    '/chat/resume',
    {
      schema: {
        tags: ['AI Assistant'],
        summary: 'Retoma execução após interrupção (Human-in-the-Loop)',
        security: [{ bearerAuth: [] }],
        body: chatResumeSchema,
      },
    },
    async (request, reply) => {
      const { conversationId, decision } = request.body;

      const abortController = new AbortController();
      reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
          abortController.abort();
        }
      });

      try {
        const upstreamUrl = `${env.AI_SERVICE_URL}/internal/v1/chat/resume`;
        const upstreamResponse = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': env.INTERNAL_SERVICE_KEY,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            decision,
          }),
          signal: abortController.signal,
        });

        if (!upstreamResponse.ok) {
          const errText = await upstreamResponse.text().catch(() => '');
          return reply.status(upstreamResponse.status).send({
            statusCode: upstreamResponse.status,
            error: 'AI_SERVICE_RESUME_ERROR',
            message: `Falha ao retomar IA: ${errText || upstreamResponse.statusText}`,
          });
        }
        const origin = (request.headers.origin as string) || '*';
        reply.raw.setHeader('Access-Control-Allow-Origin', origin);
        reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
        reply.raw.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('X-Accel-Buffering', 'no');
        if (!upstreamResponse.body) {
          reply.raw.end();
          return;
        }

        const reader = upstreamResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          reply.raw.write(value);
        }
        reply.raw.end();
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) return;
        request.log.error({ err }, '[AI Proxy] Falha ao retomar SSE');
        if (!reply.raw.headersSent) {
          return reply.status(502).send({
            statusCode: 502,
            error: 'BAD_GATEWAY',
            message: 'Erro de comunicação ao retomar motor de IA.',
          });
        }
        reply.raw.end();
      }
    }
  );
};
