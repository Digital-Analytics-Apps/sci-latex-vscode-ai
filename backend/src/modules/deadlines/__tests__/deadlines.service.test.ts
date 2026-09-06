import { describe, it, expect } from 'vitest';
import { deadlineService } from '../deadlines.service';

describe('DeadlineService', () => {
  it('should return ON_TIME when due date is more than 48 hours in future', () => {
    const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas no futuro
    const status = deadlineService.calculateStatus(futureDate);
    expect(status).toBe('ON_TIME');
  });

  it('should return WARNING_SOON when due date is within 48 hours', () => {
    const warningDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas no futuro
    const status = deadlineService.calculateStatus(warningDate);
    expect(status).toBe('WARNING_SOON');
  });

  it('should return OVERDUE when due date is in the past', () => {
    const pastDate = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10 horas no passado
    const status = deadlineService.calculateStatus(pastDate);
    expect(status).toBe('OVERDUE');
  });

  it('should compute deadline summary counts correctly', () => {
    const items = [
      { dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      { dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000) },
      { dueDate: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    ];
    const summary = deadlineService.getSummary(items);
    expect(summary.onTime).toBe(1);
    expect(summary.warningSoon).toBe(1);
    expect(summary.overdue).toBe(1);
  });
});
