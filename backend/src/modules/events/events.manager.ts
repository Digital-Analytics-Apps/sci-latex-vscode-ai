import { FastifyReply } from 'fastify';
import { K8sPodManagerService } from '../k8s/k8s-pod-manager.service';

interface SSEClient {
  userId: string;
  projectId?: string;
  reply: FastifyReply;
}

const GRACE_PERIOD_MS = 60_000; // 1 Minuto de Grace Period (Tolerância para F5 / Reconexão)

// Gerenciador central de clientes ativos de Server-Sent Events (SSE)
class EventsManagerService {
  private clients: SSEClient[] = [];
  private k8sPodManager = new K8sPodManagerService();
  private releaseTimers = new Map<string, NodeJS.Timeout>();
  private activeProjectConnections = new Map<string, number>();

  // Adiciona novo cliente à lista de conexões ativas
  addClient(userId: string, reply: FastifyReply, projectId?: string) {
    this.clients.push({ userId, projectId, reply });

    if (projectId) {
      const current = this.activeProjectConnections.get(projectId) || 0;
      this.activeProjectConnections.set(projectId, current + 1);

      // Se houver um timer de destruição pendente para este projeto, cancela! (Reconexão/F5 dentro do Grace Period)
      if (this.releaseTimers.has(projectId)) {
        clearTimeout(this.releaseTimers.get(projectId));
        this.releaseTimers.delete(projectId);
        console.log(
          `⏱️ Reconexão detectada no projeto ${projectId} dentro do Grace Period de 1 min. Destruição do Pod cancelada.`
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

      // Se não restar nenhuma conexão SSE ativa para o projeto, inicia o Grace Period de 1 minuto
      if (updated === 0) {
        console.log(
          `⏳ 0 conexões ativas no projeto ${projectId}. Iniciando Grace Period de 1 minuto antes de destruir o Pod...`
        );

        if (this.releaseTimers.has(projectId)) {
          clearTimeout(this.releaseTimers.get(projectId));
        }

        const timer = setTimeout(async () => {
          this.releaseTimers.delete(projectId);

          // Re-verifica se o número de conexões ativas ainda é 0
          if ((this.activeProjectConnections.get(projectId) || 0) === 0) {
            console.log(
              `🧹 Grace Period de 1 minuto expirado para o projeto ${projectId}. Encerrando Pod no K8s e liberando RAM...`
            );
            await this.k8sPodManager.releasePodForProject(projectId).catch((err) => {
              console.warn(`⚠️ Error releasing Pod after Grace Period:`, err.message || err);
            });
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
      client.reply.raw.write(payload);
    });
  }
}

export const eventsManager = new EventsManagerService();
