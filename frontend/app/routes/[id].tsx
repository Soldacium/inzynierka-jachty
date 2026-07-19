import { Alert as NativeAlert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Body, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { useDeleteRoute, useRoute, useUpdateRoute } from '@/src/features/data/hooks';
import { errorMessage, formatDate, formatDistance } from '@/src/utils/format';

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useRoute(id); const deletion = useDeleteRoute(); const update = useUpdateRoute(id);
  if (query.isLoading) return <Screen><LoadingState /></Screen>; if (query.isError || !query.data) return <Screen><ErrorState message="Nie udało się pobrać trasy." retry={() => void query.refetch()} /></Screen>;
  const route = query.data;
  const changeStatus = async (status: 'active' | 'completed') => {
    try { await update.mutateAsync({ status }); }
    catch (reason) { NativeAlert.alert('Nie udało się zmienić stanu trasy', errorMessage(reason)); }
  };
  const remove = () => NativeAlert.alert('Usunąć trasę?', route.name, [{ text: 'Anuluj', style: 'cancel' }, { text: 'Usuń', style: 'destructive', onPress: () => void deletion.mutateAsync(route.id).then(() => router.back()).catch(() => NativeAlert.alert('Błąd', 'Nie udało się usunąć trasy.')) }]);
  return <Screen><Title>{route.name}</Title><Badge text={route.status} /><Card><Subtitle>Długość orientacyjna</Subtitle><Body>{formatDistance(route.distanceMeters)}</Body><Body muted>Utworzono: {formatDate(route.createdAt)}</Body>{route.startedAt ? <Body muted>Rozpoczęto: {formatDate(route.startedAt)}</Body> : null}{route.finishedAt ? <Body muted>Zakończono: {formatDate(route.finishedAt)}</Body> : null}</Card>
    {route.status === 'active' ? <><Body muted>Próbki GPS z aktywnej trasy zostaną zachowane jako zapis rejsu.</Body><Button title="Zakończ trasę" onPress={() => void changeStatus('completed')} disabled={update.isPending} /></> : route.status === 'planned' || route.status === 'draft' ? <Button title="Rozpocznij tę trasę" onPress={() => void changeStatus('active')} disabled={update.isPending} /> : null}
    <Subtitle>Punkty</Subtitle>{route.points?.length ? [...route.points].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((point, index) => <Card key={point.id ?? index}><Body>{point.label || `Punkt ${index + 1}`}</Body><Body muted>{point.location?.coordinates[1].toFixed(5)}, {point.location?.coordinates[0].toFixed(5)}</Body></Card>) : <EmptyState />}<Body muted>Przed rejsem zweryfikuj trasę na aktualnych mapach nawigacyjnych i uwzględnij komunikaty służb.</Body><Button title="Usuń trasę" onPress={remove} variant="danger" /></Screen>;
}
