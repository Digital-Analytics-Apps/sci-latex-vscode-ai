import Redis from 'ioredis';
import { env } from '../../config/env';

export interface WorkspaceKeyInfo {
  projectId: string;
  userId: string;
  taskId: string;
}

export class RedisService {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    if (env.NODE_ENV !== 'test') {
      try {
        this.client = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            return Math.min(times * 100, 3000);
          },
          lazyConnect: true,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          console.log('✅ Redis connected successfully.');
        });

        this.client.on('error', (err) => {
          this.isConnected = false;
          console.warn('⚠️ Redis Connection Warning:', err.message || err);
        });

        this.client.connect().catch((err) => {
          console.warn('⚠️ Initial Redis connection failed:', err.message || err);
        });
      } catch (err: any) {
        console.warn('⚠️ Could not initialize Redis client:', err.message || err);
        this.client = null;
      }
    }
  }

  get isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  private buildKey(projectId: string, userId: string, taskId: string): string {
    return `workspace:active:${projectId}:${userId}:${taskId}`;
  }

  /**
   * Renovador de presença atômico (TTL por padrão 180 segundos = 3 minutos)
   */
  async setWorkspaceActive(
    projectId: string,
    userId: string,
    taskId: string = 'default-task',
    ttlSeconds = 180
  ): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const key = this.buildKey(projectId, userId, taskId);
      await this.client.set(key, 'true', 'EX', ttlSeconds);
    } catch (err: any) {
      console.warn('⚠️ Error setting active workspace in Redis:', err.message || err);
    }
  }

  /**
   * Verifica estritamente a presença ativa no Redis para a tríade (projectId, userId, taskId)
   */
  async isWorkspaceActive(
    projectId: string,
    userId: string,
    taskId: string = 'default-task'
  ): Promise<boolean> {
    if (!this.client || !this.isConnected) return true; // Fallback permissivo apenas se Redis indisponível
    try {
      const exactKey = this.buildKey(projectId, userId, taskId);
      const exactExists = await this.client.exists(exactKey);
      return exactExists === 1;
    } catch {
      return true;
    }
  }

  /**
   * Remove a chave de presença imediatamente (ao desconectar manualmente)
   */
  async removeWorkspaceActive(
    projectId: string,
    userId: string,
    taskId: string = 'default-task'
  ): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const key = this.buildKey(projectId, userId, taskId);
      await this.client.del(key);
    } catch (err: any) {
      console.warn('⚠️ Error removing active workspace key from Redis:', err.message || err);
    }
  }

  /**
   * Retorna todas as chaves ativas registradas no Redis
   */
  async listAllActiveWorkspaces(): Promise<WorkspaceKeyInfo[]> {
    if (!this.client || !this.isConnected) return [];
    try {
      const keys = await this.client.keys('workspace:active:*');
      return keys.map((key) => {
        const parts = key.split(':'); // workspace:active:<projectId>:<userId>:<taskId>
        return {
          projectId: parts[2] || '',
          userId: parts[3] || '',
          taskId: parts[4] || 'default-task',
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Encontra o ID do usuário que atualmente possui uma sessão ativa na tarefa (se houver)
   */
  async findActiveUserForTask(projectId: string, taskId: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const keys = await this.client.keys(`workspace:active:${projectId}:*:${taskId}`);
      if (keys.length > 0) {
        const parts = keys[0].split(':');
        return parts[3] || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Retorna um Map (taskId -> userId) com a presença ativa de todas as tarefas de um projeto
   */
  async getTaskPresenceMap(projectId: string): Promise<Map<string, string>> {
    const presenceMap = new Map<string, string>();
    if (!this.client || !this.isConnected) return presenceMap;
    try {
      const keys = await this.client.keys(`workspace:active:${projectId}:*:*`);
      for (const key of keys) {
        const parts = key.split(':'); // workspace:active:<projectId>:<userId>:<taskId>
        const userId = parts[3];
        const taskId = parts[4];
        if (userId && taskId) {
          presenceMap.set(taskId, userId);
        }
      }
    } catch {
      // Retorna Map vazio em caso de erro
    }
    return presenceMap;
  }
}

export const redisService = new RedisService();
