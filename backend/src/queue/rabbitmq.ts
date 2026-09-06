import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';
import { env } from '../config/env';

export const EXCHANGE_NAME = 'sci_latex_exchange';
export const QUEUE_GIT_OPERATIONS = 'git.operations';
export const ROUTING_KEY_GIT = 'git.*';
export const QUEUE_LATEX_COMPILATION = 'latex.compilation';
export const ROUTING_KEY_LATEX = 'latex.*';

export class RabbitMQService {
  private connection: any = null;
  private channel: Channel | null = null;
  private isConnecting = false;

  async connect(): Promise<Channel> {
    if (this.channel) return this.channel;

    if (this.isConnecting) {
      // Aguarda se já estiver conectando
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (this.channel) return this.channel;
    }

    this.isConnecting = true;

    try {
      console.log('🔌 Connecting to RabbitMQ:', env.RABBITMQ_URL);
      const conn: any = await amqp.connect(env.RABBITMQ_URL);
      const ch = await conn.createChannel();

      // Configura Exchange do tipo Topic
      await ch.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

      // Configura a fila git.operations
      await ch.assertQueue(QUEUE_GIT_OPERATIONS, { durable: true });
      await ch.bindQueue(QUEUE_GIT_OPERATIONS, EXCHANGE_NAME, ROUTING_KEY_GIT);

      // Configura a fila latex.compilation
      await ch.assertQueue(QUEUE_LATEX_COMPILATION, { durable: true });
      await ch.bindQueue(QUEUE_LATEX_COMPILATION, EXCHANGE_NAME, ROUTING_KEY_LATEX);

      console.log('✅ RabbitMQ connected successfully and queues asserted.');
      this.isConnecting = false;

      conn.on('error', (err: any) => {
        console.error('❌ RabbitMQ Connection Error:', err);
        this.channel = null;
        this.connection = null;
      });

      conn.on('close', () => {
        console.warn('⚠️ RabbitMQ Connection Closed.');
        this.channel = null;
        this.connection = null;
      });

      this.connection = conn;
      this.channel = ch;

      return ch;
    } catch (err) {
      this.isConnecting = false;
      console.error('❌ Failed to connect to RabbitMQ:', err);
      throw err;
    }
  }

  async getChannel(): Promise<Channel> {
    if (!this.channel) {
      return this.connect();
    }
    return this.channel;
  }

  async disconnect() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (_err) {
      // Ignore disconnect error if connection is already closed
    }
    this.channel = null;
    this.connection = null;
  }
}

export const rabbitMQService = new RabbitMQService();
