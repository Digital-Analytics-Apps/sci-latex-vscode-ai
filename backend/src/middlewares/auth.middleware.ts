import { FastifyReply, FastifyRequest } from 'fastify';
import { Role } from '@prisma/client';
import { env } from '../config/env';
export interface UserPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

// Middleware de verificação de autenticação JWT e chave de serviço M2M (ADR-006)
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Suporte a autenticação M2M entre microsserviços via X-Internal-Service-Key (ADR-006)
    const internalKey = request.headers['x-internal-service-key'];
    if (internalKey && internalKey === env.INTERNAL_SERVICE_KEY) {
      request.user = {
        sub: 'internal-service',
        email: 'internal@scia.system',
        name: 'Internal SciAI Service',
        role: Role.ADMIN,
      };
      return;
    }

    if (!request.headers.authorization) {
      const token = request.cookies?.accessToken || (request.query as { token?: string })?.token;
      if (token) {
        request.headers.authorization = `Bearer ${token}`;
      }
    }
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired access token',
    });
  }
}

// Middleware de autorização por Role (RBAC)
export function verifyRole(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || !allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
    }
  };
}
