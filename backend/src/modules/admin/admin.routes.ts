import { FastifyInstance } from 'fastify';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { AdminController } from './admin.controller';
import {
  AdminOverviewResponseSchema,
  AdminWorkflowResponseSchema,
  AdminInfrastructureResponseSchema,
  AdminCollaborationResponseSchema,
  AdminActivityResponseSchema,
} from './admin.schemas';

export async function adminRoutes(app: FastifyInstance) {
  const controller = new AdminController();

  // Guarda estrita: Apenas usuários autenticados com Role.ADMIN podem acessar qualquer rota deste módulo
  app.addHook('onRequest', verifyJwt);
  app.addHook('onRequest', requireAdmin);

  // 1. Visão Geral Executiva
  app.get(
    '/dashboard/overview',
    {
      schema: {
        tags: ['Admin Center'],
        summary: 'Obter Visão Geral da Plataforma',
        description: 'Retorna status operacional, usuários ativos, WebSockets, contagem de erros e atividade por hora.',
        security: [{ bearerAuth: [] }],
        response: {
          200: AdminOverviewResponseSchema,
        },
      },
    },
    (req, reply) => controller.getOverview(req, reply)
  );

  // 2. Fluxo Científico (6 Etapas e NIT)
  app.get(
    '/dashboard/workflow',
    {
      schema: {
        tags: ['Admin Center'],
        summary: 'Obter Funil de Produção Científica e Gargalos',
        description: 'Retorna a distribuição dos artigos nas 6 etapas canônicas, projetos atrasados e pendências do NIT.',
        security: [{ bearerAuth: [] }],
        response: {
          200: AdminWorkflowResponseSchema,
        },
      },
    },
    (req, reply) => controller.getWorkflow(req, reply)
  );

  // 3. Monitoramento de Infraestrutura
  app.get(
    '/dashboard/infrastructure',
    {
      schema: {
        tags: ['Admin Center'],
        summary: 'Obter Saúde e Telemetria dos Microsserviços',
        description: 'Retorna a matriz de conectividade dos 5 serviços, latências, custos/tokens Opik e status do banco.',
        security: [{ bearerAuth: [] }],
        response: {
          200: AdminInfrastructureResponseSchema,
        },
      },
    },
    (req, reply) => controller.getInfrastructure(req, reply)
  );

  // 4. Colaboração em Tempo Real
  app.get(
    '/dashboard/collaboration',
    {
      schema: {
        tags: ['Admin Center'],
        summary: 'Obter Métricas do Motor de Colaboração em Tempo Real',
        description: 'Retorna documentos ativos em memória, distribuição por Pod dono, taxa OT/s e checkpoints pendentes.',
        security: [{ bearerAuth: [] }],
        response: {
          200: AdminCollaborationResponseSchema,
        },
      },
    },
    (req, reply) => controller.getCollaboration(req, reply)
  );

  // 5. Atividade e Auditoria Institucional
  app.get(
    '/dashboard/activity',
    {
      schema: {
        tags: ['Admin Center'],
        summary: 'Obter Linha do Tempo de Atividades e Auditoria',
        description: 'Retorna os últimos eventos críticos registrados na tabela AuditLog.',
        security: [{ bearerAuth: [] }],
        response: {
          200: AdminActivityResponseSchema,
        },
      },
    },
    (req, reply) => controller.getActivity(req, reply)
  );

  // 6. Canal em Tempo Real Server-Sent Events (SSE)
  app.get(
    '/dashboard/events',
    {
      schema: {
        tags: ['Admin Center'],
        summary: 'Canal SSE de Eventos Administrativos em Tempo Real',
        description: 'Transmite atualizações periódicas e eventos do sistema sem necessidade de polling.',
        security: [{ bearerAuth: [] }],
      },
    },
    (req, reply) => controller.getEventsStream(req, reply)
  );
}
