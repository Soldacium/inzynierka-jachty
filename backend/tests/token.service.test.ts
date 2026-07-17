import { describe, expect, it } from 'vitest';
import { UserRole } from '../src/database/entities.js';
import { TokenService } from '../src/modules/auth/token.service.js';

describe('TokenService', () => {
  const service = new TokenService();
  const user = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'sailor@example.com',
    role: UserRole.Sailor,
  };

  it('round-trips authenticated user claims in an access token', async () => {
    const token = await service.createAccessToken(user);
    await expect(service.verifyAccessToken(token)).resolves.toEqual(user);
  });

  it('rejects a modified access token', async () => {
    const token = await service.createAccessToken(user);
    const modified = `${token.slice(0, -2)}xx`;
    await expect(service.verifyAccessToken(modified)).rejects.toMatchObject({ code: 'INVALID_ACCESS_TOKEN', status: 401 });
  });

  it('hashes refresh tokens deterministically without storing their plaintext', () => {
    const raw = service.createRefreshToken();
    expect(raw).not.toBe(service.hashOpaqueToken(raw));
    expect(service.hashOpaqueToken(raw)).toBe(service.hashOpaqueToken(raw));
    expect(service.hashOpaqueToken(raw)).toHaveLength(64);
  });
});
