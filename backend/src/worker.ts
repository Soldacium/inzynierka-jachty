import { AppDataSource } from './database/data-source.js';
import { aggregateCurrentTraffic, runMaintenance } from './jobs/maintenance.js';

await AppDataSource.initialize();
await AppDataSource.runMigrations({ transaction: 'all' });

async function tick() {
  try {
    await aggregateCurrentTraffic(AppDataSource);
    await runMaintenance(AppDataSource);
  } catch (error) {
    console.error('Worker cycle failed', error instanceof Error ? error.message : 'unknown error');
  }
}

await tick();
const interval = setInterval(() => void tick(), 60_000);

async function shutdown() {
  clearInterval(interval);
  await AppDataSource.destroy();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
