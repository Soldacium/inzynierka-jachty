import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/errors.js';
import { bboxSchema, bboxSql, coordinateSchema, point } from '../../common/geo.js';
import { Port, PortAvailability, PortFacility, PortNotice, PortStatus, UserRole } from '../../database/entities.js';
import { requireRole } from '../auth/auth.middleware.js';
import { requirePortManager } from './port.access.js';

const portBody = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(10_000).default(''),
  location: coordinateSchema,
  contactEmail: z.email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  vhfChannel: z.string().max(30).nullable().optional(),
});

async function portDetails(context: AppContext, id: string) {
  const port = await context.dataSource.getRepository(Port).findOne({
    where: { id },
    relations: { facilities: true },
  });
  if (!port) throw new AppError(404, 'PORT_NOT_FOUND', 'Port was not found.');
  const availability = await context.dataSource.getRepository(PortAvailability).findOne({ where: { portId: id }, order: { createdAt: 'DESC' } });
  return {
    ...port,
    availability: availability ? {
      ...availability,
      stale: Date.now() - availability.createdAt.getTime() > 6 * 3_600_000,
    } : null,
  };
}

export function portRouter(context: AppContext): Router {
  const router = Router();
  router.get('/', asyncHandler(async (request, response) => {
    const query = bboxSchema.and(z.object({ search: z.string().trim().max(160).optional() })).parse(request.query);
    const builder = context.dataSource.getRepository(Port).createQueryBuilder('port')
      .where('port.status = :status', { status: PortStatus.Active })
      .orderBy('port.name', 'ASC').limit(200);
    if (query.search) builder.andWhere('port.name ILIKE :search', { search: `%${query.search}%` });
    if (query.north !== undefined) builder.andWhere(bboxSql('port'), query);
    response.json({ items: await builder.getMany() });
  }));
  router.get('/managed', requireRole(UserRole.PortManager, UserRole.Admin), asyncHandler(async (request, response) => {
    const builder = context.dataSource.getRepository(Port).createQueryBuilder('port')
      .leftJoinAndSelect('port.facilities', 'facility')
      .orderBy('port.name', 'ASC');
    if (request.auth!.role === UserRole.PortManager) {
      builder.innerJoin('port.managers', 'manager', 'manager.user_id = :userId', { userId: request.auth!.id });
    }
    response.json({ items: await builder.getMany() });
  }));
  router.get('/:id', asyncHandler(async (request, response) => {
    response.json(await portDetails(context, z.uuid().parse(request.params.id)));
  }));
  router.post('/', asyncHandler(async (request, response) => {
    const input = portBody.parse(request.body);
    const port = context.dataSource.getRepository(Port).create({
      ...input,
      location: point(input.location.latitude, input.location.longitude),
      status: request.auth!.role === UserRole.Admin ? PortStatus.Active : PortStatus.Pending,
    });
    response.status(201).json(await context.dataSource.getRepository(Port).save(port));
  }));
  router.patch('/:id', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    await requirePortManager(context, request.auth!, id);
    const input = portBody.partial().extend({ status: z.enum(PortStatus).optional() }).parse(request.body);
    if (input.status && request.auth!.role !== UserRole.Admin) throw new AppError(403, 'FORBIDDEN', 'Only an administrator can change port status.');
    const repository = context.dataSource.getRepository(Port);
    const port = await repository.findOneBy({ id });
    if (!port) throw new AppError(404, 'PORT_NOT_FOUND', 'Port was not found.');
    Object.assign(port, input, input.location ? { location: point(input.location.latitude, input.location.longitude) } : {});
    response.json(await repository.save(port));
  }));
  router.delete('/:id', requireRole(UserRole.Admin), asyncHandler(async (request, response) => {
    const result = await context.dataSource.getRepository(Port).delete({ id: z.uuid().parse(request.params.id) });
    if (!result.affected) throw new AppError(404, 'PORT_NOT_FOUND', 'Port was not found.');
    response.status(204).send();
  }));
  router.get('/:id/availability', asyncHandler(async (request, response) => {
    const portId = z.uuid().parse(request.params.id);
    const availability = await context.dataSource.getRepository(PortAvailability).findOne({ where: { portId }, order: { createdAt: 'DESC' } });
    response.json(availability ?? null);
  }));
  router.post('/:id/availability', asyncHandler(async (request, response) => {
    const portId = z.uuid().parse(request.params.id);
    await requirePortManager(context, request.auth!, portId);
    const input = z.object({ availableSpots: z.number().int().min(0).nullable(), status: z.enum(['available', 'limited', 'full', 'unknown']) }).parse(request.body);
    const saved = await context.dataSource.getRepository(PortAvailability).save({ ...input, portId, updatedById: request.auth!.id });
    context.emitToRoom(`port:${portId}`, 'port:availability_updated', saved);
    response.status(201).json(saved);
  }));
  router.get('/:id/notices', asyncHandler(async (request, response) => {
    const portId = z.uuid().parse(request.params.id);
    const items = await context.dataSource.getRepository(PortNotice).createQueryBuilder('notice')
      .where('notice.port_id = :portId', { portId })
      .andWhere('(notice.valid_until IS NULL OR notice.valid_until > now())')
      .orderBy('notice.created_at', 'DESC').getMany();
    response.json({ items });
  }));
  router.post('/:id/notices', asyncHandler(async (request, response) => {
    const portId = z.uuid().parse(request.params.id);
    await requirePortManager(context, request.auth!, portId);
    const input = z.object({ title: z.string().trim().min(2).max(160), body: z.string().trim().min(2).max(10_000), validUntil: z.coerce.date().nullable().optional() }).parse(request.body);
    const notice = await context.dataSource.getRepository(PortNotice).save({ ...input, portId, authorId: request.auth!.id });
    context.emitToRoom(`port:${portId}`, 'port:notice_created', notice);
    response.status(201).json(notice);
  }));
  router.patch('/:id/notices/:noticeId', asyncHandler(async (request, response) => {
    const { id: portId, noticeId } = z.object({ id: z.uuid(), noticeId: z.uuid() }).parse(request.params);
    await requirePortManager(context, request.auth!, portId);
    const input = z.object({ title: z.string().trim().min(2).max(160).optional(), body: z.string().trim().min(2).max(10_000).optional(), validUntil: z.coerce.date().nullable().optional() }).parse(request.body);
    const repository = context.dataSource.getRepository(PortNotice);
    const notice = await repository.findOne({ where: { id: noticeId, portId } });
    if (!notice) throw new AppError(404, 'PORT_NOTICE_NOT_FOUND', 'Port notice was not found.');
    Object.assign(notice, input);
    response.json(await repository.save(notice));
  }));
  router.delete('/:id/notices/:noticeId', asyncHandler(async (request, response) => {
    const { id: portId, noticeId } = z.object({ id: z.uuid(), noticeId: z.uuid() }).parse(request.params);
    await requirePortManager(context, request.auth!, portId);
    const result = await context.dataSource.getRepository(PortNotice).delete({ id: noticeId, portId });
    if (!result.affected) throw new AppError(404, 'PORT_NOTICE_NOT_FOUND', 'Port notice was not found.');
    response.status(204).send();
  }));
  router.put('/:id/facilities/:code', asyncHandler(async (request, response) => {
    const portId = z.uuid().parse(request.params.id);
    await requirePortManager(context, request.auth!, portId);
    const code = z.string().trim().min(1).max(80).parse(request.params.code);
    const input = z.object({ name: z.string().trim().min(2).max(160), details: z.string().max(2_000).nullable().optional(), available: z.boolean() }).parse(request.body);
    const repository = context.dataSource.getRepository(PortFacility);
    let facility = await repository.findOne({ where: { portId, code } });
    facility = repository.create({ ...facility, ...input, portId, code });
    response.json(await repository.save(facility));
  }));
  return router;
}
