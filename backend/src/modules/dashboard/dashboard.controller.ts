import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      projectId: z.string().optional(),
      academicPeriodId: z.string().optional(),
      teamId: z.string().optional(),
    });

    const filters = querySchema.parse(request.query);
    const user = request.user;

    const data = await this.dashboardService.getSummary(user.sub, user.role, filters);

    return reply.send(data);
  }

  async getManagerDashboard(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      academicPeriodId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional(),
    });

    const { academicPeriodId, teamId } = querySchema.parse(request.query);
    const data = await this.dashboardService.getManagerDashboard({
      academicPeriodId,
      teamId,
    });

    return reply.send(data);
  }
}
