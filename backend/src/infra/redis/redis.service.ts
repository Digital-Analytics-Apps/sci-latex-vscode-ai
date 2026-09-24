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

  private buildKey(projectId: string, userId: string, taskId: string, mode = 'editor'): string {
    return `workspace:active:${mode}:${projectId}:${userId}:${taskId}`;
  }

  /**
   * Renovador de presença atômico (TTL por padrão 180 segundos = 3 minutos)
   */
  async setWorkspaceActive(
    projectId: string,
    userId: string,
    taskId: string = 'default-task',
    ttlSeconds = 180,
    mode = 'editor'
  ): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const key = this.buildKey(projectId, userId, taskId, mode);
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
      const keys = await this.client.keys(`workspace:active:*:${projectId}:${userId}:${taskId}`);
      return keys.length > 0;
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
      const keys = await this.client.keys(`workspace:active:*:${projectId}:${userId}:${taskId}`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
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
        const parts = key.split(':'); // workspace:active:<mode>:<projectId>:<userId>:<taskId>
        return {
          projectId: parts[3] || '',
          userId: parts[4] || '',
          taskId: parts[5] || 'default-task',
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Encontra o ID do usuário que atualmente possui uma sessão ativa de EDIÇÃO na tarefa (se houver)
   */
  async findActiveUserForTask(projectId: string, taskId: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const keys = await this.client.keys(`workspace:active:editor:${projectId}:*:${taskId}`);
      if (keys.length > 0) {
        const parts = keys[0].split(':'); // workspace:active:editor:<projectId>:<userId>:<taskId>
        return parts[4] || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Retorna um Map (taskId -> userId) com a presença ativa de EDITORES de todas as tarefas de um projeto
   */
  async getTaskPresenceMap(projectId: string): Promise<Map<string, string>> {
    const presenceMap = new Map<string, string>();
    if (!this.client || !this.isConnected) return presenceMap;
    try {
      const keys = await this.client.keys(`workspace:active:editor:${projectId}:*:*`);
      for (const key of keys) {
        const parts = key.split(':'); // workspace:active:editor:<projectId>:<userId>:<taskId>
        const userId = parts[4];
        const taskId = parts[5];
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
