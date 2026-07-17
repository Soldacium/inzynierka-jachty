import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { z } from 'zod';
import { Button, Field, Screen, Title, Body } from '@/src/components/ui';
import { strings } from '@/src/constants/strings';
import { colors, spacing } from '@/src/constants/theme';
import { useAuthStore } from '@/src/stores/auth.store';
import { errorMessage } from '@/src/utils/format';

const schema = z.object({ email: z.email('Podaj poprawny adres e-mail.'), password: z.string().min(10, 'Hasło musi mieć co najmniej 10 znaków.') });

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Sprawdź formularz.'); return; }
    setBusy(true); setError('');
    try { await login(parsed.data.email, parsed.data.password); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <View style={styles.hero}><Text style={styles.wave}>≈</Text><Title>{strings.appName}</Title><Body muted>Porty, trasy i ruch na Bałtyku w jednym miejscu.</Body></View>
    <Field label={strings.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Field label={strings.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button title={busy ? strings.loading : strings.login} onPress={() => void submit()} disabled={busy} />
    <Link href="/(auth)/register" style={styles.link}>Nie masz konta? Zarejestruj się</Link>
    <Body muted>{strings.navigationDisclaimer}</Body>
  </Screen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, hero: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xl }, wave: { fontSize: 72, lineHeight: 70, color: colors.cyan, fontWeight: '300' }, error: { color: colors.danger }, link: { color: colors.blue, fontWeight: '700', textAlign: 'center', padding: spacing.md } });
