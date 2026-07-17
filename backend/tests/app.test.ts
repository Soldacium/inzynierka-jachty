import type { DataSource } from 'typeorm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppContext } from '../src/app-context.js';
import { createApp } from '../src/app.js';
import { NoopMailService } from '../src/services/mail.service.js';

const context = new AppContext({} as DataSource, new NoopMailService());
const app = createApp(context);

describe('HTTP application', () => {
  it('exposes a liveness endpoint without authentication', async () => {
    const response = await request(app).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('returns the common error envelope for an unknown route', async () => {
    const response = await request(app).get('/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: 'ROUTE_NOT_FOUND' });
    expect(response.body.error.requestId).toBeTypeOf('string');
  });

  it('rejects protected endpoints without a bearer token', async () => {
    const response = await request(app).get('/api/v1/ports');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('validates authentication payloads before reaching persistence', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'invalid', password: 'short', displayName: '',
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('publishes an OpenAPI document', async () => {
    const response = await request(app).get('/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(response.body.paths['/locations/batch']).toBeDefined();
  });
});
