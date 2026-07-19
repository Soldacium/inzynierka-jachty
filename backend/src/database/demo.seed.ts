import argon2 from 'argon2';
import type { DataSource } from 'typeorm';
import { In } from 'typeorm';
import { point } from '../common/geo.js';
import { Alert, AlertSeverity, AlertSource, AlertStatus, User, UserRole } from './entities.js';
import { demoVesselDefinitions } from '../modules/traffic/traffic.demo.js';

export const DEMO_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_ADMIN_EMAIL = 'admin@example.com';
export const DEMO_ADMIN_PASSWORD = 'admin';
export const DEMO_ALERT_IDS = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
] as const;

const demoAlertDefinitions = [
  { id: DEMO_ALERT_IDS[0], type: 'port_disruption', description: 'Testowe utrudnienie przy wejściu do Portu Gdańsk.', latitude: 54.4057, longitude: 18.6726, severity: AlertSeverity.Medium },
  { id: DEMO_ALERT_IDS[1], type: 'obstacle', description: 'Testowa przeszkoda na podejściu do mariny w Helu.', latitude: 54.6074, longitude: 18.8015, severity: AlertSeverity.High },
  { id: DEMO_ALERT_IDS[2], type: 'closed_area', description: 'Testowy czasowo zamknięty akwen w Zatoce Gdańskiej.', latitude: 54.4918, longitude: 18.7652, severity: AlertSeverity.Medium },
] as const;

export async function ensureDemoAccounts(dataSource: DataSource): Promise<void> {
  const users = dataSource.getRepository(User);
  let admin = await users.findOneBy({ id: DEMO_ADMIN_ID });
  admin ??= await users.findOneBy({ email: DEMO_ADMIN_EMAIL });
  let passwordMatches = false;
  if (admin) {
    try { passwordMatches = await argon2.verify(admin.passwordHash, DEMO_ADMIN_PASSWORD); } catch { passwordMatches = false; }
  }
  admin ??= users.create({ id: DEMO_ADMIN_ID, email: DEMO_ADMIN_EMAIL });
  Object.assign(admin, {
    email: DEMO_ADMIN_EMAIL,
    displayName: 'Administrator demo',
    role: UserRole.Admin,
    isBlocked: false,
    locationConsent: true,
    locationConsentAt: admin.locationConsentAt ?? new Date(),
    shareActivePosition: true,
    passwordHash: passwordMatches ? admin.passwordHash : await argon2.hash(DEMO_ADMIN_PASSWORD, { type: argon2.argon2id }),
  });
  await users.save(admin);

  const alertRepository = dataSource.getRepository(Alert);
  const existingAlerts = new Map((await alertRepository.findBy({ id: In([...DEMO_ALERT_IDS]) })).map((alert) => [alert.id, alert]));
  const validUntil = new Date(Date.now() + 30 * 86_400_000);
  const createdAt = new Date(Date.now() - 86_400_000);
  await alertRepository.save(demoAlertDefinitions.map((definition) => {
    const alert = existingAlerts.get(definition.id) ?? alertRepository.create({ id: definition.id });
    Object.assign(alert, {
      type: definition.type,
      description: definition.description,
      location: point(definition.latitude, definition.longitude),
      severity: definition.severity,
      status: AlertStatus.Confirmed,
      source: AlertSource.Official,
      authorId: admin.id,
      portId: null,
      validUntil,
      createdAt,
    });
    return alert;
  }));

  const ids = demoVesselDefinitions.map((definition) => definition.userId);
  const existing = new Map((await users.findBy({ id: In(ids) })).map((user) => [user.id, user]));
  const missingPasswordHash = existing.size === ids.length
    ? null
    : await argon2.hash(crypto.randomUUID(), { type: argon2.argon2id });
  const testUsers = demoVesselDefinitions.map((definition) => {
    const user = existing.get(definition.userId) ?? users.create({
      id: definition.userId,
      passwordHash: missingPasswordHash!,
    });
    Object.assign(user, {
      email: definition.email,
      displayName: definition.displayName,
      role: UserRole.Sailor,
      isBlocked: false,
      locationConsent: true,
      locationConsentAt: user.locationConsentAt ?? new Date(),
      shareActivePosition: true,
    });
    return user;
  });
  await users.save(testUsers);
}
