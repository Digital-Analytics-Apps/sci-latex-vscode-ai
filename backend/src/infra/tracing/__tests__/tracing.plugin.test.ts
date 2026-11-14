import { describe, expect, it } from 'vitest';
import { buildApp } from '../../../app';

describe('W3C Tracing Plugin (traceparent / x-trace-id)', () => {
  it('should generate a new traceparent when none is provided', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const traceparent = response.headers['traceparent'] as string;
    const traceId = response.headers['x-trace-id'] as string;

    expect(traceparent).toBeDefined();
    expect(traceId).toBeDefined();
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(traceparent).toContain(traceId);

    await app.close();
  });

  it('should propagate incoming traceId from existing traceparent', async () => {
    const app = await buildApp();
    const incomingTraceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const incomingTraceparent = `00-${incomingTraceId}-00f067aa0ba902b7-01`;

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        traceparent: incomingTraceparent,
      },
    });

    expect(response.statusCode).toBe(200);
    const responseTraceparent = response.headers['traceparent'] as string;
    const responseTraceId = response.headers['x-trace-id'] as string;

    expect(responseTraceId).toBe(incomingTraceId);
    expect(responseTraceparent).toContain(incomingTraceId);

    await app.close();
  });
});
