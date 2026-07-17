import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/errors.js';
import { bboxSchema, bboxSql, coordinateSchema, point } from '../../common/geo.js';
import { Alert, AlertSeverity, AlertSource, AlertStatus, UserRole } from '../../database/entities.js';
import { requirePortManager } from '../ports/port.access.js';
import { alertSourceForRole, enforceAlertQuota } from './alert.service.js';

const alertInput = z.object({
  type: z.enum(['obstacle', 'failure', 'port_disruption', 'accident', 'closed_area', 'emergency_stop']),
  description: z.string().trim().min(3).max(5_000),
  location: coordinateSchema,
  severity: z.enum(AlertSeverity).default(AlertSeverity.Medium),
  portId: z.uuid().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
});

export function alertRouter(context: AppContext): Router {
  const router = Router();
  router.get('/', asyncHandler(async (request, response) => {
    const query = bboxSchema.and(z.object({ status: z.enum(AlertStatus).optional(), source: z.enum(AlertSource).optional() })).parse(request.query);
    const builder = context.dataSource.getRepository(Alert).createQueryBuilder('alert')
      .where('alert.status IN (:...statuses)', { statuses: query.status ? [query.status] : [AlertStatus.Pending, AlertStatus.Confirmed] })
      .andWhere('(alert.valid_until IS NULL OR alert.valid_until > now())')
      .orderBy('alert.created_at', 'DESC').limit(500);
    if (query.north !== undefined) builder.andWhere(bboxSql('alert'), query);
    if (query.source) builder.andWhere('alert.source = :source', { source: query.source });
    response.json({ items: await builder.getMany() });
  }));
  router.post('/', asyncHandler(async (request, response) => {
    const input = alertInput.parse(request.body);
    await enforceAlertQuota(context.dataSource, request.auth!.id);
    const alert = await context.dataSource.getRepository(Alert).save({
      ...input,
      portId: input.portId ?? null,
      validUntil: input.validUntil ?? null,
      location: point(input.location.latitude, input.location.longitude),
      status: AlertStatus.Confirmed,
      source: alertSourceForRole(request.auth!.role),
      authorId: request.auth!.id,
    });
    context.emitToRoom('alerts', 'alert:created', alert);
    response.status(201).json(alert);
  }));
  router.patch('/:id', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const repository = context.dataSource.getRepository(Alert);
    const alert = await repository.findOneBy({ id });
    if (!alert) throw new AppError(404, 'ALERT_NOT_FOUND', 'Alert was not found.');
    const moderator = request.auth!.role === UserRole.Admin || request.auth!.role === UserRole.PortManager;
    if (!moderator && alert.authorId !== request.auth!.id) throw new AppError(403, 'FORBIDDEN', 'You cannot edit this alert.');
    if (request.auth!.role === UserRole.PortManager) {
      if (!alert.portId) throw new AppError(403, 'FORBIDDEN', 'Port managers can moderate only port alerts.');
      await requirePortManager(context, request.auth!, alert.portId);
    }
    const input = alertInput.partial().extend({ status: z.enum(AlertStatus).optional() }).parse(request.body);
    if (input.status && !moderator) throw new AppError(403, 'FORBIDDEN', 'Only a moderator can change alert status.');
    Object.assign(alert, input, input.location ? { location: point(input.location.latitude, input.location.longitude) } : {});
    const saved = await repository.save(alert);
    context.emitToRoom('alerts', 'alert:updated', saved);
    response.json(saved);
  }));
  router.delete('/:id', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const alert = await context.dataSource.getRepository(Alert).findOneBy({ id });
    if (!alert) throw new AppError(404, 'ALERT_NOT_FOUND', 'Alert was not found.');
    if (request.auth!.role !== UserRole.Admin && alert.authorId !== request.auth!.id) throw new AppError(403, 'FORBIDDEN', 'You cannot delete this alert.');
    await context.dataSource.getRepository(Alert).remove(alert);
    response.status(204).send();
  }));
  return router;
}
