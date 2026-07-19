import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../config/env.js';
import { entities } from './entities.js';
import { InitialSchema1700000000000 } from './migrations/1700000000000-initial-schema.js';
import { AlertSourceAndPortImport1700000001000 } from './migrations/1700000001000-alert-source-and-port-import.js';
import { AlertDefaultConfirmed1700000002000 } from './migrations/1700000002000-alert-default-confirmed.js';
import { AlwaysShareLocation1700000003000 } from './migrations/1700000003000-always-share-location.js';
import { LocationRouteRetention1700000004000 } from './migrations/1700000004000-location-route-retention.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  entities,
  migrations: [InitialSchema1700000000000, AlertSourceAndPortImport1700000001000, AlertDefaultConfirmed1700000002000, AlwaysShareLocation1700000003000, LocationRouteRetention1700000004000],
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
});

export async function ensureDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
