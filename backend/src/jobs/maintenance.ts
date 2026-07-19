import type { DataSource } from 'typeorm';
import { env } from '../config/env.js';

export async function runMaintenance(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await manager.query(`UPDATE alerts SET status = 'expired', updated_at = now() WHERE valid_until < now() AND status IN ('pending', 'confirmed')`);
    await manager.query(`DELETE FROM location_samples WHERE route_id IS NULL AND recorded_at < now() - ($1 * interval '1 day')`, [env.LOCATION_RETENTION_DAYS]);
    await manager.query(`DELETE FROM traffic_cells WHERE bucket_start < now() - ($1 * interval '1 day')`, [env.TRAFFIC_RETENTION_DAYS]);
    await manager.query(`DELETE FROM refresh_tokens WHERE expires_at < now() OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days')`);
    await manager.query(`DELETE FROM password_reset_tokens WHERE expires_at < now() OR used_at IS NOT NULL`);
  });
}

export async function aggregateCurrentTraffic(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO traffic_cells (cell_key, center, sample_count, unique_users, level, bucket_start, calculated_at)
    SELECT concat(cell_x, ':', cell_y), ST_SetSRID(ST_MakePoint(cell_x + 0.005, cell_y + 0.005), 4326),
      sum(samples)::integer, count(DISTINCT user_id)::integer,
      CASE WHEN count(DISTINCT user_id) <= 5 THEN 'low'::traffic_level
           WHEN count(DISTINCT user_id) <= 15 THEN 'medium'::traffic_level ELSE 'high'::traffic_level END,
      date_bin('5 minutes', now(), timestamptz '2000-01-01'), now()
    FROM (
      SELECT user_id, floor(ST_X(location) / 0.01) * 0.01 AS cell_x,
        floor(ST_Y(location) / 0.01) * 0.01 AS cell_y, count(*) AS samples
      FROM location_samples
      WHERE recorded_at >= now() - interval '5 minutes' AND accuracy <= 100
      GROUP BY user_id, cell_x, cell_y
    ) source
    GROUP BY cell_x, cell_y
    HAVING count(DISTINCT user_id) >= $1
    ON CONFLICT (cell_key, bucket_start) DO UPDATE SET
      sample_count = EXCLUDED.sample_count, unique_users = EXCLUDED.unique_users,
      level = EXCLUDED.level, calculated_at = EXCLUDED.calculated_at
  `, [env.TRAFFIC_MIN_USERS]);
}
