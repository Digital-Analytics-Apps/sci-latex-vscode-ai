import { FastifyReply } from 'fastify';
import { K8sPodManagerService } from '../../infra/k8s/k8s-pod-manager.service';
import { workspaceWatcher } from '../../infra/watcher/workspace-watcher.service';
import {
  IWorkspacesRepository,
  PrismaWorkspacesRepository,
} from '../../repositories/workspaces.repository';

interface SSEClient {
  userId: string;
  projectId?: string;
  reply: FastifyReply;
}

const GRACE_PERIOD_MS = 180_000; // 3 Minutos de Grace Period (Tolerância para F5 / Reconexão)

// Gerenciador central de clientes ativos de Server-Sent Events (SSE)
export class EventsManagerService {
  private clients: SSEClient[] = [];
  private readonly k8sPodManager = new K8sPodManagerService();
  private readonly workspacesRepository: IWorkspacesRepository;
  private readonly releaseTimers = new Map<string, NodeJS.Timeout>();
  private readonly activeProjectConnections = new Map<string, number>();

  constructor(workspacesRepository: IWorkspacesRepository = new PrismaWorkspacesRepository()) {
    this.workspacesRepository = workspacesRepository;
  }

  // Adiciona novo cliente à lista de conexões ativas
  addClient(userId: string, reply: FastifyReply, projectId?: string) {
    this.clients.push({ userId, projectId, reply });

    if (projectId) {
      const current = this.activeProjectConnections.get(projectId) || 0;
      this.activeProjectConnections.set(projectId, current + 1);

      // Inicia o monitoramento de arquivo por sistema operacional para este projeto
      workspaceWatcher.watchProject(projectId, userId);

      // Se houver um timer de destruição pendente para este projeto, cancela! (Reconexão/F5 dentro do Grace Period)
      if (this.releaseTimers.has(projectId)) {
        clearTimeout(this.releaseTimers.get(projectId));
        this.releaseTimers.delete(projectId);
        console.log(
          `⏱️ Reconexão detectada no projeto ${projectId} dentro do Grace Period de 3 min. Destruição do Pod cancelada.`
        );
      }
    }
  }

  // Remove cliente desconectado
  removeClient(userId: string, reply: FastifyReply, projectId?: string) {
    this.clients = this.clients.filter((c) => !(c.userId === userId && c.reply === reply));

    if (projectId) {
      const current = this.activeProjectConnections.get(projectId) || 1;
      const updated = Math.max(0, current - 1);
      this.activeProjectConnections.set(projectId, updated);

      // Se não restar nenhuma conexão SSE ativa para o projeto, inicia o Grace Period de 3 minutos
      if (updated === 0) {
        console.log(
          `⏳ 0 conexões ativas no projeto ${projectId}. Iniciando Grace Period de 3 minutos antes de destruir o Pod...`
        );

        if (this.releaseTimers.has(projectId)) {
          clearTimeout(this.releaseTimers.get(projectId));
        }

        const timer = setTimeout(async () => {
          this.releaseTimers.delete(projectId);

          // Re-verifica se o número de conexões ativas ainda é 0
          if ((this.activeProjectConnections.get(projectId) || 0) === 0) {
            console.log(
              `🧹 Grace Period de 3 minutos expirado para o projeto ${projectId}. Encerrando Pod no K8s e liberando RAM...`
            );
            await this.k8sPodManager.releasePodForProject(projectId).catch((err) => {
              console.warn(`⚠️ Error releasing Pod after Grace Period:`, err.message || err);
            });
            await this.workspacesRepository
              .updateStatusByProjectId(projectId, 'TERMINATED')
              .catch((err) => {
                console.warn(
                  `⚠️ Error updating Workspace status to TERMINATED:`,
                  err.message || err
                );
              });
            workspaceWatcher.unwatchProject(projectId);
          }
        }, GRACE_PERIOD_MS);

        this.releaseTimers.set(projectId, timer);
      }
    }
  }

  // Envia um evento em tempo real para um usuário específico
  sendToUser(userId: string, eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients
      .filter((client) => client.userId === userId)
      .forEach((client) => {
        client.reply.raw.write(payload);
      });
  }

  broadcastToUser(userId: string, eventName: string, data: any) {
    this.sendToUser(userId, eventName, data);
  }

  // Envia evento global para todos os clientes conectados
  broadcast(eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.reply.raw.write(payload);
      } catch {
        // ignora se conexão falhou
      }
    });
  }

  // Envia evento em tempo real para todos os clientes conectados a um projeto específico
  broadcastToProject(projectId: string, eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients
      .filter((client) => client.projectId === projectId)
      .forEach((client) => {
        try {
          client.reply.raw.write(payload);
        } catch {
          // ignora se conexão falhou
        }
      });
  }
}

export const eventsManager = new EventsManagerService();
