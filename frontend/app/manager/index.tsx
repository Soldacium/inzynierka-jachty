import { router } from 'expo-router';
import { Body, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { useManagedPorts } from '@/src/features/data/hooks';
import { useAuthStore } from '@/src/stores/auth.store';

export default function ManagerScreen() {
  const role = useAuthStore((state) => state.user?.role);
  const authorized = role === 'port_manager' || role === 'admin';
  const query = useManagedPorts(authorized);
  if (!authorized) return <Screen><ErrorState message="Ten panel jest dostępny tylko dla zarządzających portami." /></Screen>;
  return <Screen><Title>Panel portu</Title><Body muted>Możesz aktualizować wyłącznie przypisane porty. Każda informacja otrzymuje czas aktualizacji.</Body>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Nie udało się pobrać przypisanych portów." retry={() => void query.refetch()} /> : query.data?.items.length ? query.data.items.map((port) => <Card key={port.id}><Subtitle>{port.name}</Subtitle><Button title="Edytuj dane portu" onPress={() => router.push({ pathname: '/manager/edit/[portId]', params: { portId: port.id } })} variant="secondary" /><Button title="Aktualizuj dostępność" onPress={() => router.push({ pathname: '/manager/availability/[portId]', params: { portId: port.id } })} /><Button title="Opublikuj komunikat" onPress={() => router.push({ pathname: '/manager/notices/[portId]', params: { portId: port.id } })} variant="secondary" /></Card>) : <EmptyState message="Nie masz przypisanego portu." />}
  </Screen>;
}
