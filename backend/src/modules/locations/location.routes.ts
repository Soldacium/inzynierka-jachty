import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { point } from '../../common/geo.js';
import { LocationSample, RouteStatus, SailingRoute } from '../../database/entities.js';

const maximumQueuedLocationAgeDays = 7;

const sampleSchema = z.object({
  clientGeneratedId: z.uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10_000),
  speed: z.number().min(0).max(100).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  recordedAt: z.coerce.date(),
}).superRefine((sample, context) => {
  const timestamp = sample.recordedAt.getTime();
  if (timestamp > Date.now() + 300_000) context.addIssue({ code: 'custom', message: 'recordedAt cannot be more than five minutes in the future.' });
  if (timestamp < Date.now() - maximumQueuedLocationAgeDays * 86_400_000) context.addIssue({ code: 'custom', message: 'recordedAt is older than the maximum offline queue window.' });
});

export function locationRouter(context: AppContext): Router {
  const router = Router();
  router.post('/batch', asyncHandler(async (request, response) => {
    const { samples } = z.object({ samples: z.array(sampleSchema).min(1).max(500) }).parse(request.body);
    const userId = request.auth!.id;

    const byId = new Map<string, (typeof samples)[number]>();
    const duplicateInPayload: string[] = [];
    for (const sample of samples) {
      if (byId.has(sample.clientGeneratedId)) duplicateInPayload.push(sample.clientGeneratedId);
      else byId.set(sample.clientGeneratedId, sample);
    }
    const unique = [...byId.values()];
    const timestamps = unique.map((sample) => sample.recordedAt.getTime());
    const oldest = new Date(Math.min(...timestamps));
    const newest = new Date(Math.max(...timestamps));
    const routes = await context.dataSource.getRepository(SailingRoute).createQueryBuilder('route')
      .where('route.user_id = :userId', { userId })
      .andWhere('route.status IN (:...statuses)', { statuses: [RouteStatus.Active, RouteStatus.Completed] })
      .andWhere('route.started_at IS NOT NULL AND route.started_at <= :newest', { newest })
      .andWhere('(route.finished_at IS NULL OR route.finished_at >= :oldest)', { oldest })
      .orderBy('route.started_at', 'DESC')
      .getMany();
    const routeFor = (recordedAt: Date) => routes.find((route) =>
      route.startedAt && route.startedAt <= recordedAt && (!route.finishedAt || route.finishedAt >= recordedAt));
    const ids = unique.map((sample) => sample.clientGeneratedId);
    const existingRows = await context.dataSource.getRepository(LocationSample).createQueryBuilder('sample')
      .select('sample.clientGeneratedId', 'clientGeneratedId')
      .where('sample.userId = :userId', { userId })
      .andWhere('sample.clientGeneratedId IN (:...ids)', { ids })
      .getRawMany<{ clientGeneratedId: string }>();
    const existing = new Set(existingRows.map((row) => row.clientGeneratedId));
    const pending = unique.filter((sample) => !existing.has(sample.clientGeneratedId));

    if (pending.length) {
      await context.dataSource.getRepository(LocationSample).createQueryBuilder().insert().values(pending.map((sample) => ({
        userId,
        routeId: routeFor(sample.recordedAt)?.id ?? null,
        clientGeneratedId: sample.clientGeneratedId,
        location: point(sample.latitude, sample.longitude),
        accuracy: sample.accuracy,
        speed: sample.speed ?? null,
        heading: sample.heading ?? null,
        recordedAt: sample.recordedAt,
      }))).orIgnore().execute();
    }
    context.emitToRoom('traffic:global', 'traffic:points_updated', { calculatedAt: new Date().toISOString() });
    response.status(202).json({
      acceptedClientGeneratedIds: pending.map((sample) => sample.clientGeneratedId),
      duplicateClientGeneratedIds: [...new Set([...existing, ...duplicateInPayload])],
    });
  }));
  return router;
}
