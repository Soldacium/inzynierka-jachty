import { useEffect, useMemo, useState } from 'react';
import { Alert as NativeAlert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MarineMap } from '@/src/features/map/marine-map';
import { useAlerts, usePorts, useRoutes, useTraffic } from '@/src/features/data/hooks';
import { useMapStore, type MapOverlay } from '@/src/stores/map.store';
import { useTrackingStore } from '@/src/stores/tracking.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { currentPosition } from '@/src/features/location/location.service';
import { colors, radius, spacing } from '@/src/constants/theme';
import type { MapBounds } from '@/src/types/api';
import { formatDate } from '@/src/utils/format';
import { config } from '@/src/config/env';

const initialBounds: MapBounds = { north: 55.2, south: 53.9, east: 19.8, west: 17.2, zoom: 8 };
const overlayLabels: Record<MapOverlay, string> = { route: 'Trasa', vessels: 'Jednostki', traffic: 'Ruch', alerts: 'Alerty' };

export default function MapScreen() {
  const [bounds, setBounds] = useState(initialBounds); const [focus, setFocus] = useState<[number, number] | null>(null);
  const { activeOverlay, setActiveOverlay, alertFilter, setAlertFilter, mapStyle } = useMapStore();
  const trackingActive = useTrackingStore((state) => state.active); const refreshTracking = useTrackingStore((state) => state.refresh); const startTracking = useTrackingStore((state) => state.start); const stopTracking = useTrackingStore((state) => state.stop); const user = useAuthStore((state) => state.user);
  useEffect(() => { void refreshTracking(); }, [refreshTracking]);
  const area = useMemo(() => ({ north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west }), [bounds]);
  const trafficMode = activeOverlay === 'traffic' ? 'heatmap' : 'points';
  const trafficVisible = activeOverlay === 'traffic' || activeOverlay === 'vessels';
  const ports = usePorts('', area); const alerts = useAlerts(area, alertFilter === 'all' ? undefined : alertFilter); const traffic = useTraffic(bounds, trafficMode, trafficVisible); const routes = useRoutes();
  const activeRoute = routes.data?.items.find((route) => route.status === 'active') ?? routes.data?.items.find((route) => route.status === 'planned');
  const locate = async () => { try { const result = await currentPosition(); setFocus([result.coords.longitude, result.coords.latitude]); } catch { NativeAlert.alert('Brak lokalizacji', 'Włącz dostęp do lokalizacji w ustawieniach urządzenia.'); } };
  const toggleTracking = async () => {
    if (trackingActive) { await stopTracking(); return; }
    if (!user?.locationConsent || !user.shareActivePosition) { NativeAlert.alert('Wymagana zgoda', 'Włącz udostępnianie pozycji w profilu przed rozpoczęciem rejsu.'); return; }
    NativeAlert.alert('Lokalizacja w tle', 'Podczas aktywnego rejsu aplikacja zapisuje pozycję także po zminimalizowaniu.', [
      { text: 'Anuluj', style: 'cancel' }, { text: 'Kontynuuj', onPress: () => void startTracking().then((result) => { if (result !== 'started') NativeAlert.alert('Nie uruchomiono śledzenia', 'Sprawdź uprawnienia lokalizacji urządzenia.'); }) },
    ]);
  };
  return <View style={styles.container}>
    <MarineMap ports={ports.data?.items ?? []} alerts={alerts.data?.items ?? []} traffic={traffic.data?.items ?? []} route={activeRoute}
      activeOverlay={activeOverlay}
      focusCoordinate={focus} onBounds={setBounds} onPort={(id) => router.push({ pathname: '/ports/[id]', params: { id } })} mapStyleUrl={config.mapStyles[mapStyle]} />
    <View style={styles.top}><Text style={styles.heading}>Bałtyk</Text><Text style={styles.freshness}>Dane ruchu: {formatDate(traffic.data?.calculatedAt)}</Text>{traffic.data?.demo ? <Text style={styles.demo}>TRYB DEMO · syntetyczny ruch · próg prywatności {traffic.data.minimumUsers ?? 3}</Text> : null}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layers} contentContainerStyle={styles.layerContent}>
      {Object.entries(overlayLabels).map(([key, label]) => <Pressable key={key} onPress={() => setActiveOverlay(key as MapOverlay)} style={[styles.chip, activeOverlay === key && styles.chipActive]}><Text style={[styles.chipText, activeOverlay === key && styles.chipTextActive]}>{label}</Text></Pressable>)}
      {activeOverlay === 'alerts' ? <Pressable onPress={() => setAlertFilter(alertFilter === 'all' ? 'official' : alertFilter === 'official' ? 'user' : 'all')} style={styles.chip}><Text style={styles.chipText}>Źródło: {alertFilter === 'all' ? 'wszystkie' : alertFilter === 'official' ? 'oficjalne' : 'użytkownicy'}</Text></Pressable> : null}
    </ScrollView>
    <View style={styles.actions}>
      <Pressable accessibilityLabel="Wycentruj mapę" style={styles.round} onPress={() => void locate()}><Ionicons name="locate" size={24} color={colors.navy} /></Pressable>
      <Pressable accessibilityLabel="Zaplanuj trasę" style={styles.round} onPress={() => router.push('/routes/planner')}><Ionicons name="git-branch" size={24} color={colors.navy} /></Pressable>
      <Pressable accessibilityLabel={trackingActive ? 'Zatrzymaj rejs' : 'Rozpocznij rejs'} style={[styles.tracking, trackingActive && styles.trackingActive]} onPress={() => void toggleTracking()}><Ionicons name={trackingActive ? 'stop' : 'navigate'} size={22} color={colors.white} /><Text style={styles.trackingText}>{trackingActive ? 'Zatrzymaj' : 'Start rejsu'}</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, top: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, backgroundColor: colors.overlay, borderRadius: radius.md, padding: 12 }, heading: { color: colors.white, fontSize: 21, fontWeight: '800' }, freshness: { color: colors.sky, fontSize: 12 }, demo: { color: '#FDE68A', fontSize: 11, fontWeight: '800', marginTop: 3 },
  layers: { position: 'absolute', top: 84, left: 0, right: 0, maxHeight: 48 }, layerContent: { paddingHorizontal: spacing.md, gap: spacing.sm }, chip: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: colors.line }, chipActive: { backgroundColor: colors.navy, borderColor: colors.navy }, chipText: { color: colors.navy, fontWeight: '700', fontSize: 12 }, chipTextActive: { color: colors.white },
  actions: { position: 'absolute', right: spacing.md, bottom: spacing.lg, gap: spacing.sm, alignItems: 'flex-end' }, round: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 }, tracking: { flexDirection: 'row', gap: 8, backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 18, height: 48, alignItems: 'center' }, trackingActive: { backgroundColor: colors.danger }, trackingText: { color: colors.white, fontWeight: '800' },
});
