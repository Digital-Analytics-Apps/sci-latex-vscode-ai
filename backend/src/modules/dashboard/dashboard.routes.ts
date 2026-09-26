import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireManagerOrAdmin } from '../../middlewares/rbac.middleware';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

export async function dashboardRoutes(app: FastifyInstance) {
  const dashboardService = new DashboardService();
  const controller = new DashboardController(dashboardService);

  app.addHook('onRequest', verifyJwt);

  // GET /api/v1/dashboard/summary - Métricas consolidadas de KPI adaptadas por Role do Token JWT
  app.get(
    '/summary',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Obter Métricas de KPI do Dashboard por Perfil (JWT Token)',
        description:
          'Retorna as métricas agregadas do banco de dados adaptadas à Role do usuário autenticado no token JWT.',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          projectId: z.string().optional(),
          academicPeriodId: z.string().optional(),
          teamId: z.string().optional(),
        }),
      },
    },
    (req, reply) => controller.getSummary(req, reply)
  );

  // GET /api/v1/dashboard/manager - Dashboard consolidado para Gerente e Admin
  app.get(
    '/manager',
    {
      onRequest: [requireManagerOrAdmin],
      schema: {
        tags: ['Dashboard'],
        summary: 'Obter Dashboard Consolidado do Gerente (MANAGER)',
        description:
          'Retorna métricas de produção científica, status de submissões, DOI, equipes e alertas de prazos filtrados por ciclo acadêmico ou equipe.',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          academicPeriodId: z.string().uuid().optional(),
          teamId: z.string().uuid().optional(),
        }),
      },
    },
    (req, reply) => controller.getManagerDashboard(req, reply)
  );
}
