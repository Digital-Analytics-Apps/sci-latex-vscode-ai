import { prisma } from '../../db/prisma';
import { deadlineService } from '../deadlines/deadlines.service';

export interface DashboardFilterDTO {
  academicPeriodId?: string;
  teamId?: string;
}

export class DashboardService {
  async getManagerDashboard(filters?: DashboardFilterDTO) {
    const where: any = {};

    if (filters?.academicPeriodId) {
      where.academicPeriodId = filters.academicPeriodId;
    }

    if (filters?.teamId) {
      where.teamId = filters.teamId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        team: {
          include: {
            coordinator: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        academicPeriod: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        tasks: true,
        prs: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    let publishedProjects = 0;
    let inReviewProjects = 0;
    let submittedProjects = 0;
    let rejectedProjects = 0;

    let onTimeCount = 0;
    let warningSoonCount = 0;
    let overdueCount = 0;

    const teamSummaryMap = new Map<string, any>();

    for (const proj of projects) {
      // 1. Status de Submissão
      if (
        proj.submissionStatus === 'COMPLETED_PUBLISHED' ||
        proj.submissionStatus === 'ACCEPTED_CAMERA_READY' ||
        proj.doi
      ) {
        publishedProjects++;
      } else if (
        proj.submissionStatus === 'SUBMITTED_TARGET' ||
        proj.submissionStatus === 'SUBMITTED_BACKUP'
      ) {
        submittedProjects++;
      } else if (proj.submissionStatus === 'REJECTED_WAITING_DECISION') {
        rejectedProjects++;
      } else {
        inReviewProjects++;
      }

      // 2. Cálculo de Status de Prazo
      const deadlineStatus = deadlineService.calculateStatus(proj.targetConferenceDate);
      if (deadlineStatus === 'OVERDUE') overdueCount++;
      else if (deadlineStatus === 'WARNING_SOON') warningSoonCount++;
      else onTimeCount++;

      // 3. Agrupamento por Equipe / Coordenador
      const teamId = proj.teamId;
      if (!teamSummaryMap.has(teamId)) {
        teamSummaryMap.set(teamId, {
          teamId,
          teamName: proj.team.name,
          coordinator: proj.team.coordinator,
          totalProjects: 0,
          publishedCount: 0,
        });
      }
      const teamEntry = teamSummaryMap.get(teamId);
      teamEntry.totalProjects++;
      if (proj.doi || proj.submissionStatus === 'COMPLETED_PUBLISHED') {
        teamEntry.publishedCount++;
      }
    }

    // 4. Últimas 10 atividades recentes no AuditLog
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      overview: {
        totalProjects: projects.length,
        publishedProjects,
        inReviewProjects,
        submittedProjects,
        rejectedProjects,
      },
      deadlines: {
        onTimeCount,
        warningSoonCount,
        overdueCount,
      },
      teams: Array.from(teamSummaryMap.values()),
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        timestamp: log.createdAt,
        user: log.user ? { name: log.user.name, email: log.user.email } : null,
        details: log.details,
      })),
    };
  }
}
