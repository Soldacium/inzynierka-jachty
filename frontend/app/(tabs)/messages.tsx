import { router } from 'expo-router';
import { Body, Card, EmptyState, ErrorState, LoadingState, Screen, Subtitle, Title } from '@/src/components/ui';
import { useConversations } from '@/src/features/data/hooks';
import { formatDate } from '@/src/utils/format';

export default function MessagesScreen() {
  const query = useConversations();
  return <Screen><Title>Wiadomości</Title><Body muted>Rozmowy są dostępne wyłącznie dla Ciebie i przypisanych managerów portu.</Body>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Nie udało się pobrać rozmów." retry={() => void query.refetch()} /> : query.data?.items.length ? query.data.items.map((conversation) => <Card key={conversation.id} onPress={() => router.push({ pathname: '/conversations/[id]', params: { id: conversation.id } })}><Subtitle>{conversation.port?.name ?? 'Rozmowa z portem'}</Subtitle><Body muted>Ostatnia aktywność: {formatDate(conversation.updatedAt)}</Body></Card>) : <EmptyState message="Nie masz jeszcze żadnych rozmów. Rozpocznij rozmowę na ekranie portu." />}
  </Screen>;
}
