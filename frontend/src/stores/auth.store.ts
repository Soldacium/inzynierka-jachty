import { create } from 'zustand';
import { api } from '@/src/api/client';
import { clearSessionTokens, getSessionTokens, setSessionTokens } from '@/src/services/session';
import type { AuthResponse, User } from '@/src/types/api';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';
interface AuthState {
  status: AuthStatus;
  user: User | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

async function acceptAuth(response: AuthResponse, set: (state: Partial<AuthState>) => void) {
  await setSessionTokens(response.tokens);
  set({ user: response.user, status: 'authenticated' });
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping', user: null,
  initialize: async () => {
    if (!await getSessionTokens()) { set({ status: 'anonymous', user: null }); return; }
    try { set({ user: await api.get<User>('/users/me'), status: 'authenticated' }); }
    catch { await clearSessionTokens(); set({ status: 'anonymous', user: null }); }
  },
  login: async (email, password) => acceptAuth(await api.publicPost<AuthResponse>('/auth/login', { email, password }), set),
  register: async (email, password, displayName) => acceptAuth(await api.publicPost<AuthResponse>('/auth/register', { email, password, displayName }), set),
  logout: async () => {
    const tokens = await getSessionTokens();
    try { if (tokens) await api.post('/auth/logout', { refreshToken: tokens.refreshToken }); }
    catch { /* Wylogowanie lokalne musi działać także bez sieci. */ }
    finally { await clearSessionTokens(); set({ status: 'anonymous', user: null }); }
  },
  updateUser: (user) => set({ user }),
}));
