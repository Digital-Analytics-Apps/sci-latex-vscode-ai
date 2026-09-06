import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaUsersRepository } from '../../repositories/users.repository';
import { PrismaSessionsRepository } from '../../repositories/sessions.repository';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role).optional().default(Role.AUTHOR),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Instanciação das dependências seguindo o princípio da Inversão de Dependência (SOLID)
const usersRepository = new PrismaUsersRepository();
const sessionsRepository = new PrismaSessionsRepository();
const authService = new AuthService(usersRepository, sessionsRepository);

export class AuthController {
  // POST /api/v1/auth/register
  static async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const user = await authService.register(data);
      return reply.status(201).send({ user });
    } catch (err: any) {
      if (err.message === 'USER_ALREADY_EXISTS') {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'User with this email already exists',
        });
      }
      throw err;
    }
  }

  // POST /api/v1/auth/login
  static async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);
      const { user, refreshToken, expiresAt } = await authService.login(data);

      // Gera o Access Token JWT (15min)
      const accessToken = request.server.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        { expiresIn: '15m' }
      );

      // Envia o Refresh Token e Access Token nos Cookies HTTP-Only
      reply.setCookie('refreshToken', refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
      });

      reply.setCookie('accessToken', accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 minutos
      });

      return reply.send({
        accessToken,
        user,
      });
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }
      throw err;
    }
  }

  // POST /api/v1/auth/refresh
  static async refresh(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token cookie missing',
      });
    }

    try {
      const user = await authService.refresh(refreshToken);
      const accessToken = request.server.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        { expiresIn: '15m' }
      );

      reply.setCookie('accessToken', accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
      });

      return reply.send({
        accessToken,
        user,
      });
    } catch (err: any) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token expired or invalid',
      });
    }
  }

  // POST /api/v1/auth/logout
  static async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    reply.clearCookie('refreshToken', { path: '/' });
    reply.clearCookie('accessToken', { path: '/' });
    return reply.send({ message: 'Logged out successfully' });
  }

  // GET /api/v1/auth/me
  static async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user.sub;
      const user = await authService.getProfile(userId);
      return reply.send({ user });
    } catch (err: any) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }
  }
}
