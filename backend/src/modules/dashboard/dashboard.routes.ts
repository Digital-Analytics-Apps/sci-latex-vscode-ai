import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireManagerOrAdmin } from '../../middlewares/rbac.middleware';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

export async function dashboardRoutes(app: FastifyInstance) {
  const dashboardService = new DashboardService();
  const controller = new DashboardController(dashboardService);

  app.addHook('onRequest', verifyJwt);

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
