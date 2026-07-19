import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Body, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { useInfiniteAlerts } from '@/src/features/data/hooks';
import { formatDate } from '@/src/utils/format';
import type { AlertSource } from '@/src/types/api';
import { colors, radius, spacing } from '@/src/constants/theme';

const names: Record<string, string> = { obstacle: 'Przeszkoda', failure: 'Awaria', port_disruption: 'Utrudnienie w porcie', accident: 'Wypadek', closed_area: 'Obszar zamknięty', emergency_stop: 'Miejsce awaryjnego postoju' };
export default function AlertsScreen() {
  const [source, setSource] = useState<'all' | AlertSource>('all');
  const query = useInfiniteAlerts(source === 'all' ? undefined : source);
  const alerts = query.data?.pages.flatMap((page) => page.items) ?? [];
  const filters: { value: 'all' | AlertSource; label: string }[] = [{ value: 'all', label: 'Wszystkie' }, { value: 'official', label: 'Oficjalne' }, { value: 'user', label: 'Użytkowników' }];
  return <Screen><Title>Ostrzeżenia</Title><Body muted>Alerty użytkowników są publikowane od razu. Oficjalne komunikaty pochodzą od administratorów lub zarządzających portami.</Body><Button title="Dodaj zgłoszenie" onPress={() => router.push('/alerts/new')} />
    <View style={styles.filters}>{filters.map((item) => <Pressable key={item.value} onPress={() => setSource(item.value)} style={[styles.filter, source === item.value && styles.active]}><Text style={[styles.filterText, source === item.value && styles.activeText]}>{item.label}</Text></Pressable>)}</View>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Nie udało się pobrać ostrzeżeń." retry={() => void query.refetch()} /> : alerts.length ? <>{alerts.map((alert) => <Card key={alert.id}><Subtitle>{names[alert.type] ?? alert.type}</Subtitle><Body>{alert.description}</Body><Badge text={alert.source === 'official' ? 'Alert oficjalny' : 'Zgłoszenie użytkownika'} tone={alert.source === 'official' ? 'danger' : 'warning'} /><Body muted>Ważność: {formatDate(alert.validUntil)} · zgłoszono {formatDate(alert.createdAt)}</Body></Card>)}
      {query.hasNextPage ? <Button title={query.isFetchingNextPage ? 'Ładowanie…' : 'Pokaż więcej ostrzeżeń'} onPress={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage} variant="secondary" /> : null}</> : <EmptyState message="Brak aktywnych ostrzeżeń." />}
  </Screen>;
}
const styles = StyleSheet.create({ filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, active: { backgroundColor: colors.navy }, filterText: { color: colors.navy, fontWeight: '700' }, activeText: { color: colors.white } });
