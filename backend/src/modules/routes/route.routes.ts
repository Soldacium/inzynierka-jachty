import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/errors.js';
import { coordinateSchema, point } from '../../common/geo.js';
import { RoutePoint, RouteStatus, SailingRoute } from '../../database/entities.js';

const routeInput = z.object({
  name: z.string().trim().min(2).max(160),
  status: z.enum(RouteStatus).default(RouteStatus.Draft),
  points: z.array(coordinateSchema.extend({ label: z.string().trim().max(160).nullable().optional() })).min(2).max(100),
  startedAt: z.coerce.date().nullable().optional(),
  finishedAt: z.coerce.date().nullable().optional(),
});

function lineFrom(points: Array<{ latitude: number; longitude: number }>) {
  return { type: 'LineString' as const, coordinates: points.map((item) => [item.longitude, item.latitude]) };
}

async function distanceMeters(context: AppContext, path: ReturnType<typeof lineFrom>): Promise<number> {
  const rows = await context.dataSource.query<Array<{ distance: string }>>(
    `SELECT ST_Length(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography) AS distance`,
    [JSON.stringify(path)],
  );
  return Number(rows[0]?.distance ?? 0);
}

async function ownedRoute(context: AppContext, id: string, userId: string) {
  const route = await context.dataSource.getRepository(SailingRoute).findOne({
    where: { id, userId }, relations: { points: true }, order: { points: { position: 'ASC' } },
  });
  if (!route) throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route was not found.');
  return route;
}

export function routeRouter(context: AppContext): Router {
  const router = Router();
  router.get('/', asyncHandler(async (request, response) => {
    const items = await context.dataSource.getRepository(SailingRoute).find({
      where: { userId: request.auth!.id }, order: { updatedAt: 'DESC' }, take: 100,
    });
    response.json({ items });
  }));
  router.post('/', asyncHandler(async (request, response) => {
    const input = routeInput.parse(request.body);
    const path = lineFrom(input.points);
    const route = await context.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(SailingRoute).save({
        userId: request.auth!.id,
        name: input.name,
        status: input.status,
        path,
        distanceMeters: await distanceMeters(context, path),
        startedAt: input.startedAt ?? null,
        finishedAt: input.finishedAt ?? null,
      });
      await manager.getRepository(RoutePoint).save(input.points.map((item, position) => ({
        routeId: saved.id, position, location: point(item.latitude, item.longitude), label: item.label ?? null,
      })));
      return manager.getRepository(SailingRoute).findOneOrFail({ where: { id: saved.id }, relations: { points: true } });
    });
    response.status(201).json(route);
  }));
  router.get('/:id', asyncHandler(async (request, response) => {
    response.json(await ownedRoute(context, z.uuid().parse(request.params.id), request.auth!.id));
  }));
  router.patch('/:id', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    await ownedRoute(context, id, request.auth!.id);
    const input = routeInput.partial().parse(request.body);
    const updated = await context.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(SailingRoute);
      const route = await repository.findOneByOrFail({ id, userId: request.auth!.id });
      if (input.name !== undefined) route.name = input.name;
      if (input.status === RouteStatus.Active) {
        const now = new Date();
        await repository.createQueryBuilder().update()
          .set({ status: RouteStatus.Completed, finishedAt: now })
          .where('user_id = :userId AND id != :id AND status = :status', { userId: request.auth!.id, id, status: RouteStatus.Active })
          .execute();
        route.status = RouteStatus.Active;
        route.startedAt = input.startedAt ?? route.startedAt ?? now;
        route.finishedAt = null;
      } else if (input.status !== undefined) {
        route.status = input.status;
        if (input.status === RouteStatus.Completed) route.finishedAt = input.finishedAt ?? route.finishedAt ?? new Date();
      }
      if (input.startedAt !== undefined && input.status !== RouteStatus.Active) route.startedAt = input.startedAt;
      if (input.finishedAt !== undefined && input.status !== RouteStatus.Active) route.finishedAt = input.finishedAt;
      if (input.points) {
        const path = lineFrom(input.points);
        route.path = path;
        route.distanceMeters = await distanceMeters(context, path);
        await manager.getRepository(RoutePoint).delete({ routeId: id });
        await manager.getRepository(RoutePoint).save(input.points.map((item, position) => ({
          routeId: id, position, location: point(item.latitude, item.longitude), label: item.label ?? null,
        })));
      }
      await repository.save(route);
      return repository.findOneOrFail({ where: { id }, relations: { points: true } });
    });
    response.json(updated);
  }));
  router.delete('/:id', asyncHandler(async (request, response) => {
    const result = await context.dataSource.getRepository(SailingRoute).delete({ id: z.uuid().parse(request.params.id), userId: request.auth!.id });
    if (!result.affected) throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route was not found.');
    response.status(204).send();
  }));
  router.get('/:id/context', asyncHandler(async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    await ownedRoute(context, id, request.auth!.id);
    const { distanceMeters: radius } = z.object({ distanceMeters: z.coerce.number().int().min(100).max(50_000).default(5_000) }).parse(request.query);
    const [ports, alerts] = await Promise.all([
      context.dataSource.query(
        `SELECT p.* FROM ports p JOIN sailing_routes r ON r.id = $1
         WHERE p.status = 'active' AND ST_DWithin(p.location::geography, r.path::geography, $2)`, [id, radius],
      ),
      context.dataSource.query(
        `SELECT a.* FROM alerts a JOIN sailing_routes r ON r.id = $1
         WHERE a.status IN ('pending','confirmed') AND (a.valid_until IS NULL OR a.valid_until > now())
         AND ST_DWithin(a.location::geography, r.path::geography, $2)`, [id, radius],
      ),
    ]);
    response.json({ ports, alerts, distanceMeters: radius });
  }));
  return router;
}
