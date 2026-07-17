import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Card, EmptyState, ErrorState, Field, LoadingState, Screen, Subtitle, Title, Badge } from '@/src/components/ui';
import { usePorts } from '@/src/features/data/hooks';
import { formatDate } from '@/src/utils/format';

export default function PortsScreen() {
  const [search, setSearch] = useState(''); const query = usePorts(search);
  return <Screen><Title>Porty</Title><Field label="Szukaj portu lub miejscowości" value={search} onChangeText={setSearch} placeholder="np. Gdynia" />
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Nie udało się pobrać portów." retry={() => void query.refetch()} /> : query.data?.items.length ? query.data.items.map((port) =>
      <Card key={port.id} onPress={() => router.push({ pathname: '/ports/[id]', params: { id: port.id } })}><Subtitle>{port.name}</Subtitle><Body muted>{port.description || 'Brak opisu.'}</Body><Badge text={port.status} tone={port.status === 'active' ? 'success' : 'warning'} /><Body muted>Aktualizacja: {formatDate(port.updatedAt)}</Body></Card>) : <EmptyState message="Nie znaleziono portów." />}
  </Screen>;
}
