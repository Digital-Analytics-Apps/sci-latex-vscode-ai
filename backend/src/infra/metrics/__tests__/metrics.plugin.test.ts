import { describe, expect, it } from 'vitest';
import { buildApp } from '../../../app';

describe('Prometheus Metrics Plugin (/metrics)', () => {
  it('should expose /metrics endpoint with text/plain Prometheus format', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');

    const body = response.body;
    // Deve conter métricas padrão do processo e métricas customizadas do SCIA
    expect(body).toContain('scia_backend_');
    expect(body).toContain('scia_backend_http_requests_total');
    expect(body).toContain('scia_backend_http_request_duration_seconds');
    expect(body).toContain('scia_backend_collab_active_rooms');

    await app.close();
  });
});
