import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorState, Field, LoadingState, Screen, Title } from '@/src/components/ui';
import { usePort, useUpdatePort } from '@/src/features/data/hooks';
import { colors } from '@/src/constants/theme';
import { errorMessage } from '@/src/utils/format';

export default function EditPortScreen() {
  const { portId } = useLocalSearchParams<{ portId: string }>();
  const port = usePort(portId);
  const update = useUpdatePort(portId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [vhfChannel, setVhfChannel] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!port.data) return;
    setName(port.data.name);
    setDescription(port.data.description);
    setContactEmail(port.data.contactEmail ?? '');
    setContactPhone(port.data.contactPhone ?? '');
    setVhfChannel(port.data.vhfChannel ?? '');
  }, [port.data]);

  if (port.isLoading) return <Screen><LoadingState /></Screen>;
  if (port.isError || !port.data) return <Screen><ErrorState message="Nie udało się pobrać danych portu." retry={() => void port.refetch()} /></Screen>;

  const submit = async () => {
    if (name.trim().length < 2) { setError('Nazwa portu musi mieć co najmniej 2 znaki.'); return; }
    setError('');
    try {
      await update.mutateAsync({
        name: name.trim(), description: description.trim(), contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null, vhfChannel: vhfChannel.trim() || null,
      });
      router.back();
    } catch (reason) { setError(errorMessage(reason)); }
  };

  return <Screen><Title>Dane portu</Title>
    <Field label="Nazwa" value={name} onChangeText={setName} />
    <Field label="Opis" value={description} onChangeText={setDescription} multiline numberOfLines={6} />
    <Field label="E-mail kontaktowy" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" />
    <Field label="Telefon" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
    <Field label="Kanał VHF" value={vhfChannel} onChangeText={setVhfChannel} />
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
    <Button title="Zapisz zmiany" onPress={() => void submit()} disabled={update.isPending} />
  </Screen>;
}
