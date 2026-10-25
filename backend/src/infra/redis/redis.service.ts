import Redis from 'ioredis';
import { env } from '../../config/env';

export const POD_ID = process.env.POD_NAME || process.env.HOSTNAME || `pod-${Math.random().toString(36).substring(2, 9)}`;

export interface DocumentLeaseResult {
  acquired: boolean;
  ownerId: string;
  generation: number;
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

  /**
   * Tenta adquirir o lease de posse do documento com Fencing Token monotônico (ownerGeneration)
   */
  async acquireDocumentLease(
    documentId: string,
    podId: string = POD_ID,
    ttlSeconds = 15
  ): Promise<DocumentLeaseResult> {
    if (!this.client || !this.isConnected) {
      return { acquired: true, ownerId: podId, generation: 1 };
    }

    try {
      const ownerKey = `editor:document:${documentId}:owner`;
      const genKey = `editor:document:${documentId}:generation`;

      // Tenta setar a chave de owner com NX (se não existir)
      const result = await this.client.set(ownerKey, podId, 'EX', ttlSeconds, 'NX');
      if (result === 'OK') {
        const gen = await this.client.incr(genKey);
        return { acquired: true, ownerId: podId, generation: gen };
      }

      const currentOwner = (await this.client.get(ownerKey)) || podId;
      const genStr = await this.client.get(genKey);
      const generation = genStr ? parseInt(genStr, 10) : 1;

      return {
        acquired: currentOwner === podId,
        ownerId: currentOwner,
        generation,
      };
    } catch (err) {
      console.warn(`[Redis Lease Warning]: Falha ao adquirir lease para ${documentId}:`, err);
      return { acquired: true, ownerId: podId, generation: 1 };
    }
  }
  /**
   * Renova o lease de um documento mantido por este Pod
   */
  async renewDocumentLease(documentId: string, podId: string = POD_ID, ttlSeconds = 15): Promise<boolean> {
    if (!this.client || !this.isConnected) return true;
    try {
      const key = `editor:document:${documentId}:owner`;
      const currentOwner = await this.client.get(key);
      if (currentOwner === podId) {
        await this.client.expire(key, ttlSeconds);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[Redis Lease Warning]: Falha ao renovar lease para ${documentId}:`, err);
      return true;
    }
  }

  /**
   * Libera voluntariamente o lease do documento (ex: encerramento da sala ou eviction)
   */
  async releaseDocumentLease(documentId: string, podId: string = POD_ID): Promise<boolean> {
    if (!this.client || !this.isConnected) return true;

    try {
      const key = `editor:document:${documentId}:owner`;
      const currentOwner = await this.client.get(key);
      if (currentOwner === podId) {
        await this.client.del(key);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[Redis Lease Warning]: Falha ao liberar lease para ${documentId}:`, err);
      return false;
    }
  }

  /**
   * Consulta o dono atual e a geração de um documento
   */
  async getDocumentLease(documentId: string): Promise<{ owner: string | null; generation: number }> {
    if (!this.client || !this.isConnected) return { owner: null, generation: 0 };
    try {
      const owner = await this.client.get(`editor:document:${documentId}:owner`);
      const genStr = await this.client.get(`editor:document:${documentId}:generation`);
      return { owner, generation: genStr ? parseInt(genStr, 10) : 0 };
    } catch {
      return { owner: null, generation: 0 };
    }
  }

  async getDocumentOwner(documentId: string): Promise<string | null> {
    const lease = await this.getDocumentLease(documentId);
    return lease.owner;
  }
}

export const redisService = new RedisService();
