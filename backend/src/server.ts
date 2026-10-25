import { buildApp } from './app';
import { env } from './config/env';
import { initMinio } from './infra/minio';
import { initRedis } from './infra/redis';
import { eventsManager } from './modules/events/events.manager';
import { defaultDocumentsService } from './modules/documents/documents.service';
async function start() {
  try {
    await initMinio();
    await initRedis();
    await eventsManager.initRedisSubscription();
    const app = await buildApp();
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.log(`🚀 Server running on http://${env.HOST}:${env.PORT} (Docker Live-Reload Active)`);

    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      try {
        console.log('💾 Persisting all active in-memory document checkpoints...');
        await defaultDocumentsService.flushAllActiveDocs();
        await app.close();
        console.log('✅ Server gracefully stopped.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during graceful shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  }
}

start();
