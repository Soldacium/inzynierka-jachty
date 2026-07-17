import { useState } from 'react';
import { Alert as NativeAlert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Body, Button, Field, Screen, Title } from '@/src/components/ui';
import { useUpdateAvailability } from '@/src/features/data/hooks';
import { colors, radius, spacing } from '@/src/constants/theme';
import { errorMessage } from '@/src/utils/format';

const statuses = [{ value: 'available', label: 'Dostępne' }, { value: 'limited', label: 'Ograniczone' }, { value: 'full', label: 'Brak miejsc' }, { value: 'unknown', label: 'Nieznane' }];
export default function AvailabilityScreen() {
  const { portId } = useLocalSearchParams<{ portId: string }>(); const mutation = useUpdateAvailability(portId); const [status, setStatus] = useState('unknown'); const [spots, setSpots] = useState(''); const [error, setError] = useState('');
  const submit = async () => { const number = spots.trim() ? Number(spots) : null; if (number !== null && (!Number.isInteger(number) || number < 0)) { NativeAlert.alert('Podaj nieujemną liczbę miejsc.'); return; } setError(''); try { await mutation.mutateAsync({ availableSpots: number, status }); router.back(); } catch (reason) { setError(errorMessage(reason)); } };
  return <Screen><Title>Dostępność miejsc</Title><Body muted>Dane są orientacyjne i zostaną oznaczone czasem aktualizacji.</Body><View style={styles.options}>{statuses.map((item) => <Pressable key={item.value} onPress={() => setStatus(item.value)} style={[styles.option, status === item.value && styles.active]}><Text style={[styles.text, status === item.value && styles.activeText]}>{item.label}</Text></Pressable>)}</View><Field label="Liczba wolnych miejsc (opcjonalnie)" value={spots} onChangeText={setSpots} keyboardType="number-pad" />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<Button title="Opublikuj aktualizację" onPress={() => void submit()} disabled={mutation.isPending} /></Screen>;
}
const styles = StyleSheet.create({ options: { gap: spacing.sm }, option: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, active: { backgroundColor: colors.navy }, text: { color: colors.ink, fontWeight: '700' }, activeText: { color: colors.white }, error: { color: colors.danger } });
