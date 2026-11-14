import { FastifyPluginAsync } from 'fastify';
import client, { Counter, Histogram, Gauge } from '@prometheus-io/client';
import { getLiveWebSocketStats } from '../../modules/documents/documents.websocket';
import { defaultDocumentsService } from '../../modules/documents/documents.service';

// Habilita métricas padrões de sistema e processo (CPU, memória, event loop lag, GC)
client.collectDefaultMetrics({
  prefix: 'scia_backend_',
});

// 1. Métricas HTTP
export const httpRequestsTotal = new Counter({
  name: 'scia_backend_http_requests_total',
  help: 'Contador total de requisições HTTP recebidas pelo backend Fastify',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'scia_backend_http_request_duration_seconds',
  help: 'Histograma de duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// 2. Métricas de Colaboração em Tempo Real (WebSocket / OT / RAM)
export const collabActiveRoomsGauge = new Gauge({
  name: 'scia_backend_collab_active_rooms',
  help: 'Contagem de salas ativas de edição colaborativa em tempo real',
  collect() {
    try {
      const stats = getLiveWebSocketStats();
      this.set(stats.activeRoomsCount);
    } catch {
      // Ignora erro em fase de inicialização
    }
  },
});

export const collabConnectedSocketsGauge = new Gauge({
  name: 'scia_backend_collab_connected_sockets',
  help: 'Contagem de clientes WebSocket conectados no pod',
  collect() {
    try {
      const stats = getLiveWebSocketStats();
      this.set(stats.connectedSocketsCount);
    } catch {
      // Ignora erro em fase de inicialização
    }
  },
});

export const collabPendingCheckpointsGauge = new Gauge({
  name: 'scia_backend_collab_pending_checkpoints',
  help: 'Documentos ativos na RAM com alterações pendentes de flush no PostgreSQL',
  collect() {
    try {
      const memStats = defaultDocumentsService.getMemoryStats();
      this.set(memStats.pendingCheckpointsCount);
    } catch {
      // Ignora erro em fase de inicialização
    }
  },
});

export const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  // Hook de contagem e temporização de requisições HTTP
  fastify.addHook('onRequest', async (request) => {
    (request.raw as { __startTime?: [number, number] }).__startTime = process.hrtime();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request.raw as { __startTime?: [number, number] }).__startTime;
    if (!startTime) return;

    const diff = process.hrtime(startTime);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    // Normaliza rotas para não explodir cardinalidade de IDs dinâmicos
    const route = request.routeOptions?.url || request.routerPath || 'unmatched';
    const method = request.method;
    const statusCode = reply.statusCode ? String(reply.statusCode) : 'unknown';

    // Evita poluir métricas com o próprio scraping do Prometheus
    if (route === '/metrics') return;

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, durationSeconds);
  });

  // Endpoint oficial para scraping do Prometheus
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', client.register.contentType);
    return client.register.metrics();
  });
};
