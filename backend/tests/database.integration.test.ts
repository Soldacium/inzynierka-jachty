import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppContext } from '../src/app-context.js';
import { createApp } from '../src/app.js';
import { AppDataSource } from '../src/database/data-source.js';
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_ALERT_IDS, ensureDemoAccounts } from '../src/database/demo.seed.js';
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

  it('registers a sailor with location sharing enabled and accepts a GPS batch', async () => {
    const app = createApp(new AppContext(AppDataSource, new NoopMailService()));
    const registration = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'A-long-test-password-123!',
      displayName: 'Integration Sailor',
    });
    expect(registration.status).toBe(201);
    expect(registration.body.user.role).toBe('sailor');
    expect(registration.body.user.locationConsent).toBe(true);
    expect(registration.body.user.shareActivePosition).toBe(true);
    const accessToken = registration.body.tokens.accessToken as string;

    const unboundedTraffic = await request(app).get('/api/v1/traffic/points')
      .set('authorization', `Bearer ${accessToken}`);
    expect(unboundedTraffic.status).toBe(400);

    const boundedTraffic = await request(app).get('/api/v1/traffic/points')
      .set('authorization', `Bearer ${accessToken}`)
      .query({ north: 55, south: 54, east: 19, west: 18 });
    expect(boundedTraffic.status).toBe(200);
    expect(boundedTraffic.body.items.every((item: { latitude: number; longitude: number }) =>
      item.latitude >= 54 && item.latitude <= 55 && item.longitude >= 18 && item.longitude <= 19)).toBe(true);

    const route = await request(app).post('/api/v1/routes')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Integration voyage',
        status: 'active',
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        points: [
          { latitude: 54.50, longitude: 18.50 },
          { latitude: 54.60, longitude: 18.60 },
        ],
      });
    expect(route.status).toBe(201);

    const adminSimulation = await request(app).post('/api/v1/admin/traffic-simulation/reset')
      .set('authorization', `Bearer ${accessToken}`);
    expect(adminSimulation.status).toBe(403);

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
    const [storedSample] = await AppDataSource.query<Array<{ routeId: string | null }>>(
      `SELECT route_id AS "routeId" FROM location_samples WHERE client_generated_id = $1`,
      [clientGeneratedId],
    );
    expect(storedSample?.routeId).toBe(route.body.id);

    const heatmap = await request(app).get('/api/v1/traffic/heatmap')
      .set('authorization', `Bearer ${accessToken}`)
      .query({ north: 55, south: 54, east: 19, west: 18, zoom: 10 });
    expect(heatmap.status).toBe(200);
    expect(heatmap.body.items).toEqual([]);
    expect(heatmap.body.minimumUsers).toBe(3);
  });

  it('authenticates the seeded administrator from the database role and password hash', async () => {
    await ensureDemoAccounts(AppDataSource);
    const app = createApp(new AppContext(AppDataSource, new NoopMailService()));
    const login = await request(app).post('/api/v1/auth/login').send({
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
    });

    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(DEMO_ADMIN_EMAIL);
    expect(login.body.user.role).toBe('admin');
    const accessToken = login.body.tokens.accessToken as string;

    const firstPage = await request(app).get('/api/v1/alerts')
      .set('authorization', `Bearer ${accessToken}`)
      .query({ limit: 1 });
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.nextCursor).toBeTypeOf('string');

    const secondPage = await request(app).get('/api/v1/alerts')
      .set('authorization', `Bearer ${accessToken}`)
      .query({ limit: 1, cursor: firstPage.body.nextCursor });
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].id).not.toBe(firstPage.body.items[0].id);

    const gdansk = await request(app).get('/api/v1/alerts')
      .set('authorization', `Bearer ${accessToken}`)
      .query({ north: 54.55, south: 54.3, east: 18.75, west: 18.55, limit: 100 });
    expect(gdansk.status).toBe(200);
    expect(gdansk.body.items.map((alert: { id: string }) => alert.id)).toContain(DEMO_ALERT_IDS[0]);
    expect(gdansk.body.items.map((alert: { id: string }) => alert.id)).not.toContain(DEMO_ALERT_IDS[1]);

    const hel = await request(app).get('/api/v1/alerts')
      .set('authorization', `Bearer ${accessToken}`)
      .query({ north: 54.7, south: 54.55, east: 18.9, west: 18.75, limit: 100 });
    expect(hel.status).toBe(200);
    expect(hel.body.items.map((alert: { id: string }) => alert.id)).toContain(DEMO_ALERT_IDS[1]);
  });
});
