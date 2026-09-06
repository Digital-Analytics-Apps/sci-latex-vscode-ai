import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { verifyJwt } from '../../middlewares/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', AuthController.register);
  app.post('/login', AuthController.login);
  app.post('/refresh', AuthController.refresh);
  app.post('/logout', AuthController.logout);

  // Rota protegida por JWT
  app.get('/me', { onRequest: [verifyJwt] }, AuthController.me);
}
