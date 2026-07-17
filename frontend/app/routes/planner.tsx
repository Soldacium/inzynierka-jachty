import { useState } from 'react';
import { Alert as NativeAlert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Field } from '@/src/components/ui';
import { useAlerts, useCreateRoute, usePorts } from '@/src/features/data/hooks';
import { currentPosition } from '@/src/features/location/location.service';
import { RouteEditorMap, type EditableRoutePoint } from '@/src/features/map/route-editor-map';
import { config } from '@/src/config/env';
import { useMapStore } from '@/src/stores/map.store';
import { colors, radius, spacing } from '@/src/constants/theme';
import { errorMessage } from '@/src/utils/format';

export default function RoutePlannerScreen() {
  const create = useCreateRoute();
  const ports = usePorts();
  const alerts = useAlerts();
  const mapStyle = useMapStore((state) => state.mapStyle);
  const [points, setPoints] = useState<EditableRoutePoint[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const placePoint = (coordinate: { latitude: number; longitude: number }) => {
    if (selectedIndex !== null) {
      setPoints((current) => current.map((item, index) => index === selectedIndex ? { ...item, ...coordinate } : item));
      return;
    }
    setPoints((current) => [...current, { ...coordinate, label: `Punkt ${current.length + 1}` }]);
    setSelectedIndex(points.length);
  };
  const selectPort = (port: { name: string; location: { coordinates: [number, number] } }) => {
    const [longitude, latitude] = port.location.coordinates;
    if (selectedIndex !== null) setPoints((current) => current.map((item, index) => index === selectedIndex ? { latitude, longitude, label: port.name } : item));
    else { setPoints((current) => [...current, { latitude, longitude, label: port.name }]); setSelectedIndex(points.length); }
  };
  const updateLabel = (label: string) => setPoints((current) => current.map((item, index) => index === selectedIndex ? { ...item, label } : item));
  const removeSelected = () => {
    if (selectedIndex === null) return;
    setPoints((current) => current.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(null);
  };
  const addCurrentPosition = async () => {
    try { const position = await currentPosition(); placePoint({ latitude: position.coords.latitude, longitude: position.coords.longitude }); }
    catch { NativeAlert.alert('Brak lokalizacji', 'Włącz dostęp do lokalizacji urządzenia.'); }
  };
  const submit = async () => {
    if (name.trim().length < 2) { setError('Nadaj trasie nazwę zawierającą co najmniej 2 znaki.'); return; }
    try { const route = await create.mutateAsync({ name: name.trim(), points: points.map((item) => ({ ...item, label: item.label.trim() || null })) }); router.replace({ pathname: '/routes/[id]', params: { id: route.id } }); }
    catch (reason) { setError(errorMessage(reason)); }
  };

  const selected = selectedIndex === null ? null : points[selectedIndex];
  return <View style={styles.container}>
    <RouteEditorMap points={points} selectedIndex={selectedIndex} ports={ports.data?.items ?? []} alerts={alerts.data?.items ?? []} mapStyleUrl={config.mapStyles[mapStyle]} onMapPress={placePoint} onPointPress={setSelectedIndex} onPortPress={selectPort} />
    <View style={styles.help}><Text style={styles.helpText}>{selected ? 'Dotknij mapy, aby przesunąć punkt.' : 'Dotknij mapy lub portu, aby dodać kolejny punkt.'}</Text></View>
    <View style={styles.panel}>
      {finishing ? <><Body>Nazwa trasy</Body><Field label="Nazwa" value={name} onChangeText={setName} placeholder="Rejs po Zatoce Gdańskiej" autoFocus />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<View style={styles.row}><View style={styles.flex}><Button title="Wróć do mapy" onPress={() => setFinishing(false)} variant="secondary" /></View><View style={styles.flex}><Button title="Zapisz" onPress={() => void submit()} disabled={create.isPending} /></View></View></>
        : selected ? <><Body>{selectedIndex === 0 ? 'Punkt startowy' : selectedIndex === points.length - 1 ? 'Ostatni punkt' : `Punkt ${selectedIndex! + 1}`}</Body><Field label="Nazwa punktu" value={selected.label} onChangeText={updateLabel} /><View style={styles.row}><View style={styles.flex}><Button title="Usuń" onPress={removeSelected} variant="danger" /></View><View style={styles.flex}><Button title="Gotowe" onPress={() => setSelectedIndex(null)} /></View></View></>
        : <><Body>{points.length} {points.length === 1 ? 'punkt' : 'punkty'} · kliknij punkt, aby go edytować lub usunąć</Body><View style={styles.row}><View style={styles.flex}><Button title="Moja pozycja" onPress={() => void addCurrentPosition()} variant="secondary" /></View><View style={styles.flex}><Button title="Zakończ trasę" onPress={() => setFinishing(true)} disabled={points.length < 2} /></View></View></>}
    </View>
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, help: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, backgroundColor: colors.overlay, padding: spacing.sm, borderRadius: radius.md }, helpText: { color: colors.white, textAlign: 'center', fontWeight: '700' }, panel: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, backgroundColor: colors.foam, padding: spacing.md, borderRadius: radius.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.line }, row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 }, error: { color: colors.danger } });
