import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';

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

// Middleware de verificação de autenticação JWT
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Permite autenticação via ?token=... (necessário para SSE EventSource e Iframes do VS Code)
    const queryToken = (request.query as any)?.token;
    if (queryToken && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${queryToken}`;
    }

    await request.jwtVerify();
  } catch (err) {
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
