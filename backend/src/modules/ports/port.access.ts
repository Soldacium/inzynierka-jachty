import type { AppContext } from '../../app-context.js';
import { AppError } from '../../common/errors.js';
import { PortManager, UserRole } from '../../database/entities.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

export async function requirePortManager(context: AppContext, auth: AuthenticatedUser, portId: string): Promise<void> {
  if (auth.role === UserRole.Admin) return;
  if (auth.role !== UserRole.PortManager) throw new AppError(403, 'PORT_ACCESS_DENIED', 'You cannot manage this port.');
  const assigned = await context.dataSource.getRepository(PortManager).exists({ where: { portId, userId: auth.id } });
  if (!assigned) throw new AppError(403, 'PORT_ACCESS_DENIED', 'You can manage only assigned ports.');
}
