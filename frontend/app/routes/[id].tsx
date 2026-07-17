import { Alert as NativeAlert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Body, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { useDeleteRoute, useRoute } from '@/src/features/data/hooks';
import { formatDate, formatDistance } from '@/src/utils/format';

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useRoute(id); const deletion = useDeleteRoute();
  if (query.isLoading) return <Screen><LoadingState /></Screen>; if (query.isError || !query.data) return <Screen><ErrorState message="Nie udało się pobrać trasy." retry={() => void query.refetch()} /></Screen>;
  const route = query.data; const remove = () => NativeAlert.alert('Usunąć trasę?', route.name, [{ text: 'Anuluj', style: 'cancel' }, { text: 'Usuń', style: 'destructive', onPress: () => void deletion.mutateAsync(route.id).then(() => router.back()).catch(() => NativeAlert.alert('Błąd', 'Nie udało się usunąć trasy.')) }]);
  return <Screen><Title>{route.name}</Title><Badge text={route.status} /><Card><Subtitle>Długość orientacyjna</Subtitle><Body>{formatDistance(route.distanceMeters)}</Body><Body muted>Utworzono: {formatDate(route.createdAt)}</Body></Card><Subtitle>Punkty</Subtitle>{route.points?.length ? [...route.points].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((point, index) => <Card key={point.id ?? index}><Body>{point.label || `Punkt ${index + 1}`}</Body><Body muted>{point.location?.coordinates[1].toFixed(5)}, {point.location?.coordinates[0].toFixed(5)}</Body></Card>) : <EmptyState />}<Body muted>Przed rejsem zweryfikuj trasę na aktualnych mapach nawigacyjnych i uwzględnij komunikaty służb.</Body><Button title="Usuń trasę" onPress={remove} variant="danger" /></Screen>;
}
