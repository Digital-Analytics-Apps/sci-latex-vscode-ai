import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireManagerOrAdmin } from '../../middlewares/rbac.middleware';
import { AcademicPeriodsController } from './academic-periods.controller';

export const academicPeriodsRoutes: FastifyPluginAsyncZod = async (app) => {
  const controller = new AcademicPeriodsController();

  app.addHook('onRequest', verifyJwt);

  // POST /api/v1/academic-periods - Criar Período Acadêmico (Gerente ou Admin)
  app.post(
    '/',
    {
      onRequest: [requireManagerOrAdmin],
      schema: {
        tags: ['AcademicPeriods'],
        summary: 'Criar Ciclo/Período Acadêmico (Gerente ou Admin)',
        description:
          'Cadastra um novo ciclo acadêmico (ex: Ciclo 2026/2027) com data inicial e final.',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
        }),
      },
    },
    controller.create.bind(controller)
  );

  // GET /api/v1/academic-periods - Listar Ciclos Acadêmicos
  app.get(
    '/',
    {
      schema: {
        tags: ['AcademicPeriods'],
        summary: 'Listar Ciclos Acadêmicos',
        description: 'Retorna a lista de todos os períodos acadêmicos cadastrados no sistema.',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.list.bind(controller)
  );
};
