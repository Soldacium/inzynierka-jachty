import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/src/stores/auth.store';

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);
  if (status === 'authenticated') return <Redirect href="/(tabs)/map" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
