import { prisma } from '../../db/prisma';
import { deadlineService } from '../../modules/deadlines/deadlines.service';
import { eventsManager } from '../../modules/events/events.manager';

export class DeadlinesWorker {
  // Executa verificação de cronogramas e emite alertas SSE
  async checkDeadlines() {
    try {
      const projects = await prisma.project.findMany({
        include: {
          members: true,
          sections: true,
        },
      });

      for (const project of projects) {
        const targetStatus = deadlineService.calculateStatus(project.targetConferenceDate);

        if (targetStatus === 'WARNING_SOON' || targetStatus === 'OVERDUE') {
          // Emite alerta SSE para os membros do artigo
          for (const member of project.members) {
            eventsManager.broadcastToUser(member.userId, 'DEADLINE_ALERT', {
              projectId: project.id,
              projectName: project.name,
              targetConferenceName: project.targetConferenceName,
              dueDate: project.targetConferenceDate,
              status: targetStatus,
              message:
                targetStatus === 'OVERDUE'
                  ? `⚠️ ATENÇÃO: O prazo para o congresso ${project.targetConferenceName} venceu!`
                  : `🟡 ALERTA: O prazo para o congresso ${project.targetConferenceName} vence em menos de 48 horas!`,
            });
          }
        }
      }
    } catch (err) {
      console.error('❌ Error checking deadlines in DeadlinesWorker:', err);
    }
  }
}

export const deadlinesWorker = new DeadlinesWorker();
