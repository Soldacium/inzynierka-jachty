import { useEffect } from 'react';
import { Alert as NativeAlert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Body, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { useRoutes } from '@/src/features/data/hooks';
import { useAuthStore } from '@/src/stores/auth.store';
import { useTrackingStore } from '@/src/stores/tracking.store';
import { spacing } from '@/src/constants/theme';
import { strings } from '@/src/constants/strings';
import { formatDate, formatDistance } from '@/src/utils/format';
import { useMapStore } from '@/src/stores/map.store';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user); const logout = useAuthStore((state) => state.logout); const routes = useRoutes(); const trackingActive = useTrackingStore((state) => state.active); const trackingChecking = useTrackingStore((state) => state.checking); const refreshTracking = useTrackingStore((state) => state.refresh); const startTracking = useTrackingStore((state) => state.start);
  const mapStyle = useMapStore((state) => state.mapStyle); const setMapStyle = useMapStore((state) => state.setMapStyle);
  useEffect(() => { void refreshTracking(); }, [refreshTracking]);
  if (!user) return <Screen><LoadingState /></Screen>;
  const enableLocation = async () => {
    const result = await startTracking();
    if (result !== 'started') NativeAlert.alert('Nie uruchomiono lokalizacji', 'Włącz lokalizację oraz dostęp w tle w ustawieniach urządzenia.');
  };
  return <Screen><Title>Profil</Title><Card><Subtitle>{user.displayName}</Subtitle><Body>{user.email}</Body><Badge text={user.role} tone={user.role === 'port_manager' ? 'success' : 'info'} /></Card>
    <Card><Subtitle>Udostępnianie lokalizacji</Subtitle><Body>Pozycja łodzi jest automatycznie aktualizowana co około minutę.</Body><Body muted>Na publicznej mapie jest prezentowana anonimowo, bez danych konta ani rejsu. Zwykłe próbki są automatycznie usuwane po dobie.</Body>
      {trackingChecking ? <Badge text="Sprawdzanie dostępu do GPS" /> : trackingActive ? <Badge text="Lokalizacja w tle aktywna" tone="success" /> : <Badge text="Brak dostępu systemowego do GPS" tone="warning" />}
      {!trackingActive && !trackingChecking ? <Button title="Włącz lokalizację" onPress={() => void enableLocation()} variant="secondary" /> : null}</Card>
    <Card><Subtitle>Wygląd mapy</Subtitle><Body muted>Szczegółowy styl pokazuje więcej nazw, dróg i obiektów. Jasny styl jest czytelniejszy pod warstwami ruchu.</Body><View style={styles.headingRow}><View style={styles.flex}><Button title="Szczegółowa" onPress={() => setMapStyle('detailed')} variant={mapStyle === 'detailed' ? 'primary' : 'secondary'} /></View><View style={styles.flex}><Button title="Jasna" onPress={() => setMapStyle('simple')} variant={mapStyle === 'simple' ? 'primary' : 'secondary'} /></View></View></Card>
    {user.role === 'port_manager' || user.role === 'admin' ? <Button title="Otwórz panel portu" onPress={() => router.push('/manager')} /> : null}
    <View style={styles.headingRow}><Subtitle>Zapisane trasy</Subtitle><Button title="Nowa" onPress={() => router.push('/routes/planner')} variant="secondary" /></View>
    {routes.isError ? <ErrorState message="Nie udało się pobrać tras." retry={() => void routes.refetch()} /> : routes.data?.items.length ? routes.data.items.map((route) => <Card key={route.id} onPress={() => router.push({ pathname: '/routes/[id]', params: { id: route.id } })}><Subtitle>{route.name}</Subtitle><Body>{formatDistance(route.distanceMeters)}</Body><Body muted>Aktualizacja: {formatDate(route.updatedAt)}</Body></Card>) : <EmptyState message="Nie masz zapisanych tras." />}
    <Body muted>{strings.appName} nie jest certyfikowanym systemem nawigacyjnym.</Body><Button title="Wyloguj się" onPress={() => void logout()} variant="secondary" />
  </Screen>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md } });
