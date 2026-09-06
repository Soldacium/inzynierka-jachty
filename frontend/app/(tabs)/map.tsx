import { useMemo, useRef, useState } from 'react';
import { Alert as NativeAlert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MarineMap } from '@/src/features/map/marine-map';
import { HISTORICAL_AIS_MAX_DISPLAY_ZOOM } from '@/src/features/map/historical-ais.constants';
import { useHistoricalAis, useResetTrafficSimulation, useRoutes, useTraffic, useTrafficSimulation, useViewportAlerts, useViewportPorts } from '@/src/features/data/hooks';
import { useMapStore, type MapOverlay } from '@/src/stores/map.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { currentPosition, lastKnownPosition } from '@/src/features/location/location.service';
import { colors, radius, spacing } from '@/src/constants/theme';
import type { MapBounds, TrafficCell, TrafficPoint, TrafficResponse } from '@/src/types/api';
import { errorMessage, formatDate } from '@/src/utils/format';
import { distanceBetweenCoordinates } from '@/src/utils/geo';
import { config } from '@/src/config/env';

const initialBounds: MapBounds = { north: 55.2, south: 53.9, east: 19.8, west: 17.2, zoom: 8 };
const overlayLabels: Record<MapOverlay, string> = { route: 'Trasa', vessels: 'Jednostki', traffic: 'Ruch', historical: 'AIS 2024', alerts: 'Alerty' };

export default function MapScreen() {
  const [bounds, setBounds] = useState(initialBounds); const [focus, setFocus] = useState<[number, number] | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [selectedPortDistance, setSelectedPortDistance] = useState<number | null | undefined>(undefined);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const selectedPortIdRef = useRef<string | null>(null);
  const portSelectionRequest = useRef(0);
  const lastTraffic = useRef<Partial<Record<'points' | 'heatmap', TrafficResponse<TrafficPoint | TrafficCell>>>>({});
  const { activeOverlay, setActiveOverlay, alertFilter, setAlertFilter, mapStyle } = useMapStore();
  const user = useAuthStore((state) => state.user);
  const area = useMemo(() => ({ north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west }), [bounds]);
  const trafficMode = activeOverlay === 'traffic' ? 'heatmap' : 'points';
  const trafficVisible = activeOverlay === 'traffic' || activeOverlay === 'vessels';
  const historicalAisVisible = activeOverlay === 'historical' && bounds.zoom < HISTORICAL_AIS_MAX_DISPLAY_ZOOM;
  const ports = useViewportPorts(area); const alerts = useViewportAlerts(area, alertFilter === 'all' ? undefined : alertFilter); const traffic = useTraffic(bounds, trafficMode, trafficVisible); const historicalAis = useHistoricalAis(bounds, historicalAisVisible); const routes = useRoutes();
  if (traffic.data) lastTraffic.current[trafficMode] = traffic.data;
  const displayedTraffic = traffic.data ?? lastTraffic.current[trafficMode] ?? null;
  const mapTraffic = activeOverlay === 'historical' ? historicalAisVisible ? historicalAis.data?.items ?? [] : [] : displayedTraffic?.items ?? [];
  const isAdmin = user?.role === 'admin'; const simulation = useTrafficSimulation(isAdmin); const resetSimulation = useResetTrafficSimulation();
  const activeRoute = routes.data?.items.find((route) => route.status === 'active') ?? routes.data?.items.find((route) => route.status === 'planned');
  const locate = async () => { try { const result = await currentPosition(); setFocus([result.coords.longitude, result.coords.latitude]); } catch { NativeAlert.alert('Brak lokalizacji', 'Włącz dostęp do lokalizacji w ustawieniach urządzenia.'); } };
  const selectPort = (id: string) => {
    setSelectedAlertId(null);
    if (id === selectedPortIdRef.current) {
      portSelectionRequest.current += 1;
      selectedPortIdRef.current = null;
      setSelectedPortId(null);
      setSelectedPortDistance(undefined);
      return;
    }
    const port = ports.data?.items.find((item) => item.id === id);
    if (!port) return;
    const request = ++portSelectionRequest.current;
    selectedPortIdRef.current = id;
    setSelectedPortId(id);
    setSelectedPortDistance(undefined);
    void lastKnownPosition().then((position) => {
      if (request !== portSelectionRequest.current) return;
      if (!position) { setSelectedPortDistance(null); return; }
      setSelectedPortDistance(distanceBetweenCoordinates(
        [position.coords.longitude, position.coords.latitude],
        port.location.coordinates,
      ));
    }).catch(() => {
      if (request === portSelectionRequest.current) setSelectedPortDistance(null);
    });
  };
  const selectAlert = (id: string) => {
    portSelectionRequest.current += 1;
    selectedPortIdRef.current = null;
    setSelectedPortId(null);
    setSelectedPortDistance(undefined);
    setSelectedAlertId((current) => current === id ? null : id);
  };
  const selectOverlay = (overlay: MapOverlay) => {
    setActiveOverlay(overlay);
    if (overlay !== 'alerts') setSelectedAlertId(null);
  };
  const startDemoTraffic = async () => {
    try {
      await resetSimulation.mutateAsync();
      selectOverlay('vessels');
    } catch (reason) {
      NativeAlert.alert('Nie udało się uruchomić symulacji', errorMessage(reason));
    }
  };
  const simulationStatus = simulation.data ?? displayedTraffic?.simulation;
  return <View style={styles.container}>
    <MarineMap ports={ports.data?.items ?? []} alerts={alerts.data?.items ?? []} traffic={mapTraffic} route={activeRoute}
      activeOverlay={activeOverlay}
      focusCoordinate={focus} onBounds={setBounds} selectedPortId={selectedPortId} selectedPortDistance={selectedPortDistance}
      selectedAlertId={selectedAlertId} onAlert={selectAlert}
      onPort={selectPort} onPortDetails={(id) => router.push({ pathname: '/ports/[id]', params: { id } })} mapStyleUrl={config.mapStyles[mapStyle]} />
    <View style={styles.top}><Text style={styles.heading}>Bałtyk</Text>{activeOverlay === 'historical'
      ? <><Text style={styles.freshness}>Historyczna intensywność: HELCOM AIS 2024</Text>{!historicalAisVisible
        ? <Text style={styles.historical}>Oddal mapę — warstwa nie jest wyświetlana w dużym przybliżeniu.</Text>
        : historicalAis.isError
          ? <Pressable onPress={() => void historicalAis.refetch()}><Text style={styles.historicalError}>Nie udało się pobrać danych. Dotknij, aby ponowić.</Text></Pressable>
          : <Text style={styles.historical}>{historicalAis.isPending ? 'Wczytywanie…' : 'Roczny rozkład rejsów · skala względna dla widocznego obszaru'}</Text>}</>
      : <><Text style={styles.freshness}>Dane ruchu: {formatDate(displayedTraffic?.calculatedAt)}</Text>{displayedTraffic?.demo ? <Text style={styles.demo}>{simulationStatus?.running ? `SYMULACJA AKTYWNA · ${simulationStatus.vesselCount} jednostek` : `TRYB DEMO · syntetyczny ruch · próg prywatności ${displayedTraffic.minimumUsers ?? 3}`}</Text> : null}</>}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layers} contentContainerStyle={styles.layerContent}>
      {Object.entries(overlayLabels).map(([key, label]) => <Pressable key={key} onPress={() => selectOverlay(key as MapOverlay)} style={[styles.chip, activeOverlay === key && styles.chipActive]}><Text style={[styles.chipText, activeOverlay === key && styles.chipTextActive]}>{label}</Text></Pressable>)}
      {activeOverlay === 'alerts' ? <><Pressable onPress={() => { setSelectedAlertId(null); setAlertFilter(alertFilter === 'all' ? 'official' : alertFilter === 'official' ? 'user' : 'all'); }} style={styles.chip}><Text style={styles.chipText}>Źródło: {alertFilter === 'all' ? 'wszystkie' : alertFilter === 'official' ? 'oficjalne' : 'użytkownicy'}</Text></Pressable><View style={styles.alertLegend}><View style={[styles.legendDot, styles.officialDot]} /><Text style={styles.legendText}>oficjalne</Text><View style={[styles.legendDot, styles.userDot]} /><Text style={styles.legendText}>użytkownicy</Text></View></> : null}
    </ScrollView>
    <View style={styles.actions}>
      {isAdmin ? <Pressable accessibilityLabel="Resetuj i uruchom symulację ruchu" style={[styles.simulation, simulationStatus?.running && styles.simulationActive]} onPress={() => void startDemoTraffic()} disabled={resetSimulation.isPending}><Ionicons name="refresh" size={20} color={colors.white} /><Text style={styles.simulationText}>{resetSimulation.isPending ? 'Resetowanie…' : simulationStatus?.running ? 'Reset symulacji' : 'Uruchom symulację'}</Text></Pressable> : null}
      <Pressable accessibilityLabel="Wycentruj mapę" style={styles.round} onPress={() => void locate()}><Ionicons name="locate" size={24} color={colors.navy} /></Pressable>
      <Pressable accessibilityLabel="Zaplanuj trasę" style={styles.round} onPress={() => router.push('/routes/planner')}><Ionicons name="git-branch" size={24} color={colors.navy} /></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, top: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, backgroundColor: colors.overlay, borderRadius: radius.md, padding: 12 }, heading: { color: colors.white, fontSize: 21, fontWeight: '800' }, freshness: { color: colors.sky, fontSize: 12 }, demo: { color: '#FDE68A', fontSize: 11, fontWeight: '800', marginTop: 3 }, historical: { color: '#C4B5FD', fontSize: 11, fontWeight: '700', marginTop: 3 }, historicalError: { color: '#FCA5A5', fontSize: 11, fontWeight: '800', marginTop: 3 },
  layers: { position: 'absolute', top: 116, left: 0, right: 0, maxHeight: 48 }, layerContent: { paddingHorizontal: spacing.md, gap: spacing.sm }, chip: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: colors.line }, chipActive: { backgroundColor: colors.navy, borderColor: colors.navy }, chipText: { color: colors.navy, fontWeight: '700', fontSize: 12 }, chipTextActive: { color: colors.white },
  alertLegend: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line }, legendDot: { width: 9, height: 9, borderRadius: 5 }, officialDot: { backgroundColor: '#B91C1C' }, userDot: { backgroundColor: '#D97706', marginLeft: 4 }, legendText: { color: colors.navy, fontSize: 11, fontWeight: '700' },
  actions: { position: 'absolute', right: spacing.md, bottom: spacing.lg, gap: spacing.sm, alignItems: 'flex-end' }, round: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 }, simulation: { flexDirection: 'row', gap: 8, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 16, height: 44, alignItems: 'center', shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 }, simulationActive: { backgroundColor: '#047857' }, simulationText: { color: colors.white, fontWeight: '800', fontSize: 12 },
});
