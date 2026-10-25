import {
  CreateAcademicPeriodData,
  IAcademicPeriodsRepository,
  PrismaAcademicPeriodsRepository,
} from '../../repositories/academic-periods.repository';

export class AcademicPeriodsService {
  constructor(
    private readonly repository: IAcademicPeriodsRepository = new PrismaAcademicPeriodsRepository()
  ) {}

  async createPeriod(data: CreateAcademicPeriodData) {
    return this.repository.create(data);
  }

  async listPeriods(managerId?: string) {
    return this.repository.findAll(managerId);
  }

  async getPeriodById(id: string) {
    return this.repository.findById(id);
  }
}
