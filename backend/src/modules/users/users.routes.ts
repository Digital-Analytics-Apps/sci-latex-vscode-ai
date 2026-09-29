import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaUsersRepository } from '../../repositories/users.repository';

export async function usersRoutes(app: FastifyInstance) {
  const usersRepository = new PrismaUsersRepository();
  const usersService = new UsersService(usersRepository);
  const usersController = new UsersController(usersService);

  app.addHook('onRequest', verifyJwt);

  app.get(
    '/',
    {
      schema: {
        tags: ['Users'],
        summary: 'Listar e filtrar pesquisadores / membros',
        description:
          'Retorna a lista de usuários cadastrados filtrados por busca, papel (Role) ou equipe.',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          search: z.string().optional(),
          role: z.nativeEnum(Role).optional(),
          teamId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      return usersController.list(request, reply);
    }
  );
}
