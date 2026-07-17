import { AppDataSource } from './data-source.js';

await AppDataSource.initialize();
const migrations = await AppDataSource.runMigrations({ transaction: 'all' });
console.info(`Applied ${migrations.length} migration(s).`);
await AppDataSource.destroy();
