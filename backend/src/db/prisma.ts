import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const connectionString = env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

// Instância única do Prisma Client utilizando o driver adapter PrismaPg do Prisma 7
export const prisma = new PrismaClient({ adapter });
