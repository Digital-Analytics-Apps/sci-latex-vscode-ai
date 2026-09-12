import { FastifyReply, FastifyRequest } from 'fastify';
import { DashboardService } from './dashboard.service';
import { z } from 'zod';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

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
