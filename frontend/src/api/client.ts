import { config } from '@/src/config/env';
import { clearSessionTokens, getSessionTokens, setSessionTokens } from '@/src/services/session';
import type { ApiErrorBody, AuthTokens } from '@/src/types/api';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details: Record<string, unknown> = {}) { super(message); }
}

let refreshPromise: Promise<AuthTokens | null> | null = null;

async function refreshSession(): Promise<AuthTokens | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = await getSessionTokens();
    if (!current) return null;
    const response = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!response.ok) { await clearSessionTokens(); return null; }
    const tokens = await response.json() as AuthTokens;
    await setSessionTokens(tokens);
    return tokens;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, authenticated = true, retry = true): Promise<T> {
  const tokens = authenticated ? await getSessionTokens() : null;
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');
  if (options.body) headers.set('content-type', 'application/json');
  if (tokens) headers.set('authorization', `Bearer ${tokens.accessToken}`);
  const response = await fetch(`${config.apiUrl}${path}`, { ...options, headers });
  if (response.status === 401 && authenticated && retry && await refreshSession()) return request<T>(path, options, true, false);
  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try { body = await response.json() as ApiErrorBody; } catch { /* non-JSON upstream error */ }
    throw new ApiError(response.status, body?.error.code ?? 'NETWORK_ERROR', body?.error.message ?? 'Nie udało się wykonać operacji.', body?.error.details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function body(value: unknown): string { return JSON.stringify(value); }

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, value?: unknown) => request<T>(path, { method: 'POST', body: value === undefined ? undefined : body(value) }),
  publicPost: <T>(path: string, value: unknown) => request<T>(path, { method: 'POST', body: body(value) }, false),
  patch: <T>(path: string, value: unknown) => request<T>(path, { method: 'PATCH', body: body(value) }),
  put: <T>(path: string, value: unknown) => request<T>(path, { method: 'PUT', body: body(value) }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function queryString(values: Record<string, string | number | boolean | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  const result = params.toString();
  return result ? `?${result}` : '';
}
