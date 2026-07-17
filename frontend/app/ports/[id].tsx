import { Alert as NativeAlert, Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Body, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { usePort, usePortNotices, useStartConversation } from '@/src/features/data/hooks';
import { formatDate } from '@/src/utils/format';
import { spacing } from '@/src/constants/theme';
import { useSocketScope } from '@/src/providers/socket-provider';

export default function PortDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const port = usePort(id); const notices = usePortNotices(id); const conversation = useStartConversation();
  useSocketScope('port', id);
  if (port.isLoading) return <Screen><LoadingState /></Screen>;
  if (port.isError || !port.data) return <Screen><ErrorState message="Nie udało się pobrać portu." retry={() => void port.refetch()} /></Screen>;
  const data = port.data; const contact = async () => {
    if (data.contactPhone) await Linking.openURL(`tel:${data.contactPhone}`); else if (data.contactEmail) await Linking.openURL(`mailto:${data.contactEmail}`); else NativeAlert.alert('Brak danych kontaktowych');
  };
  const startChat = async () => { try { const result = await conversation.mutateAsync(data.id); router.push({ pathname: '/conversations/[id]', params: { id: result.id } }); } catch { NativeAlert.alert('Błąd', 'Nie udało się rozpocząć rozmowy.'); } };
  return <Screen><Title>{data.name}</Title><Badge text={data.status} tone="success" /><Body>{data.description || 'Brak opisu portu.'}</Body>{data.source === 'openstreetmap' ? <Body muted>Źródło danych: © OpenStreetMap contributors. Dane mogą wymagać aktualizacji.</Body> : null}
    <Card><Subtitle>Dostępność</Subtitle><Body>{data.availability?.availableSpots == null ? data.availability?.status ?? 'Brak danych' : `${data.availability.availableSpots} wolnych miejsc`}</Body>{data.availability?.stale ? <Badge text="Dane mogą być nieaktualne" tone="warning" /> : null}<Body muted>Aktualizacja: {formatDate(data.availability?.createdAt)}</Body></Card>
    <Card><Subtitle>Kontakt</Subtitle><Body>VHF: {data.vhfChannel ?? 'brak'}</Body><Body>{data.contactPhone ?? data.contactEmail ?? 'Brak danych'}</Body><View style={styles.row}><View style={styles.flex}><Button title="Skontaktuj się" onPress={() => void contact()} variant="secondary" /></View><View style={styles.flex}><Button title="Napisz" onPress={() => void startChat()} /></View></View></Card>
    <Subtitle>Infrastruktura</Subtitle>{data.facilities?.length ? data.facilities.map((facility) => <Card key={facility.id}><Body>{facility.name}</Body><Badge text={facility.available ? 'Dostępne' : 'Niedostępne'} tone={facility.available ? 'success' : 'danger'} />{facility.details ? <Body muted>{facility.details}</Body> : null}</Card>) : <EmptyState />}
    <Subtitle>Komunikaty</Subtitle>{notices.data?.items.length ? notices.data.items.map((notice) => <Card key={notice.id}><Subtitle>{notice.title}</Subtitle><Body>{notice.body}</Body><Body muted>{formatDate(notice.createdAt)}</Body></Card>) : <EmptyState message="Brak aktywnych komunikatów." />}
  </Screen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 } });
