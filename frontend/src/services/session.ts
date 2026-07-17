import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@/src/types/api';

const key = 'na-fali.session.v1';
let memorySession: AuthTokens | null = null;

export async function getSessionTokens(): Promise<AuthTokens | null> {
  const raw = Platform.OS === 'web' ? memorySession && JSON.stringify(memorySession) : await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthTokens; } catch { await clearSessionTokens(); return null; }
}

export async function setSessionTokens(tokens: AuthTokens): Promise<void> {
  memorySession = tokens;
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(key, JSON.stringify(tokens), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function clearSessionTokens(): Promise<void> {
  memorySession = null;
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(key);
}
