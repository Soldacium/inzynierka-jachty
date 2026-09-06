import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { bboxSchema } from '../../common/geo.js';
import { env } from '../../config/env.js';
import { gridSizeForZoom } from './traffic.service.js';

const trafficBounds = bboxSchema.and(z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})).refine((value) => value.north !== undefined, 'Bounding box is required.');

export function trafficRouter(context: AppContext): Router {
  const router = Router();
  router.get('/points', asyncHandler(async (request, response) => {
    const query = trafficBounds.parse(request.query);
    const bounds = { north: query.north!, south: query.south!, east: query.east!, west: query.west! };
    const from = query.from ?? new Date(Date.now() - 5 * 60_000);
    const to = query.to ?? new Date();
    if (env.TRAFFIC_DEMO_MODE) {
      const simulation = context.trafficSimulation.status();
      response.json({ items: context.trafficSimulation.points(bounds), calculatedAt: simulation.calculatedAt, demo: true, simulation });
      return;
    }
    const rows = await context.dataSource.query<Array<Record<string, unknown>>>(`
      SELECT DISTINCT ON (ls.user_id)
        substring(encode(digest(ls.user_id::text || date_trunc('day', now())::text, 'sha256'), 'hex'), 1, 16) AS "vesselId",
        round(ST_Y(ls.location)::numeric, $1)::double precision AS latitude,
        round(ST_X(ls.location)::numeric, $1)::double precision AS longitude,
        ls.speed, ls.heading, ls.accuracy, ls.recorded_at AS "recordedAt"
      FROM location_samples ls
      WHERE ls.recorded_at BETWEEN $2 AND $3
        AND ls.location && ST_MakeEnvelope($4, $5, $6, $7, 4326)
      ORDER BY ls.user_id, ls.recorded_at DESC
      LIMIT 1000
    `, [env.PUBLIC_POSITION_DECIMALS, from, to, query.west, query.south, query.east, query.north]);
    response.json({ items: rows, calculatedAt: new Date().toISOString() });
  }));
  router.get('/heatmap', asyncHandler(async (request, response) => {
    const query = trafficBounds.and(z.object({ zoom: z.coerce.number().min(1).max(22) })).parse(request.query);
    const bounds = { north: query.north!, south: query.south!, east: query.east!, west: query.west! };
    const from = query.from ?? new Date(Date.now() - 60 * 60_000);
    const to = query.to ?? new Date();
    const grid = gridSizeForZoom(query.zoom);
    if (env.TRAFFIC_DEMO_MODE) {
      const simulation = context.trafficSimulation.status();
      response.json({
        items: context.trafficSimulation.cells(bounds, query.zoom), calculatedAt: simulation.calculatedAt, minimumUsers: env.TRAFFIC_MIN_USERS,
        demo: true, simulation, debug: { gridSize: grid, privacyThreshold: env.TRAFFIC_MIN_USERS, bucketMinutes: 5 },
      });
      return;
    }
    const rows = await context.dataSource.query<Array<Record<string, unknown>>>(`
      WITH user_buckets AS (
        SELECT ls.user_id,
          date_bin('5 minutes', ls.recorded_at, timestamptz '2000-01-01') AS time_bucket,
          floor(ST_X(ls.location) / $1) * $1 AS cell_x,
          floor(ST_Y(ls.location) / $1) * $1 AS cell_y,
          count(*) AS samples
        FROM location_samples ls
        WHERE ls.recorded_at BETWEEN $2 AND $3
          AND ls.accuracy <= 100
          AND ls.location && ST_MakeEnvelope($4, $5, $6, $7, 4326)
        GROUP BY ls.user_id, time_bucket, cell_x, cell_y
      )
      SELECT cell_y + $1 / 2 AS latitude, cell_x + $1 / 2 AS longitude,
        sum(samples)::integer AS "sampleCount", count(DISTINCT user_id)::integer AS "uniqueUsers",
        LEAST(1.0, count(DISTINCT user_id)::double precision / 16.0) AS weight,
        CASE WHEN count(DISTINCT user_id) <= 5 THEN 'low'
             WHEN count(DISTINCT user_id) <= 15 THEN 'medium' ELSE 'high' END AS level
      FROM user_buckets
      GROUP BY cell_x, cell_y
      HAVING count(DISTINCT user_id) >= $8
      ORDER BY "uniqueUsers" DESC
      LIMIT 2000
    `, [grid, from, to, query.west, query.south, query.east, query.north, env.TRAFFIC_MIN_USERS]);
    response.json({ items: rows, calculatedAt: new Date().toISOString(), minimumUsers: env.TRAFFIC_MIN_USERS });
  }));
  router.get('/historical-ais', asyncHandler(async (request, response) => {
    const query = bboxSchema.and(z.object({ zoom: z.coerce.number().min(1).max(22) }))
      .refine((value) => value.north !== undefined, 'Bounding box is required.')
      .parse(request.query);
    const result = await context.historicalAis.cells({
      north: query.north!,
      south: query.south!,
      east: query.east!,
      west: query.west!,
    }, query.zoom);
    response.json(result);
  }));
  return router;
}
