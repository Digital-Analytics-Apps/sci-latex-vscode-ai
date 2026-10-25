import { AcademicPeriod } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CreateAcademicPeriodData,
  IAcademicPeriodsRepository,
} from '../../../repositories/academic-periods.repository';
import { AcademicPeriodsService } from '../academic-periods.service';

class InMemoryAcademicPeriodsRepository implements IAcademicPeriodsRepository {
  public periods: AcademicPeriod[] = [];

  async create(data: CreateAcademicPeriodData): Promise<AcademicPeriod> {
    const period: AcademicPeriod = {
      id: `period-${Date.now()}-${Math.random()}`,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      targetArticlesCount: data.targetArticlesCount ?? 0,
      status: data.status ?? 'ACTIVE',
      managerId: data.managerId ?? null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.periods.push(period);
    return period;
  }

  async findById(id: string): Promise<AcademicPeriod | null> {
    const period = this.periods.find((p) => p.id === id);
    if (!period) return null;
    return period;
  }

  async findAll(managerId?: string): Promise<AcademicPeriod[]> {
    return this.periods.filter((p) => {
      if (managerId && p.managerId !== managerId) return false;
      return true;
    });
  }

}

describe('AcademicPeriodsService', () => {
  let repository: InMemoryAcademicPeriodsRepository;
  let service: AcademicPeriodsService;

  beforeEach(() => {
    repository = new InMemoryAcademicPeriodsRepository();
    service = new AcademicPeriodsService(repository);
  });

  it('should create an academic period with target articles count and managerId', async () => {
    const period = await service.createPeriod({
      name: '2026.1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      targetArticlesCount: 15,
      managerId: 'manager-10',
    });

    expect(period).toBeDefined();
    expect(period.name).toBe('2026.1');
    expect(period.targetArticlesCount).toBe(15);
    expect(period.managerId).toBe('manager-10');
  });

  it('should filter periods by managerId', async () => {
    await service.createPeriod({
      name: '2026.1 - Lab A',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      managerId: 'manager-1',
    });

    await service.createPeriod({
      name: '2026.1 - Lab B',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      managerId: 'manager-2',
    });

    const m1Periods = await service.listPeriods('manager-1');
    expect(m1Periods).toHaveLength(1);
    expect(m1Periods[0].name).toBe('2026.1 - Lab A');
  });
});
