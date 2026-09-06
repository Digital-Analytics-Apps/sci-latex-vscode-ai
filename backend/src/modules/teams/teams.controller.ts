import { FastifyRequest, FastifyReply } from 'fastify';
import { TeamsService } from './teams.service';
import { z } from 'zod';
import { Role } from '@prisma/client';

export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const requesterId = request.user.sub;
    const bodySchema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      coordinatorId: z.string().uuid(),
      managerId: z.string().uuid().optional(),
    });

    const body = bodySchema.parse(request.body);
    const team = await this.teamsService.createTeam(requesterId, body);
    return reply.status(201).send({ team });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      managerId: z.string().uuid().optional(),
    });

    const { managerId } = querySchema.parse(request.query);
    const teams = await this.teamsService.listTeams(managerId);
    return reply.send({ teams });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    try {
      const team = await this.teamsService.getTeamById(id);
      return reply.send({ team });
    } catch (err: any) {
      if (err.message === 'TEAM_NOT_FOUND') {
        return reply.status(404).send({ message: 'Team not found' });
      }
      throw err;
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });
    const bodySchema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      coordinatorId: z.string().uuid().optional(),
      managerId: z.string().uuid().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);
    const requesterId = request.user.sub;

    try {
      const team = await this.teamsService.updateTeam(id, requesterId, body);
      return reply.send({ team });
    } catch (err: any) {
      if (err.message === 'TEAM_NOT_FOUND') {
        return reply.status(404).send({ message: 'Team not found' });
      }
      throw err;
    }
  }

  async addMember(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });
    const bodySchema = z.object({
      userId: z.string().uuid(),
      role: z.enum(['AUTHOR', 'REVIEWER', 'COORDINATOR']),
    });

    const { id } = paramsSchema.parse(request.params);
    const { userId, role } = bodySchema.parse(request.body);
    const requesterId = request.user.sub;

    try {
      await this.teamsService.addMember(id, userId, role as Role, requesterId);
      return reply.status(201).send({ message: 'Membro adicionado à equipe com sucesso.' });
    } catch (err: any) {
      if (err.message === 'TEAM_NOT_FOUND') {
        return reply.status(404).send({ message: 'Team not found' });
      }
      throw err;
    }
  }

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
    });

    const { id, userId } = paramsSchema.parse(request.params);
    const requesterId = request.user.sub;

    try {
      await this.teamsService.removeMember(id, userId, requesterId);
      return reply.status(200).send({ message: 'Membro removido da equipe com sucesso.' });
    } catch (err: any) {
      if (err.message === 'TEAM_NOT_FOUND') {
        return reply.status(404).send({ message: 'Team not found' });
      }
      throw err;
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);
    const requesterId = request.user.sub;

    try {
      await this.teamsService.deleteTeam(id, requesterId);
      return reply.status(204).send();
    } catch (err: any) {
      if (err.message === 'TEAM_NOT_FOUND') {
        return reply.status(404).send({ message: 'Team not found' });
      }
      throw err;
    }
  }
}
