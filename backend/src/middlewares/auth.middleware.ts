import { FastifyReply, FastifyRequest } from 'fastify';
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

// Middleware de verificação de autenticação JWT (Enforces Authorization Bearer Header)
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.headers.authorization) {
      const token = request.cookies?.accessToken || (request.query as any)?.token;
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
