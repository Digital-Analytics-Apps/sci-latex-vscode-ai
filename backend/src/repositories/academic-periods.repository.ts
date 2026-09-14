import { AcademicPeriod } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateAcademicPeriodData {
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface IAcademicPeriodsRepository {
  create(data: CreateAcademicPeriodData): Promise<AcademicPeriod>;
  findAll(): Promise<AcademicPeriod[]>;
}

export class PrismaAcademicPeriodsRepository implements IAcademicPeriodsRepository {
  async create(data: CreateAcademicPeriodData): Promise<AcademicPeriod> {
    return prisma.academicPeriod.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  }

  async findAll(): Promise<AcademicPeriod[]> {
    return prisma.academicPeriod.findMany({
      orderBy: { startDate: 'desc' },
    });
  }
}
