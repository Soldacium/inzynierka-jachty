import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, Card, EmptyState, ErrorState, Field, LoadingState, Screen, Subtitle, Title, Badge } from '@/src/components/ui';
import { useInfinitePorts } from '@/src/features/data/hooks';
import { formatDate } from '@/src/utils/format';

export default function PortsScreen() {
  const [search, setSearch] = useState(''); const query = useInfinitePorts(search);
  const ports = query.data?.pages.flatMap((page) => page.items) ?? [];
  return <Screen><Title>Porty</Title><Field label="Szukaj portu lub miejscowości" value={search} onChangeText={setSearch} placeholder="np. Gdynia" />
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Nie udało się pobrać portów." retry={() => void query.refetch()} /> : ports.length ? <>{ports.map((port) =>
      <Card key={port.id} onPress={() => router.push({ pathname: '/ports/[id]', params: { id: port.id } })}><Subtitle>{port.name}</Subtitle><Body muted>{port.description || 'Brak opisu.'}</Body><Badge text={port.status} tone={port.status === 'active' ? 'success' : 'warning'} /><Body muted>Aktualizacja: {formatDate(port.updatedAt)}</Body></Card>)}
      {query.hasNextPage ? <Button title={query.isFetchingNextPage ? 'Ładowanie…' : 'Pokaż więcej portów'} onPress={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage} variant="secondary" /> : null}</> : <EmptyState message="Nie znaleziono portów." />}
  </Screen>;
}
