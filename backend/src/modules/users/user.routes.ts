import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/errors.js';
import { LocationSample, User } from '../../database/entities.js';

function serialize(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    locationConsent: user.locationConsent,
    locationConsentAt: user.locationConsentAt,
    shareActivePosition: user.shareActivePosition,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function userRouter(context: AppContext): Router {
  const router = Router();
  router.get('/me', asyncHandler(async (request, response) => {
    const user = await context.dataSource.getRepository(User).findOneBy({ id: request.auth!.id });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
    response.json(serialize(user));
  }));
  router.patch('/me', asyncHandler(async (request, response) => {
    const input = z.object({ displayName: z.string().trim().min(2).max(120) }).parse(request.body);
    const repository = context.dataSource.getRepository(User);
    const user = await repository.findOneByOrFail({ id: request.auth!.id });
    user.displayName = input.displayName;
    response.json(serialize(await repository.save(user)));
  }));
  router.delete('/me/location-history', asyncHandler(async (request, response) => {
    await context.dataSource.getRepository(LocationSample).delete({ userId: request.auth!.id });
    response.status(204).send();
  }));
  return router;
}
