import { FastifyInstance } from 'fastify';
import { verifyJwt } from '../../../middlewares/auth.middleware';
import { requireAdmin } from '../../../middlewares/rbac.middleware';
import { AiopsController } from './aiops.controller';
import {
  AiopsActionExecutionRequestSchema,
  AiopsActionExecutionResponseSchema,
  AiopsChatHistoryQuerySchema,
  AiopsChatHistoryResponseSchema,
  AiopsChatSendRequestSchema,
  AiopsIncidentDetailResponseSchema,
  AiopsIncidentListQuerySchema,
  AiopsIncidentListResponseSchema,
  AiopsRcaReportResponseSchema,
} from './aiops.schemas';

export async function aiopsRoutes(app: FastifyInstance) {
  const controller = new AiopsController();

  // Guarda estrita: Apenas usuários autenticados com Role.ADMIN podem acessar qualquer rota de AIOps
  app.addHook('onRequest', verifyJwt);
  app.addHook('onRequest', requireAdmin);

  // 1. Listar Incidentes Registrados pelo Coletor
  app.get(
    '/incidents',
    {
      schema: {
        tags: ['AIOps Copilot'],
        summary: 'Listar incidentes de observabilidade',
        description: 'Retorna a lista paginada de incidentes com filtro por severidade e status.',
        security: [{ bearerAuth: [] }],
        querystring: AiopsIncidentListQuerySchema,
        response: {
          200: AiopsIncidentListResponseSchema,
        },
      },
    },
    (req, reply) => controller.listIncidents(req as any, reply)
  );

  // 2. Detalhes do Incidente e Laudos de RCA
  app.get(
    '/incidents/:id',
    {
      schema: {
        tags: ['AIOps Copilot'],
        summary: 'Obter detalhes e RCA de um incidente',
        description: 'Retorna o incidente e todos os relatórios de Causa-Raiz gerados.',
        security: [{ bearerAuth: [] }],
        response: {
          200: AiopsIncidentDetailResponseSchema,
        },
      },
    },
    (req, reply) => controller.getIncident(req as any, reply)
  );

  // 3. Disparar Diagnóstico de Causa-Raiz (RCA) sob demanda
  app.post(
    '/incidents/:id/diagnose',
    {
      schema: {
        tags: ['AIOps Copilot'],
        summary: 'Disparar diagnóstico de Causa-Raiz com MCP',
        description:
          'Executa consultas ativas no K8s, Prometheus, Loki e GlitchTip e gera o laudo de RCA categorizado.',
        security: [{ bearerAuth: [] }],
        response: {
          200: AiopsRcaReportResponseSchema,
        },
      },
    },
    (req, reply) => controller.runDiagnosis(req as any, reply)
  );

  // 4. Histórico de Mensagens Conversacionais
  app.get(
    '/chat/messages',
    {
      schema: {
        tags: ['AIOps Copilot'],
        summary: 'Obter histórico de mensagens do chat',
        description: 'Retorna as mensagens persistidas da conversa com o agente de AIOps.',
        security: [{ bearerAuth: [] }],
        querystring: AiopsChatHistoryQuerySchema,
        response: {
          200: AiopsChatHistoryResponseSchema,
        },
      },
    },
    (req, reply) => controller.getChatHistory(req as any, reply)
  );

  // 5. Interação Conversacional com o Agente AIOps
  app.post(
    '/chat',
    {
      schema: {
        tags: ['AIOps Copilot'],
        summary: 'Conversar com o Agente de AIOps',
        description: 'Permite ao administrador tirar dúvidas operacionais e obter laudos técnicos.',
        security: [{ bearerAuth: [] }],
        body: AiopsChatSendRequestSchema,
      },
    },
    (req, reply) => controller.chat(req as any, reply)
  );

  // 5. Streaming SSE para Chat Interativo
  app.post(
    '/chat/stream',
    {
      schema: {
        tags: ['AIOps Copilot'],
        summary: 'Streaming SSE da conversa com o Agente de AIOps',
        description: 'Canal Server-Sent Events com streaming de pensamento e resposta.',
        security: [{ bearerAuth: [] }],
        body: AiopsChatSendRequestSchema,
      },
    },
    (req, reply) => controller.streamChat(req as any, reply)
  );

  // 6. Execução de Remediação com Human-in-the-Loop
  app.post(
    '/actions/execute',
    {
      schema: {
        tags: ['AIOps Copilot'],
        summary: 'Aprovar e executar ação de remediação',
        description:
          'Executa a ação confirmada pelo administrador humano com auditoria imutável na Allowlist.',
        security: [{ bearerAuth: [] }],
        body: AiopsActionExecutionRequestSchema,
        response: {
          200: AiopsActionExecutionResponseSchema,
        },
      },
    },
    (req, reply) => controller.executeAction(req as any, reply)
  );
}
