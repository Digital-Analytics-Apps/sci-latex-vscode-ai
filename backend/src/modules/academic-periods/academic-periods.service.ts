import {
  CreateAcademicPeriodData,
  IAcademicPeriodsRepository,
  PrismaAcademicPeriodsRepository,
} from '../../repositories/academic-periods.repository';

export class AcademicPeriodsService {
  constructor(
    private repository: IAcademicPeriodsRepository = new PrismaAcademicPeriodsRepository()
  ) {}

  async createPeriod(data: CreateAcademicPeriodData) {
    return this.repository.create(data);
  }

  async listPeriods() {
    return this.repository.findAll();
  }
}
