import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthController } from './auth.controller';
import { verifyJwt } from '../../middlewares/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Cadastrar novo usuário',
        description: 'Cria uma nova conta de usuário (Autor, Revisor, Coordenador, Gerente).',
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(6),
          role: z.enum(['AUTHOR', 'REVIEWER', 'COORDINATOR', 'MANAGER', 'ADMIN']).optional(),
        }),
      },
    },
    AuthController.register
  );

  app.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Autenticar usuário (Login)',
        description:
          'Realiza login com e-mail e senha, retornando o accessToken e definindo cookie refreshToken.',
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
      },
    },
    AuthController.login
  );

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Renovar Access Token (Refresh)',
        description:
          'Emite um novo accessToken utilizando o refreshToken gravado no cookie httpOnly.',
      },
    },
    AuthController.refresh
  );

  app.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Encerrar sessão (Logout)',
        description: 'Revoga o refreshToken no banco de dados e limpa o cookie da sessão.',
      },
    },
    AuthController.logout
  );

  app.get(
    '/me',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['Auth'],
        summary: 'Perfil do usuário autenticado',
        description: 'Retorna as informações do usuário baseado no JWT token.',
        security: [{ bearerAuth: [] }],
      },
    },
    AuthController.me
  );
}
