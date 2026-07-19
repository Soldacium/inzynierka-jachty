import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';

const registrationCredentials = z.object({ email: z.email(), password: z.string().min(10).max(128) });
const loginCredentials = z.object({ email: z.email(), password: z.string() });
const authLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

export function authRouter(context: AppContext): Router {
  const router = Router();
  router.use(authLimiter);

  router.post('/register', asyncHandler(async (request, response) => {
    const input = registrationCredentials.extend({ displayName: z.string().trim().min(2).max(120) }).parse(request.body);
    response.status(201).json(await context.authService.register(input));
  }));
  router.post('/login', asyncHandler(async (request, response) => {
    response.json(await context.authService.login(loginCredentials.parse(request.body)));
  }));
  router.post('/refresh', asyncHandler(async (request, response) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(32) }).parse(request.body);
    response.json(await context.authService.refresh(refreshToken));
  }));
  router.post('/logout', asyncHandler(async (request, response) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(32) }).parse(request.body);
    await context.authService.logout(refreshToken);
    response.status(204).send();
  }));
  router.post('/forgot-password', asyncHandler(async (request, response) => {
    const { email } = z.object({ email: z.email() }).parse(request.body);
    await context.authService.requestPasswordReset(email);
    response.status(202).json({ message: 'If the account exists, reset instructions have been sent.' });
  }));
  router.post('/reset-password', asyncHandler(async (request, response) => {
    const { token, password } = z.object({ token: z.string().min(32), password: z.string().min(10).max(128) }).parse(request.body);
    await context.authService.resetPassword(token, password);
    response.status(204).send();
  }));
  return router;
}
