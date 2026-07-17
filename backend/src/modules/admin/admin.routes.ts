import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/errors.js';
import { Alert, AlertStatus, Port, PortManager, PortStatus, User, UserRole } from '../../database/entities.js';

export function adminRouter(context: AppContext): Router {
  const router = Router();
  router.get('/users', asyncHandler(async (request, response) => {
    const { search } = z.object({ search: z.string().trim().max(320).optional() }).parse(request.query);
    const builder = context.dataSource.getRepository(User).createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.displayName', 'user.role', 'user.isBlocked', 'user.createdAt'])
      .orderBy('user.createdAt', 'DESC').limit(100);
    if (search) builder.where('user.email ILIKE :search OR user.displayName ILIKE :search', { search: `%${search}%` });
    response.json({ items: await builder.getMany() });
  }));
  router.get('/ports/pending', asyncHandler(async (_request, response) => {
    const items = await context.dataSource.getRepository(Port).find({ where: { status: PortStatus.Pending }, order: { createdAt: 'ASC' }, take: 100 });
    response.json({ items });
  }));
  router.patch('/users/:id/block', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const { blocked } = z.object({ blocked: z.boolean() }).parse(request.body);
    if (id === request.auth!.id && blocked) throw new AppError(400, 'CANNOT_BLOCK_SELF', 'An administrator cannot block their own account.');
    const result = await context.dataSource.getRepository(User).update({ id }, { isBlocked: blocked });
    if (!result.affected) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
    response.status(204).send();
  }));
  router.patch('/ports/:id/status', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const { status } = z.object({ status: z.enum(PortStatus) }).parse(request.body);
    const result = await context.dataSource.getRepository(Port).update({ id }, { status });
    if (!result.affected) throw new AppError(404, 'PORT_NOT_FOUND', 'Port was not found.');
    response.json(await context.dataSource.getRepository(Port).findOneByOrFail({ id }));
  }));
  router.post('/ports/:id/managers', asyncHandler(async (request, response) => {
    const portId = z.uuid().parse(request.params.id);
    const { userId } = z.object({ userId: z.uuid() }).parse(request.body);
    const user = await context.dataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
    if (user.role !== UserRole.PortManager) {
      user.role = UserRole.PortManager;
      await context.dataSource.getRepository(User).save(user);
    }
    const assignment = await context.dataSource.getRepository(PortManager).save({ portId, userId });
    response.status(201).json(assignment);
  }));
  router.delete('/ports/:portId/managers/:userId', asyncHandler(async (request, response) => {
    const { portId, userId } = z.object({ portId: z.uuid(), userId: z.uuid() }).parse(request.params);
    await context.dataSource.getRepository(PortManager).delete({ portId, userId });
    response.status(204).send();
  }));
  router.patch('/alerts/:id/status', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const { status } = z.object({ status: z.enum(AlertStatus) }).parse(request.body);
    const result = await context.dataSource.getRepository(Alert).update({ id }, { status });
    if (!result.affected) throw new AppError(404, 'ALERT_NOT_FOUND', 'Alert was not found.');
    const alert = await context.dataSource.getRepository(Alert).findOneByOrFail({ id });
    context.emitToRoom('alerts', 'alert:updated', alert);
    response.json(alert);
  }));
  return router;
}
