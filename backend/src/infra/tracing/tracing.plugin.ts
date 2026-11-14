import { randomBytes } from 'crypto';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    spanId: string;
    traceparent: string;
  }
}

const tracingPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const incomingTraceparent = request.headers['traceparent'] as string | undefined;

    let traceId: string;

    if (incomingTraceparent && incomingTraceparent.startsWith('00-')) {
      const parts = incomingTraceparent.split('-');
      if (parts.length >= 4 && parts[1].length === 32) {
        traceId = parts[1];
      } else {
        traceId = randomBytes(16).toString('hex');
      }
    } else {
      traceId = randomBytes(16).toString('hex');
    }

    const currentSpanId = randomBytes(8).toString('hex');
    const outgoingTraceparent = `00-${traceId}-${currentSpanId}-01`;

    request.traceId = traceId;
    request.spanId = currentSpanId;
    request.traceparent = outgoingTraceparent;

    reply.header('traceparent', outgoingTraceparent);
    reply.header('x-trace-id', traceId);
  });

  fastify.addHook('onSend', async (request, reply) => {
    if (request.traceparent) {
      reply.header('traceparent', request.traceparent);
    }
    if (request.traceId) {
      reply.header('x-trace-id', request.traceId);
    }
  });
};

export const tracingPlugin = fp(tracingPluginAsync, {
  name: 'scia-tracing-plugin',
  fastify: '4.x',
});
