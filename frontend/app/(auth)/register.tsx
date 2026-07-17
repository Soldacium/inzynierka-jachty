import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';
import { z } from 'zod';
import { Button, Field, Screen, Title, Body } from '@/src/components/ui';
import { strings } from '@/src/constants/strings';
import { colors, spacing } from '@/src/constants/theme';
import { useAuthStore } from '@/src/stores/auth.store';
import { errorMessage } from '@/src/utils/format';

const schema = z.object({ displayName: z.string().trim().min(2, 'Nazwa jest za krótka.'), email: z.email('Podaj poprawny adres e-mail.'), password: z.string().min(10, 'Hasło musi mieć co najmniej 10 znaków.') });
export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [displayName, setDisplayName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    const parsed = schema.safeParse({ displayName, email, password }); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Sprawdź formularz.'); return; }
    setBusy(true); setError(''); try { await register(parsed.data.email, parsed.data.password, parsed.data.displayName); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <Title>Nowe konto</Title><Body muted>Załóż konto żeglarza. Uprawnienia managera nadaje administrator portu.</Body>
    <Field label={strings.displayName} value={displayName} onChangeText={setDisplayName} autoComplete="name" />
    <Field label={strings.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Field label={strings.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button title={busy ? strings.loading : strings.register} onPress={() => void submit()} disabled={busy} />
    <Link href="/(auth)/login" style={styles.link}>Mam już konto</Link>
  </Screen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, error: { color: colors.danger }, link: { color: colors.blue, fontWeight: '700', textAlign: 'center', padding: spacing.md } });
