import { prisma } from '../db/prisma';

export interface LogAuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
}

export async function logAudit(data: LogAuditParams) {
  try {
    let validUserId = data.userId;
    if (validUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: validUserId },
        select: { id: true },
      });
      if (!userExists) {
        validUserId = undefined;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details,
      },
    });
  } catch (err) {
    console.warn('⚠️ Could not record AuditLog:', err);
  }
}
