import { FastifyReply, FastifyRequest } from 'fastify';
import { Role } from '@prisma/client';

export function rbacGuard(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || !allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Acesso negado: Você não possui a permissão necessária para esta ação.',
      });
    }
  };
}

// Atalhos de permissão conforme a Matriz RBAC oficial
export const requireAdmin = rbacGuard([Role.ADMIN]);
export const requireManagerOrAdmin = rbacGuard([Role.MANAGER, Role.ADMIN]);
export const requireCoordinatorOrAbove = rbacGuard([Role.COORDINATOR, Role.MANAGER, Role.ADMIN]);
