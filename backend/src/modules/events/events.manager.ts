import { FastifyReply } from 'fastify';

interface SSEClient {
  userId: string;
  reply: FastifyReply;
}

// Gerenciador central de clientes ativos de Server-Sent Events (SSE)
class EventsManagerService {
  private clients: SSEClient[] = [];

  // Adiciona novo cliente à lista de conexões ativas
  addClient(userId: string, reply: FastifyReply) {
    this.clients.push({ userId, reply });
  }

  // Remove cliente desconectado
  removeClient(userId: string, reply: FastifyReply) {
    this.clients = this.clients.filter((c) => !(c.userId === userId && c.reply === reply));
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
