import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      amqplib: path.resolve(__dirname, 'src/utils/__mocks__/amqplib.ts'),
    },
  },
});
