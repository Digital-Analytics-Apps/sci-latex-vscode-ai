import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  MINIO_ENDPOINT: z.string().default('http://127.0.0.1:9000'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin123'),
  MINIO_PUBLIC_URL: z.string().default('http://localhost:9000'),
  MINIO_BUCKET: z.string().default('collab-assets'),
  COMPILER_URL: z.string().default('http://127.0.0.1:4000'),
  AI_SERVICE_URL: z.string().default('http://127.0.0.1:8000'),
  INTERNAL_SERVICE_KEY: z.string().default('scia-internal-secret-change-in-production'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid Environment Variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
