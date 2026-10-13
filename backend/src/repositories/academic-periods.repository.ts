import { AcademicPeriod, PeriodStatus, TeamAcademicGoal } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateAcademicPeriodData {
  name: string;
  startDate: Date;
  endDate: Date;
  targetArticlesCount?: number;
  status?: PeriodStatus;
  managerId?: string;
}

export interface SetTeamGoalData {
  academicPeriodId: string;
  teamId: string;
  targetArticles: number;
}

export interface IAcademicPeriodsRepository {
  create(data: CreateAcademicPeriodData): Promise<AcademicPeriod>;
  findAll(managerId?: string): Promise<AcademicPeriod[]>;
  findById(id: string): Promise<AcademicPeriod | null>;
  setTeamGoal(data: SetTeamGoalData): Promise<TeamAcademicGoal>;
  getTeamGoals(academicPeriodId: string): Promise<TeamAcademicGoal[]>;
}

export class PrismaAcademicPeriodsRepository implements IAcademicPeriodsRepository {
  async create(data: CreateAcademicPeriodData): Promise<AcademicPeriod> {
    return prisma.academicPeriod.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        targetArticlesCount: data.targetArticlesCount ?? 0,
        status: data.status ?? PeriodStatus.ACTIVE,
        managerId: data.managerId,
      },
    });
  }

  async findAll(managerId?: string): Promise<AcademicPeriod[]> {
    return prisma.academicPeriod.findMany({
      where: managerId ? { managerId } : undefined,
      include: {
        teamGoals: {
          include: {
            team: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string): Promise<AcademicPeriod | null> {
    return prisma.academicPeriod.findUnique({
      where: { id },
      include: {
        teamGoals: {
          include: {
            team: true,
          },
        },
        projects: true,
      },
    });
  }

  async setTeamGoal(data: SetTeamGoalData): Promise<TeamAcademicGoal> {
    return prisma.teamAcademicGoal.upsert({
      where: {
        academicPeriodId_teamId: {
          academicPeriodId: data.academicPeriodId,
          teamId: data.teamId,
        },
      },
      create: {
        academicPeriodId: data.academicPeriodId,
        teamId: data.teamId,
        targetArticles: data.targetArticles,
      },
      update: {
        targetArticles: data.targetArticles,
      },
    });
  }

  async getTeamGoals(academicPeriodId: string): Promise<TeamAcademicGoal[]> {
    return prisma.teamAcademicGoal.findMany({
      where: { academicPeriodId },
      include: {
        team: true,
      },
    });
  }
}
