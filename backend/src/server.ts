import { createServer } from 'node:http';
import { AppContext } from './app-context.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { AppDataSource } from './database/data-source.js';
import { attachSocketServer } from './websocket/socket.js';
import { ensureDemoAccounts } from './database/demo.seed.js';

await AppDataSource.initialize();
await AppDataSource.runMigrations({ transaction: 'all' });
if (env.DEMO_ADMIN_ENABLED) await ensureDemoAccounts(AppDataSource);
const context = new AppContext(AppDataSource);
const server = createServer(createApp(context));
const io = attachSocketServer(server, context);

server.listen(env.PORT, () => console.info(`API listening on port ${env.PORT}`));

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down.`);
  context.trafficSimulation.stop(false);
  io.close();
  server.close(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
