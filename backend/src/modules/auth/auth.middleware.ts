import type { RequestHandler } from 'express';
import { AppError } from '../../common/errors.js';
import { User, UserRole } from '../../database/entities.js';
import type { AppContext } from '../../app-context.js';

export const authenticate = (context: AppContext): RequestHandler => async (request, _response, next) => {
  try {
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
    }
    const auth = await context.tokenService.verifyAccessToken(authorization.slice(7));
    const user = await context.dataSource.getRepository(User).findOne({ where: { id: auth.id } });
    if (!user || user.isBlocked) throw new AppError(401, 'INVALID_SESSION', 'Session is no longer active.');
    request.auth = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: UserRole[]): RequestHandler => (request, _response, next) => {
  if (!request.auth) return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.'));
  if (!roles.includes(request.auth.role)) return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
  next();
};
