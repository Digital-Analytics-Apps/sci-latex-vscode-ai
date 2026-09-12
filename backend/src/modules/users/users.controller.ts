import { FastifyReply, FastifyRequest } from 'fastify';
import { UsersService } from './users.service';
import { z } from 'zod';
import { Role } from '@prisma/client';

export class UsersController {
  constructor(private usersService: UsersService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      search: z.string().optional(),
      role: z.nativeEnum(Role).optional(),
    });

    const { search, role } = querySchema.parse(request.query);
    const users = await this.usersService.searchUsers(search, role);

    return reply.send({ users });
  }
}
