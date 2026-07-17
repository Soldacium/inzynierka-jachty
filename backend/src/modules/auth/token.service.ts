import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import { UserRole } from '../../database/entities.js';
import { AppError } from '../../common/errors.js';
import type { AuthenticatedUser } from './auth.types.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export class TokenService {
  async createAccessToken(user: AuthenticatedUser): Promise<string> {
    return new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`)
      .sign(accessSecret);
  }

  createRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, accessSecret, { algorithms: ['HS256'] });
      if (!payload.sub || typeof payload.email !== 'string' || !Object.values(UserRole).includes(payload.role as UserRole)) {
        throw new Error('Invalid access token claims');
      }
      return { id: payload.sub, email: payload.email, role: payload.role as UserRole };
    } catch {
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.');
    }
  }
}
