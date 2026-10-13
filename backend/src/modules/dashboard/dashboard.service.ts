import { NITStatus, Prisma, PRStatus, Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { deadlineService } from '../../utils/deadlines';

export interface DashboardFilterDTO {
  projectId?: string;
  academicPeriodId?: string;
  teamId?: string;
}

export class DashboardService {
  async getSummary(userId: string, role: Role, filters?: DashboardFilterDTO) {
    switch (role) {
      case Role.REVIEWER:
        return {
          role,
          metrics: await this.getReviewerMetrics(filters?.projectId),
        };
      case Role.COORDINATOR:
        return {
          role,
          metrics: await this.getCoordinatorMetrics(userId, filters?.teamId, filters?.projectId),
        };
      case Role.MANAGER:
      case Role.ADMIN:
        return {
          role,
          metrics: await this.getManagerDashboard(filters),
        };
      case Role.AUTHOR:
      default:
        return {
          role,
          metrics: await this.getAuthorMetrics(userId, filters?.projectId),
        };
    }
  }

  async getReviewerMetrics(projectId?: string) {
    const where: Prisma.PullRequestWhereInput = {};
    if (projectId && projectId !== 'all') {
      where.projectId = projectId;
    }

    const [pendingReview, waitingNIT, approved, changesRequested, total] = await Promise.all([
      prisma.pullRequest.count({ where: { ...where, status: PRStatus.UNDER_REVIEW } }),
      prisma.pullRequest.count({ where: { ...where, nitStatus: NITStatus.WAITING_NIT } }),
      prisma.pullRequest.count({ where: { ...where, status: PRStatus.APPROVED } }),
      prisma.pullRequest.count({ where: { ...where, status: PRStatus.CHANGES_REQUESTED } }),
      prisma.pullRequest.count({ where }),
    ]);

    return {
      pendingReview,
      waitingNIT,
      approved,
      changesRequested,
      total,
    };
  }

  async getCoordinatorMetrics(userId: string, teamId?: string, projectId?: string) {
    const where: Prisma.TaskWhereInput = {};
    if (projectId && projectId !== 'all') {
      where.projectId = projectId;
    }
    if (teamId) {
      where.project = { teamId };
    }

    const tasks = await prisma.task.findMany({
      where,
      select: { dueDate: true, status: true },
    });

    let onTimeCount = 0;
    let warningSoonCount = 0;
    let overdueCount = 0;

    for (const task of tasks) {
      if (!task.dueDate) {
        onTimeCount++;
        continue;
      }
      const status = deadlineService.calculateStatus(task.dueDate);
      if (status === 'OVERDUE') overdueCount++;
      else if (status === 'WARNING_SOON') warningSoonCount++;
      else onTimeCount++;
    }

    return {
      onTimeTasks: onTimeCount,
      warningSoonTasks: warningSoonCount,
      overdueTasks: overdueCount,
      totalTasks: tasks.length,
    };
  }

  async getAuthorMetrics(userId: string, projectId?: string) {
    const where: Prisma.TaskWhereInput = { assignedToId: userId };
    if (projectId && projectId !== 'all') {
      where.projectId = projectId;
    }

    const [activeArticlesCount, totalTasks, inProgressTasks, completedTasks] = await Promise.all([
      prisma.project.count({
        where: {
          members: { some: { userId } },
        },
      }),
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...where, status: 'MERGED' } }),
    ]);

    return {
      activeArticles: activeArticlesCount,
      totalTasks,
      inProgressTasks,
      completedTasks,
    };
  }
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
