import { FastifyReply } from 'fastify';
import { redisPubClient, redisSubClient } from '../../infra/redis';

export interface DomainNotificationEvent {
  eventName: string;
  projectId?: string;
  userId?: string;
  data: unknown;
}

interface SSEClient {
  userId: string;
  projectId?: string;
  taskId?: string;
  reply: FastifyReply;
}

// Gerenciador central de clientes ativos de Server-Sent Events (SSE) integrado com Redis Pub/Sub
export class EventsManagerService {
  private clients: SSEClient[] = [];

  async initRedisSubscription() {
    try {
      if (redisSubClient.status === 'ready') {
        await redisSubClient.subscribe('events:notifications');
        redisSubClient.on('message', (channel, message) => {
          if (channel === 'events:notifications') {
            try {
              const payload = JSON.parse(message) as DomainNotificationEvent;
              if (payload.projectId) {
                this.broadcastToProject(payload.projectId, payload.eventName, payload.data);
              } else if (payload.userId) {
                this.sendToUser(payload.userId, payload.eventName, payload.data);
              } else {
                this.broadcast(payload.eventName, payload.data);
              }
            } catch (err) {
              console.warn('[Redis Events Error]:', err);
            }
          }
        });
      }
    } catch (err) {
      console.warn('[Redis Subscription Warning]:', err);
    }
  }

  async publishDomainEvent(event: DomainNotificationEvent) {
    if (event.projectId) {
      this.broadcastToProject(event.projectId, event.eventName, event.data);
    } else if (event.userId) {
      this.sendToUser(event.userId, event.eventName, event.data);
    } else {
      this.broadcast(event.eventName, event.data);
    }

    if (redisPubClient.status === 'ready') {
      try {
        await redisPubClient.publish('events:notifications', JSON.stringify(event));
      } catch (err) {
        console.warn('[Redis Publish Error]:', err);
      }
    }
  }

  addClient(
    userId: string,
    reply: FastifyReply,
    projectId?: string,
    taskId?: string
  ) {
    this.clients.push({ userId, projectId, taskId, reply });
  }

  removeClient(userId: string, reply: FastifyReply, _projectId?: string, _taskId?: string) {
    this.clients = this.clients.filter((c) => !(c.userId === userId && c.reply === reply));
  }
  // Envia um evento em tempo real para um usuário específico
  sendToUser(userId: string, eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients
      .filter((client) => client.userId === userId)
      .forEach((client) => {
        try {
          client.reply.raw.write(payload);
        } catch {
          this.removeClient(client.userId, client.reply, client.projectId, client.taskId);
        }
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
        this.removeClient(client.userId, client.reply, client.projectId, client.taskId);
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
          this.removeClient(client.userId, client.reply, client.projectId, client.taskId);
        }
      });
  }
}

export const eventsManager = new EventsManagerService();
