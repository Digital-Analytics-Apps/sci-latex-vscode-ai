import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PeriodStatus } from '@prisma/client';
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
        description: 'Cadastra um novo ciclo acadêmico com meta global de artigos e vigência.',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
          targetArticlesCount: z.number().int().nonnegative().optional().default(0),
          status: z.nativeEnum(PeriodStatus).optional().default(PeriodStatus.ACTIVE),
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
        description: 'Retorna a lista de períodos acadêmicos cadastrados no sistema.',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          managerId: z.string().optional(),
        }),
      },
    },
    controller.list.bind(controller)
  );

  // GET /api/v1/academic-periods/:id - Obter Detalhes do Período Acadêmico
  app.get(
    '/:id',
    {
      schema: {
        tags: ['AcademicPeriods'],
        summary: 'Obter Período Acadêmico por ID',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    controller.getById.bind(controller)
  );

};
