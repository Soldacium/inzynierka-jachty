import { useEffect, type PropsWithChildren } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';
import * as Network from 'expo-network';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNetworkStore } from '@/src/stores/network.store';
import { colors, spacing } from '@/src/constants/theme';
import { strings } from '@/src/constants/strings';
import { SocketProvider } from './socket-provider';

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnReconnect: true }, mutations: { retry: 0 } } });

function Connectivity() {
  const { online, initialized, setNetwork } = useNetworkStore();
  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      const next = Boolean(state.isConnected && state.isInternetReachable !== false);
      setNetwork(next); onlineManager.setOnline(next);
    });
    void Network.getNetworkStateAsync().then((state) => setNetwork(Boolean(state.isConnected && state.isInternetReachable !== false)));
    return () => subscription.remove();
  }, [setNetwork]);
  return initialized && !online ? <Text accessibilityRole="alert" style={styles.offline}>{strings.offline}</Text> : null;
}

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => subscription.remove();
  }, []);
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><Connectivity /><SocketProvider>{children}</SocketProvider></QueryClientProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({ offline: { backgroundColor: colors.warning, color: colors.white, padding: spacing.sm, textAlign: 'center', fontWeight: '700' } });
