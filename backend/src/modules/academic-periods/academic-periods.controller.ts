import { PeriodStatus, Role } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AcademicPeriodsService } from './academic-periods.service';

export const createAcademicPeriodSchema = z.object({
  name: z.string().min(2),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  targetArticlesCount: z.number().int().nonnegative().optional().default(0),
  status: z.nativeEnum(PeriodStatus).optional().default(PeriodStatus.ACTIVE),
});

export const listAcademicPeriodsQuerySchema = z.object({
  managerId: z.string().optional(),
});

export const academicPeriodParamsSchema = z.object({
  id: z.string(),
});

export const setTeamGoalSchema = z.object({
  teamId: z.string(),
  targetArticles: z.number().int().nonnegative(),
});

export class AcademicPeriodsController {
  constructor(private readonly service: AcademicPeriodsService = new AcademicPeriodsService()) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const body = createAcademicPeriodSchema.parse(request.body);

    const period = await this.service.createPeriod({
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      targetArticlesCount: body.targetArticlesCount ?? 0,
      status: body.status || 'ACTIVE',
      managerId: user?.sub,
    });

    return reply.status(201).send({ academicPeriod: period });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const query = listAcademicPeriodsQuerySchema.parse(request.query || {});
    const managerId = query.managerId || (user?.role === Role.MANAGER ? user?.sub : undefined);

    const periods = await this.service.listPeriods(managerId);
    return reply.send({ academicPeriods: periods });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = academicPeriodParamsSchema.parse(request.params);
    const period = await this.service.getPeriodById(id);
    if (!period) {
      return reply.status(404).send({ message: 'Período acadêmico não encontrado.' });
    }
    return reply.send({ academicPeriod: period });
  }

  async setTeamGoal(request: FastifyRequest, reply: FastifyReply) {
    const { id } = academicPeriodParamsSchema.parse(request.params);
    const body = setTeamGoalSchema.parse(request.body);

    const goal = await this.service.setTeamGoal({
      academicPeriodId: id,
      teamId: body.teamId,
      targetArticles: body.targetArticles,
    });

    return reply.status(200).send({ teamGoal: goal });
  }

  async getTeamGoals(request: FastifyRequest, reply: FastifyReply) {
    const { id } = academicPeriodParamsSchema.parse(request.params);
    const goals = await this.service.getTeamGoals(id);
    return reply.send({ teamGoals: goals });
  }
}
