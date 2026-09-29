import { Role } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { UsersService } from './users.service';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      search: z.string().optional(),
      role: z.nativeEnum(Role).optional(),
      teamId: z.string().uuid().optional(),
    });

    const { search, role, teamId } = querySchema.parse(request.query);
    const users = await this.usersService.searchUsers(search, role, teamId);

    return reply.send({ users });
  }
}
