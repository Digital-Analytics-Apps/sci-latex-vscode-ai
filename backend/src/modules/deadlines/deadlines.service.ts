export type DeadlineStatus = 'ON_TIME' | 'WARNING_SOON' | 'OVERDUE';

export class DeadlineService {
  calculateStatus(dueDate: Date | null | undefined): DeadlineStatus {
    if (!dueDate) return 'ON_TIME';

    const now = new Date().getTime();
    const target = new Date(dueDate).getTime();
    const diffHours = (target - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return 'OVERDUE';
    }
    if (diffHours <= 48) {
      return 'WARNING_SOON';
    }
    return 'ON_TIME';
  }

  getSummary(items: { dueDate: Date | null | undefined }[]) {
    let onTime = 0;
    let warningSoon = 0;
    let overdue = 0;

    for (const item of items) {
      const status = this.calculateStatus(item.dueDate);
      if (status === 'OVERDUE') overdue++;
      else if (status === 'WARNING_SOON') warningSoon++;
      else onTime++;
    }

    return { onTime, warningSoon, overdue };
  }
}

export const deadlineService = new DeadlineService();
