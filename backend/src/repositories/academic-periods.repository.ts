import { AcademicPeriod, PeriodStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateAcademicPeriodData {
  name: string;
  startDate: Date;
  endDate: Date;
  targetArticlesCount?: number;
  status?: PeriodStatus;
  managerId?: string;
}


export interface IAcademicPeriodsRepository {
  create(data: CreateAcademicPeriodData): Promise<AcademicPeriod>;
  findAll(managerId?: string): Promise<AcademicPeriod[]>;
  findById(id: string): Promise<AcademicPeriod | null>;
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
        projects: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string): Promise<AcademicPeriod | null> {
    return prisma.academicPeriod.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });
  }

}
