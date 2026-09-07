import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().optional(),
  JWT_SECRET: z.string().min(8),
  GIT_SERVICE_TOKEN: z.string().min(8),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_ORG: z.string().optional(),
  GITHUB_REPO_PREFIX: z.string().default('sci-paper-'),
  STORAGE_PATH: z.string().default('./storage'),
  CODE_SERVER_URL: z.string().default('http://localhost:8080'),
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
