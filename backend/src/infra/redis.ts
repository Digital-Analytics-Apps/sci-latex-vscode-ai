import Redis from 'ioredis';
import { env } from '../config/env';

const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';

export const redisPubClient = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

export const redisSubClient = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

redisPubClient.on('error', (err) => console.warn('[Redis PUB Warning]:', err.message));
redisSubClient.on('error', (err) => console.warn('[Redis SUB Warning]:', err.message));

export async function initRedis(): Promise<boolean> {
  try {
    await redisPubClient.connect();
    await redisSubClient.connect();
    console.log(`[Redis] ✅ Conectado ao Redis em ${REDIS_URL}`);
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(
      `[Redis] ⚠️ Falha na conexão Pub/Sub (${error.message}). Continuando localmente.`
    );
    return false;
  }
}
