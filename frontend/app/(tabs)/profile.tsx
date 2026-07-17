import { useEffect } from 'react';
import { Alert as NativeAlert, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Body, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { useDeleteLocationHistory, useRoutes, useUpdatePrivacy } from '@/src/features/data/hooks';
import { useAuthStore } from '@/src/stores/auth.store';
import { useTrackingStore } from '@/src/stores/tracking.store';
import { revokeLocalTracking } from '@/src/features/location/location.service';
import { colors, spacing } from '@/src/constants/theme';
import { formatDate, formatDistance } from '@/src/utils/format';
import { useMapStore } from '@/src/stores/map.store';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user); const logout = useAuthStore((state) => state.logout); const privacy = useUpdatePrivacy(); const deletion = useDeleteLocationHistory(); const routes = useRoutes(); const trackingActive = useTrackingStore((state) => state.active); const refreshTracking = useTrackingStore((state) => state.refresh);
  const mapStyle = useMapStore((state) => state.mapStyle); const setMapStyle = useMapStore((state) => state.setMapStyle);
  useEffect(() => { void refreshTracking(); }, [refreshTracking]);
  if (!user) return <Screen><LoadingState /></Screen>;
  const setSharing = async (enabled: boolean) => {
    try {
      if (!enabled) await revokeLocalTracking();
      await privacy.mutateAsync({ locationConsent: enabled, shareActivePosition: enabled });
      await refreshTracking();
    } catch { NativeAlert.alert('Błąd', 'Nie udało się zmienić ustawień prywatności.'); }
  };
  const deleteHistory = () => NativeAlert.alert('Usuń historię lokalizacji?', 'Tej operacji nie można cofnąć.', [{ text: 'Anuluj', style: 'cancel' }, { text: 'Usuń', style: 'destructive', onPress: () => void deletion.mutateAsync().then(() => NativeAlert.alert('Usunięto historię')).catch(() => NativeAlert.alert('Błąd', 'Nie udało się usunąć historii.')) }]);
  return <Screen><Title>Profil</Title><Card><Subtitle>{user.displayName}</Subtitle><Body>{user.email}</Body><Badge text={user.role} tone={user.role === 'port_manager' ? 'success' : 'info'} /></Card>
    <Card><Subtitle>Prywatność lokalizacji</Subtitle><View style={styles.switchRow}><View style={styles.flex}><Body>Udostępniaj pozycję podczas aktywnego rejsu</Body><Body muted>Zgodę możesz cofnąć w każdej chwili.</Body></View><Switch value={user.locationConsent && user.shareActivePosition} onValueChange={(value) => void setSharing(value)} disabled={privacy.isPending} trackColor={{ true: colors.cyan }} /></View>
      {trackingActive ? <Badge text="Śledzenie w tle aktywne" tone="success" /> : <Badge text="Śledzenie wyłączone" />}
      <Button title="Usuń historię lokalizacji" onPress={deleteHistory} variant="danger" /></Card>
    <Card><Subtitle>Wygląd mapy</Subtitle><Body muted>Szczegółowy styl pokazuje więcej nazw, dróg i obiektów. Jasny styl jest czytelniejszy pod warstwami ruchu.</Body><View style={styles.headingRow}><View style={styles.flex}><Button title="Szczegółowa" onPress={() => setMapStyle('detailed')} variant={mapStyle === 'detailed' ? 'primary' : 'secondary'} /></View><View style={styles.flex}><Button title="Jasna" onPress={() => setMapStyle('simple')} variant={mapStyle === 'simple' ? 'primary' : 'secondary'} /></View></View></Card>
    {user.role === 'port_manager' || user.role === 'admin' ? <Button title="Otwórz panel portu" onPress={() => router.push('/manager')} /> : null}
    <View style={styles.headingRow}><Subtitle>Zapisane trasy</Subtitle><Button title="Nowa" onPress={() => router.push('/routes/planner')} variant="secondary" /></View>
    {routes.isError ? <ErrorState message="Nie udało się pobrać tras." retry={() => void routes.refetch()} /> : routes.data?.items.length ? routes.data.items.map((route) => <Card key={route.id} onPress={() => router.push({ pathname: '/routes/[id]', params: { id: route.id } })}><Subtitle>{route.name}</Subtitle><Body>{formatDistance(route.distanceMeters)}</Body><Body muted>Aktualizacja: {formatDate(route.updatedAt)}</Body></Card>) : <EmptyState message="Nie masz zapisanych tras." />}
    <Body muted>{'Na Fali'} nie jest certyfikowanym systemem nawigacyjnym.</Body><Button title="Wyloguj się" onPress={() => void logout()} variant="secondary" />
  </Screen>;
}
const styles = StyleSheet.create({ switchRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' }, flex: { flex: 1 }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md } });
