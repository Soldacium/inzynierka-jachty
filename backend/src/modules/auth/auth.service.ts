import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { DataSource } from 'typeorm';
import { IsNull, MoreThan } from 'typeorm';
import { AppError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import { PasswordResetToken, RefreshToken, User, UserRole } from '../../database/entities.js';
import type { MailService } from '../../services/mail.service.js';
import type { AuthTokens } from './auth.types.js';
import { TokenService } from './token.service.js';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  locationConsent: boolean;
  shareActivePosition: boolean;
  createdAt: Date;
}

function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    locationConsent: user.locationConsent,
    shareActivePosition: user.shareActivePosition,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
  ) {}

  async register(input: { email: string; password: string; displayName: string }) {
    const users = this.dataSource.getRepository(User);
    const email = input.email.trim().toLowerCase();
    if (await users.exists({ where: { email } })) {
      throw new AppError(409, 'EMAIL_ALREADY_USED', 'An account with this email already exists.');
    }
    const user = users.create({
      email,
      displayName: input.displayName.trim(),
      passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
      role: UserRole.Sailor,
    });
    await users.save(user);
    return { user: publicUser(user), tokens: await this.issueSession(user) };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { email: input.email.trim().toLowerCase() },
    });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    if (user.isBlocked) {
      throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked.');
    }
    return { user: publicUser(user), tokens: await this.issueSession(user) };
  }

  async refresh(rawToken: string) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshToken);
      const stored = await repository.findOne({
        where: { tokenHash: this.tokens.hashOpaqueToken(rawToken), expiresAt: MoreThan(new Date()) },
        relations: { user: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stored || stored.revokedAt || stored.user.isBlocked) {
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
      }
      stored.revokedAt = new Date();
      const nextRaw = this.tokens.createRefreshToken();
      const next = manager.getRepository(RefreshToken).create({
        userId: stored.userId,
        tokenHash: this.tokens.hashOpaqueToken(nextRaw),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
      });
      await manager.getRepository(RefreshToken).save(next);
      stored.replacedById = next.id;
      await repository.save(stored);
      return {
        accessToken: await this.tokens.createAccessToken(stored.user),
        refreshToken: nextRaw,
        accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
      } satisfies AuthTokens;
    });
  }

  async logout(rawToken: string): Promise<void> {
    await this.dataSource.getRepository(RefreshToken).update(
      { tokenHash: this.tokens.hashOpaqueToken(rawToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async requestPasswordReset(emailInput: string): Promise<void> {
    const user = await this.dataSource.getRepository(User).findOne({ where: { email: emailInput.trim().toLowerCase() } });
    if (!user) return;

    const rawToken = randomBytes(32).toString('base64url');
    const repository = this.dataSource.getRepository(PasswordResetToken);
    const reset = repository.create({
      userId: user.id,
      tokenHash: this.tokens.hashOpaqueToken(rawToken),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    await repository.save(reset);
    await this.mail.sendPasswordReset(user.email, rawToken);
  }

  async resetPassword(rawToken: string, password: string): Promise<void> {
    const resets = this.dataSource.getRepository(PasswordResetToken);
    const reset = await resets.findOne({
      where: { tokenHash: this.tokens.hashOpaqueToken(rawToken), expiresAt: MoreThan(new Date()), usedAt: IsNull() },
      relations: { user: true },
    });
    if (!reset) throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset token is invalid or expired.');

    await this.dataSource.transaction(async (manager) => {
      reset.user.passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      reset.usedAt = new Date();
      await manager.getRepository(User).save(reset.user);
      await manager.getRepository(PasswordResetToken).save(reset);
      await manager.getRepository(RefreshToken).update({ userId: reset.userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    });
  }

  private async issueSession(user: User): Promise<AuthTokens> {
    const refreshToken = this.tokens.createRefreshToken();
    await this.dataSource.getRepository(RefreshToken).save({
      userId: user.id,
      tokenHash: this.tokens.hashOpaqueToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    });
    return {
      accessToken: await this.tokens.createAccessToken(user),
      refreshToken,
      accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
    };
  }
}
