import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrate: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sci_latex_db',
  },
});
