import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { AppContext } from './app-context.js';
import { errorHandler, notFoundHandler } from './common/errors.js';
import { env } from './config/env.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { alertRouter } from './modules/alerts/alert.routes.js';
import { authenticate, requireRole } from './modules/auth/auth.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { UserRole } from './database/entities.js';
import { locationRouter } from './modules/locations/location.routes.js';
import { messageRouter } from './modules/messages/message.routes.js';
import { portRouter } from './modules/ports/port.routes.js';
import { routeRouter } from './modules/routes/route.routes.js';
import { trafficRouter } from './modules/traffic/traffic.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { openapi } from './openapi.js';
import { asyncHandler } from './common/async-handler.js';

export function createApp(context: AppContext): Express {
  const app = express();
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(pinoHttp({
    redact: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken', 'req.body.samples'],
    genReqId: (request) => request.headers['x-request-id']?.toString() ?? crypto.randomUUID(),
  }));
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: false }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health/live', (_request, response) => response.json({ status: 'ok' }));
  app.get('/health/ready', asyncHandler(async (_request, response) => {
    await context.dataSource.query('SELECT 1');
    response.json({ status: 'ready' });
  }));
  app.get('/openapi.json', (_request, response) => response.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use('/api/v1/auth', authRouter(context));
  app.use('/api/v1', authenticate(context));
  app.use('/api/v1/users', userRouter(context));
  app.use('/api/v1/ports', portRouter(context));
  app.use('/api/v1/routes', routeRouter(context));
  app.use('/api/v1/locations', locationRouter(context));
  app.use('/api/v1/traffic', trafficRouter(context));
  app.use('/api/v1/alerts', alertRouter(context));
  app.use('/api/v1/conversations', messageRouter(context));
  app.use('/api/v1/admin', requireRole(UserRole.Admin), adminRouter(context));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
