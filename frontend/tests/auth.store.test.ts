import { api } from '@/src/api/client';
import { clearSessionTokens, getSessionTokens, setSessionTokens } from '@/src/services/session';
import { useAuthStore } from '@/src/stores/auth.store';
import type { AuthResponse } from '@/src/types/api';

jest.mock('@/src/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), publicPost: jest.fn() },
}));
jest.mock('@/src/services/session', () => ({
  clearSessionTokens: jest.fn(),
  getSessionTokens: jest.fn(),
  setSessionTokens: jest.fn(),
}));

const auth: AuthResponse = {
  user: {
    id: '25ab7b59-2897-46fd-a93b-42e0eb114a29',
    email: 'kapitan@example.com',
    displayName: 'Kapitan',
    role: 'sailor',
    locationConsent: true,
    shareActivePosition: true,
    createdAt: '2026-07-17T10:00:00.000Z',
  },
  tokens: { accessToken: 'access', refreshToken: 'refresh', accessTokenExpiresIn: 900 },
};

describe('sesja użytkownika', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'anonymous', user: null });
  });

  it('zapisuje tokeny i użytkownika po zalogowaniu', async () => {
    jest.mocked(api.publicPost).mockResolvedValue(auth);

    await useAuthStore.getState().login('kapitan@example.com', 'bezpieczne-haslo');

    expect(setSessionTokens).toHaveBeenCalledWith(auth.tokens);
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: auth.user });
  });

  it('czyści sesję nawet wtedy, gdy wylogowanie na serwerze się nie powiedzie', async () => {
    jest.mocked(getSessionTokens).mockResolvedValue(auth.tokens);
    jest.mocked(api.post).mockRejectedValue(new Error('offline'));
    useAuthStore.setState({ status: 'authenticated', user: auth.user });

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    expect(clearSessionTokens).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', user: null });
  });
});
