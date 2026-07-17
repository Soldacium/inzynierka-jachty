import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppContext } from '../src/app-context.js';
import { createApp } from '../src/app.js';
import { AppDataSource } from '../src/database/data-source.js';
import { NoopMailService } from '../src/services/mail.service.js';

const run = process.env.RUN_DB_TESTS === 'true';
const suite = run ? describe : describe.skip;
const email = 'integration-sailor@example.com';

suite('PostGIS API integration', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await AppDataSource.runMigrations({ transaction: 'all' });
    await AppDataSource.query('DELETE FROM users WHERE email = $1', [email]);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('DELETE FROM users WHERE email = $1', [email]);
      await AppDataSource.destroy();
    }
  });

  it('registers a sailor, records consent and accepts a GPS batch', async () => {
    const app = createApp(new AppContext(AppDataSource, new NoopMailService()));
    const registration = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'A-long-test-password-123!',
      displayName: 'Integration Sailor',
    });
    expect(registration.status).toBe(201);
    expect(registration.body.user.role).toBe('sailor');
    const accessToken = registration.body.tokens.accessToken as string;

    const privacy = await request(app).patch('/api/v1/users/me/privacy')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ locationConsent: true, shareActivePosition: true });
    expect(privacy.status).toBe(200);
    expect(privacy.body.locationConsent).toBe(true);

    const clientGeneratedId = crypto.randomUUID();
    const batch = await request(app).post('/api/v1/locations/batch')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ samples: [{
        clientGeneratedId,
        latitude: 54.5189,
        longitude: 18.5305,
        accuracy: 8,
        speed: 2.5,
        heading: 45,
        recordedAt: new Date().toISOString(),
      }] });
    expect(batch.status).toBe(202);
    expect(batch.body.acceptedClientGeneratedIds).toContain(clientGeneratedId);

    const heatmap = await request(app).get('/api/v1/traffic/heatmap')
      .set('authorization', `Bearer ${accessToken}`)
      .query({ north: 55, south: 54, east: 19, west: 18, zoom: 10 });
    expect(heatmap.status).toBe(200);
    expect(heatmap.body.items).toEqual([]);
    expect(heatmap.body.minimumUsers).toBe(3);
  });
});
