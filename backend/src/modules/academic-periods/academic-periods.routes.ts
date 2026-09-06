import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireManagerOrAdmin } from '../../middlewares/rbac.middleware';
import { prisma } from '../../db/prisma';

export async function academicPeriodsRoutes(app: FastifyInstance) {
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
    async (req, reply) => {
      const body = req.body as any;
      const period = await prisma.academicPeriod.create({
        data: {
          name: body.name,
          startDate: body.startDate,
          endDate: body.endDate,
        },
      });
      return reply.status(201).send({ academicPeriod: period });
    }
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
    async (req, reply) => {
      const periods = await prisma.academicPeriod.findMany({
        orderBy: { startDate: 'desc' },
      });
      return reply.send({ academicPeriods: periods });
    }
  );
}
