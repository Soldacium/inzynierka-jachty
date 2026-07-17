import { useState } from 'react';
import { Alert as NativeAlert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { Body, Button, Field, Screen, Title } from '@/src/components/ui';
import { useCreateAlert } from '@/src/features/data/hooks';
import { currentPosition } from '@/src/features/location/location.service';
import { CoordinatePickerMap, type PickedCoordinate } from '@/src/features/map/coordinate-picker-map';
import { config } from '@/src/config/env';
import { useMapStore } from '@/src/stores/map.store';
import { colors, radius, spacing } from '@/src/constants/theme';
import { errorMessage } from '@/src/utils/format';

const types = [{ value: 'obstacle', label: 'Przeszkoda' }, { value: 'failure', label: 'Awaria' }, { value: 'port_disruption', label: 'Utrudnienie portowe' }, { value: 'accident', label: 'Wypadek' }, { value: 'closed_area', label: 'Obszar zamknięty' }, { value: 'emergency_stop', label: 'Postój awaryjny' }];
const schema = z.object({ description: z.string().trim().min(3), latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) });
export default function NewAlertScreen() {
  const create = useCreateAlert(); const [type, setType] = useState('obstacle'); const [description, setDescription] = useState(''); const [latitude, setLatitude] = useState(''); const [longitude, setLongitude] = useState(''); const [error, setError] = useState('');
  const mapStyle = useMapStore((state) => state.mapStyle);
  const picked = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && latitude !== '' && longitude !== '' ? { latitude: Number(latitude), longitude: Number(longitude) } : null;
  const pick = (value: PickedCoordinate) => { setLatitude(value.latitude.toFixed(6)); setLongitude(value.longitude.toFixed(6)); };
  const locate = async () => { try { const position = await currentPosition(); setLatitude(String(position.coords.latitude)); setLongitude(String(position.coords.longitude)); } catch { NativeAlert.alert('Brak lokalizacji', 'Podaj współrzędne ręcznie.'); } };
  const submit = async () => {
    const parsed = schema.safeParse({ description, latitude, longitude }); if (!parsed.success) { setError('Uzupełnij opis i poprawne współrzędne.'); return; }
    try { await create.mutateAsync({ type, ...parsed.data, severity: 'medium' }); router.back(); } catch (reason) { setError(errorMessage(reason)); }
  };
  return <Screen><Title>Nowe zgłoszenie</Title><Body muted>Zgłoszenie pojawi się od razu jako alert użytkownika. Obowiązuje limit 5 zgłoszeń na 10 minut.</Body><Body muted>Nie używaj zgłoszenia jako zamiennika wezwania służb ratunkowych.</Body>
    <View style={styles.types}>{types.map((item) => <Pressable key={item.value} onPress={() => setType(item.value)} style={[styles.type, type === item.value && styles.active]}><Text style={[styles.typeText, type === item.value && styles.activeText]}>{item.label}</Text></Pressable>)}</View>
    <Field label="Krótki opis" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
    <Body>Dotknij mapy, aby wybrać miejsce.</Body><CoordinatePickerMap value={picked} onChange={pick} mapStyleUrl={config.mapStyles[mapStyle]} />
    <View style={styles.row}><View style={styles.flex}><Field label="Szerokość" value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" /></View><View style={styles.flex}><Field label="Długość" value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" /></View></View>
    <Button title="Użyj aktualnej pozycji" onPress={() => void locate()} variant="secondary" />{error ? <Text style={styles.error}>{error}</Text> : null}<Button title="Wyślij zgłoszenie" onPress={() => void submit()} disabled={create.isPending} />
  </Screen>;
}
const styles = StyleSheet.create({ types: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, type: { padding: 10, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, active: { backgroundColor: colors.navy }, typeText: { color: colors.navy, fontWeight: '700' }, activeText: { color: colors.white }, row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 }, error: { color: colors.danger } });
