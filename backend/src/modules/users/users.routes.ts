import { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaUsersRepository } from '../../repositories/users.repository';

export async function usersRoutes(app: FastifyInstance) {
  const usersRepository = new PrismaUsersRepository();
  const usersService = new UsersService(usersRepository);
  const usersController = new UsersController(usersService);

  app.get('/', async (request, reply) => {
    return usersController.list(request, reply);
  });
}
