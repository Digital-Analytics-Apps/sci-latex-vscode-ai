import { prisma } from '../../db/prisma';
import { eventsManager } from '../events/events.manager';

export class EventProcessorService {
  /**
   * Processa o evento gravado no Webhook Inbox e atualiza as Local Projections
   */
  async processEvent(eventId: string): Promise<boolean> {
    const event = await prisma.githubWebhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || !event.signatureValid || event.status === 'PROCESSED') {
      return false;
    }

    try {
      const payload: any = event.payload;

      if (event.eventType === 'issues') {
        await this.handleIssueEvent(payload);
      } else if (event.eventType === 'projects_v2_item') {
        await this.handleProjectItemEvent(payload);
      }

      await prisma.githubWebhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return true;
    } catch {
      await prisma.githubWebhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED',
        },
      });
      return false;
    }
  }

  private async handleIssueEvent(payload: any) {
    const issue = payload.issue;
    if (!issue) return;

    const githubIssueId = BigInt(issue.id);
    const githubRepositoryId = BigInt(payload.repository?.id || 0);
    const incomingUpdatedAt = new Date(issue.updated_at || Date.now());

    // Resolução de concorrência out-of-order: ignora eventos mais antigos que a projection atual
    const currentProjection = await prisma.githubIssueProjection.findUnique({
      where: { githubIssueId },
    });

    if (currentProjection && currentProjection.updatedAt >= incomingUpdatedAt) {
      return; // Ignora evento desordenado/antigo
    }

    const updatedProjection = await prisma.githubIssueProjection.upsert({
      where: { githubIssueId },
      create: {
        githubIssueId,
        githubRepositoryId,
        issueNumber: issue.number,
        title: issue.title,
        state: issue.state,
        authorGithubUsername: issue.user?.login || null,
        assigneeGithubUsername: issue.assignee?.login || null,
        htmlUrl: issue.html_url || '',
        updatedAt: incomingUpdatedAt,
        lastGithubEventAt: new Date(),
      },
      update: {
        title: issue.title,
        state: issue.state,
        authorGithubUsername: issue.user?.login || null,
        assigneeGithubUsername: issue.assignee?.login || null,
        htmlUrl: issue.html_url || '',
        updatedAt: incomingUpdatedAt,
        lastGithubEventAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });

    // Emite notificação SSE em tempo real para a interface React
    eventsManager.broadcast('WORK_ITEM_UPDATED', {
      issueId: updatedProjection.githubIssueId.toString(),
      issueNumber: updatedProjection.issueNumber,
      title: updatedProjection.title,
      state: updatedProjection.state,
    });
  }

  private async handleProjectItemEvent(payload: any) {
    const item = payload.projects_v2_item;
    if (!item) return;

    const itemId = item.node_id || item.id;
    const projectV2Id = item.project_node_id || '';
    const githubIssueId = BigInt(item.content_node_id || 0);
    const incomingUpdatedAt = new Date(item.updated_at || Date.now());

    const currentProjection = await prisma.githubProjectItemProjection.findUnique({
      where: { githubProjectItemId: itemId },
    });

    if (currentProjection && currentProjection.updatedAt >= incomingUpdatedAt) {
      return;
    }

    const updatedProjection = await prisma.githubProjectItemProjection.upsert({
      where: { githubProjectItemId: itemId },
      create: {
        githubProjectItemId: itemId,
        githubProjectV2Id: projectV2Id,
        githubIssueId,
        statusValue: payload.changes?.field_value?.value || item.status || null,
        nitStatusValue: payload.changes?.nit_status?.value || null,
        updatedAt: incomingUpdatedAt,
      },
      update: {
        statusValue: payload.changes?.field_value?.value || item.status || null,
        nitStatusValue: payload.changes?.nit_status?.value || null,
        updatedAt: incomingUpdatedAt,
        lastSyncedAt: new Date(),
      },
    });

    eventsManager.broadcast('PROJECT_ITEM_UPDATED', {
      itemId: updatedProjection.githubProjectItemId,
      status: updatedProjection.statusValue,
      nitStatus: updatedProjection.nitStatusValue,
    });
  }
}

export const eventProcessorService = new EventProcessorService();
