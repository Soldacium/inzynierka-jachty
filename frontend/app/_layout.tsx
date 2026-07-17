import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/src/features/location/background-task';
import { AppProviders } from '@/src/providers/app-providers';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors } from '@/src/constants/theme';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  useEffect(() => { void initialize(); }, [initialize]);
  return (
    <AppProviders>
      <Stack screenOptions={{ headerTintColor: colors.navy, headerBackTitle: 'Wróć', contentStyle: { backgroundColor: colors.foam } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ports/[id]" options={{ title: 'Port' }} />
        <Stack.Screen name="routes/planner" options={{ title: 'Zaplanuj trasę' }} />
        <Stack.Screen name="routes/[id]" options={{ title: 'Szczegóły trasy' }} />
        <Stack.Screen name="alerts/new" options={{ title: 'Nowe zgłoszenie', presentation: 'modal' }} />
        <Stack.Screen name="conversations/[id]" options={{ title: 'Rozmowa' }} />
        <Stack.Screen name="manager/index" options={{ title: 'Panel portu' }} />
        <Stack.Screen name="manager/edit/[portId]" options={{ title: 'Dane portu' }} />
        <Stack.Screen name="manager/availability/[portId]" options={{ title: 'Dostępność miejsc' }} />
        <Stack.Screen name="manager/notices/[portId]" options={{ title: 'Nowy komunikat' }} />
      </Stack>
      <StatusBar style="dark" />
    </AppProviders>
  );
}
