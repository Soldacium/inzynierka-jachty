import { useState } from 'react';
import { Alert as NativeAlert, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Body, Button, Field, Screen, Title } from '@/src/components/ui';
import { useCreateNotice } from '@/src/features/data/hooks';
import { colors } from '@/src/constants/theme';
import { errorMessage } from '@/src/utils/format';

export default function NoticeScreen() {
  const { portId } = useLocalSearchParams<{ portId: string }>(); const mutation = useCreateNotice(portId); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [error, setError] = useState('');
  const submit = async () => { if (title.trim().length < 2 || body.trim().length < 2) { NativeAlert.alert('Uzupełnij tytuł i treść.'); return; } setError(''); try { await mutation.mutateAsync({ title: title.trim(), body: body.trim() }); router.back(); } catch (reason) { setError(errorMessage(reason)); } };
  return <Screen><Title>Komunikat portowy</Title><Body muted>Komunikat pojawi się w szczegółach portu i zostanie rozesłany do obserwujących klientów.</Body><Field label="Tytuł" value={title} onChangeText={setTitle} /><Field label="Treść" value={body} onChangeText={setBody} multiline numberOfLines={6} />{error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}<Button title="Opublikuj" onPress={() => void submit()} disabled={mutation.isPending} /></Screen>;
}
