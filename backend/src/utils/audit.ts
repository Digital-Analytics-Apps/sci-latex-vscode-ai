import { prisma } from '../db/prisma';

export type AuditEntityType =
  'Project' | 'Team' | 'User' | 'PullRequest' | 'Section' | 'AcademicPeriod' | (string & {});

export type AuditAction =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DATES_UPDATED'
  | 'PROJECT_DELETED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'TEAM_CREATED'
  | 'TEAM_UPDATED'
  | 'TEAM_DELETED'
  | 'TEAM_MEMBER_ADDED'
  | 'TEAM_MEMBER_REMOVED'
  | 'PR_CREATED'
  | 'PR_APPROVED'
  | 'PR_CHANGES_REQUESTED'
  | 'PR_MERGED'
  | 'NIT_STATUS_UPDATED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | (string & {});

export interface LogAuditParams {
  userId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  details?: Record<string, any>;
}

export async function logAudit(data: LogAuditParams) {
  try {
    let validUserId = data.userId;
    let actorSnapshot = undefined;

    if (validUserId) {
      const user = await prisma.user.findUnique({
        where: { id: validUserId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (user) {
        validUserId = user.id;
        actorSnapshot = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      } else {
        validUserId = undefined;
      }
    }

    const enrichedDetails = {
      ...(data.details || {}),
      _actor: actorSnapshot || { id: data.userId || 'SYSTEM', name: 'System' },
    };

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: enrichedDetails,
      },
    });
  } catch (err) {
    console.warn('⚠️ Could not record AuditLog:', err);
  }
}
