import { FastifyReply, FastifyRequest } from 'fastify';
import { AcademicPeriodsService } from './academic-periods.service';

export class AcademicPeriodsController {
  constructor(private service: AcademicPeriodsService = new AcademicPeriodsService()) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as { name: string; startDate: Date; endDate: Date };
    const period = await this.service.createPeriod({
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
    return reply.status(201).send({ academicPeriod: period });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const periods = await this.service.listPeriods();
    return reply.send({ academicPeriods: periods });
  }
}
