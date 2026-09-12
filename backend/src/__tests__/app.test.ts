import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('Fastify Application', () => {
  it('should respond with ok on /health endpoint', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('sci-latex-backend');

    await app.close();
  });
});
