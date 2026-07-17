import type { DataSource } from 'typeorm';
import { AppError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import { Alert, AlertSource, UserRole } from '../../database/entities.js';

export function alertSourceForRole(role: UserRole): AlertSource {
  return role === UserRole.Admin || role === UserRole.PortManager ? AlertSource.Official : AlertSource.User;
}

export async function enforceAlertQuota(dataSource: DataSource, userId: string): Promise<void> {
  const since = new Date(Date.now() - env.ALERT_CREATE_WINDOW_MINUTES * 60_000);
  const recent = await dataSource.getRepository(Alert).createQueryBuilder('alert')
    .where('alert.author_id = :userId', { userId })
    .andWhere('alert.created_at >= :since', { since })
    .getCount();
  if (recent >= env.ALERT_CREATE_LIMIT) {
    throw new AppError(429, 'ALERT_RATE_LIMITED', 'Too many alerts were created. Try again later.', {
      limit: env.ALERT_CREATE_LIMIT,
      windowMinutes: env.ALERT_CREATE_WINDOW_MINUTES,
    });
  }
}
