import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../../config/env';
import { telemetryBus } from '../../infra/telemetry-bus';
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

      // 1. Notifica a telemetria: Frontend -> Fastify
      telemetryBus.publishTrafficEvent({
        flowType: 'AI_CHAT',
        edgeId: 'e-frontend-backend',
        sourceNodeId: 'client-frontend',
        targetNodeId: 'backend-fastify',
        direction: 'forward',
        description: `Autor enviou mensagem para a Agente Belisa (Conv: ${conversationId.slice(0, 8)}...)`,
        durationMs: 1200,
        particleColor: '#a855f7',
        processingNodeIds: ['backend-fastify'],
      });

      // 2. Fastify -> SciAI Engine (ativa e mantém sciai-engine aceso durante toda a geração de tokens)
      setTimeout(() => {
        telemetryBus.publishTrafficEvent({
          flowType: 'AI_CHAT',
          edgeId: 'e-backend-sciai',
          sourceNodeId: 'backend-fastify',
          targetNodeId: 'sciai-engine',
          direction: 'forward',
          description: 'Fastify despachando prompt para LangGraph no ai-service',
          durationMs: 1400,
          particleColor: '#8b5cf6',
          processingNodeIds: ['sciai-engine'],
        });
      }, 350);

      // 3. SciAI Engine -> Opik LLMOps (registra spans e mantém sciai-engine em processamento)
      setTimeout(() => {
        telemetryBus.publishTrafficEvent({
          flowType: 'AI_CHAT',
          edgeId: 'e-sciai-opik',
          sourceNodeId: 'sciai-engine',
          targetNodeId: 'opik-llmops',
          direction: 'forward',
          description: 'Spans da Agente Belisa registrados no Opik LLMOps',
          durationMs: 1200,
          particleColor: '#d946ef',
          processingNodeIds: ['sciai-engine'],
        });
      }, 800);

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

          telemetryBus.publishTrafficEvent({
            flowType: 'AI_CHAT',
            edgeId: 'e-backend-sciai',
            sourceNodeId: 'sciai-engine',
            targetNodeId: 'backend-fastify',
            direction: 'backward',
            description: `Falha no motor de IA (${upstreamResponse.status})`,
            durationMs: 1400,
            particleColor: '#ef4444',
            processingNodeIds: [],
          });

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

        // 2. Notifica a conclusão do streaming de tokens
        telemetryBus.publishTrafficEvent({
          flowType: 'AI_CHAT',
          edgeId: 'e-backend-sciai',
          sourceNodeId: 'sciai-engine',
          targetNodeId: 'backend-fastify',
          direction: 'backward',
          description: 'SciAI concluiu geração de tokens (stream finalizado)',
          durationMs: 1200,
          particleColor: '#8b5cf6',
          processingNodeIds: ['sciai-engine'],
        });

        setTimeout(() => {
          telemetryBus.publishTrafficEvent({
            flowType: 'AI_CHAT',
            edgeId: 'e-frontend-backend',
            sourceNodeId: 'backend-fastify',
            targetNodeId: 'client-frontend',
            direction: 'backward',
            description: 'Fastify transmitiu resposta de Belisa para a interface',
            durationMs: 1200,
            particleColor: '#a855f7',
            processingNodeIds: [],
          });
        }, 600);
      } catch (err: unknown) {
        telemetryBus.publishTrafficEvent({
          flowType: 'AI_CHAT',
          edgeId: 'e-backend-sciai',
          sourceNodeId: 'sciai-engine',
          targetNodeId: 'backend-fastify',
          direction: 'backward',
          description: 'Exceção ou abort no streaming do SciAI',
          durationMs: 1400,
          particleColor: '#ef4444',
          processingNodeIds: [],
        });

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

      telemetryBus.publishTrafficEvent({
        flowType: 'AI_CHAT',
        edgeId: 'e-backend-sciai',
        sourceNodeId: 'backend-fastify',
        targetNodeId: 'sciai-engine',
        direction: 'forward',
        description: 'Decisão Human-in-the-Loop enviada para retomar fluxo no SciAI',
        durationMs: 1200,
        particleColor: '#8b5cf6',
        processingNodeIds: ['sciai-engine'],
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
          telemetryBus.publishTrafficEvent({
            flowType: 'AI_CHAT',
            edgeId: 'e-backend-sciai',
            sourceNodeId: 'sciai-engine',
            targetNodeId: 'backend-fastify',
            direction: 'backward',
            description: `Erro ao retomar IA (${upstreamResponse.status})`,
            durationMs: 1400,
            particleColor: '#ef4444',
            processingNodeIds: [],
          });
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

        telemetryBus.publishTrafficEvent({
          flowType: 'AI_CHAT',
          edgeId: 'e-backend-sciai',
          sourceNodeId: 'sciai-engine',
          targetNodeId: 'backend-fastify',
          direction: 'backward',
          description: 'SciAI retomou e concluiu execução com sucesso',
          durationMs: 1200,
          particleColor: '#8b5cf6',
          processingNodeIds: ['sciai-engine', 'backend-fastify'],
        });

        setTimeout(() => {
          telemetryBus.publishTrafficEvent({
            flowType: 'AI_CHAT',
            edgeId: 'e-frontend-backend',
            sourceNodeId: 'backend-fastify',
            targetNodeId: 'client-frontend',
            direction: 'backward',
            description: 'Resposta de Belisa entregue ao autor',
            durationMs: 1200,
            particleColor: '#a855f7',
            processingNodeIds: [],
          });
        }, 700);
      } catch (err: unknown) {
        telemetryBus.publishTrafficEvent({
          flowType: 'AI_CHAT',
          edgeId: 'e-backend-sciai',
          sourceNodeId: 'sciai-engine',
          targetNodeId: 'backend-fastify',
          direction: 'backward',
          description: 'Erro na retomada do SciAI',
          durationMs: 1400,
          particleColor: '#ef4444',
          processingNodeIds: [],
        });
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
