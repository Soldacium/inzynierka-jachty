import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/src/constants/theme';
import { strings } from '@/src/constants/strings';

export function Screen({ children, scroll = true, style }: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle }>) {
  const content = scroll
    ? <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={[styles.fill, style]}>{children}</View>;
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>{content}</SafeAreaView>;
}

export function Title({ children }: PropsWithChildren) { return <Text style={styles.title}>{children}</Text>; }
export function Subtitle({ children }: PropsWithChildren) { return <Text style={styles.subtitle}>{children}</Text>; }
export function Body({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) { return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>; }

export function Card({ children, onPress, style }: PropsWithChildren<{ onPress?: () => void; style?: ViewStyle }>) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function Button({ title, onPress, variant = 'primary', disabled = false, icon }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; icon?: ReactNode }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, styles[variant], disabled && styles.disabled, pressed && styles.pressed]}>
    {icon}<Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, error && styles.inputError]} {...props} />{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>;
}

export function Badge({ text, tone = 'info' }: { text: string; tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  return <View style={[styles.badge, styles[`badge_${tone}`]]}><Text style={styles.badgeText}>{text}</Text></View>;
}

export function LoadingState() { return <View style={styles.center}><ActivityIndicator color={colors.blue} /><Body muted>{strings.loading}</Body></View>; }
export function EmptyState({ message = strings.noData }: { message?: string }) { return <View style={styles.center}><Body muted>{message}</Body></View>; }
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <View style={styles.center}><Text style={styles.errorText}>{message}</Text>{retry ? <Button title={strings.retry} onPress={retry} variant="secondary" /> : null}</View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.foam }, fill: { flex: 1 }, content: { padding: spacing.md, gap: spacing.md, paddingBottom: 96 },
  title: { color: colors.navy, fontSize: 30, fontWeight: '800' }, subtitle: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 21 }, muted: { color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.line },
  button: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  primary: { backgroundColor: colors.blue }, secondary: { backgroundColor: colors.sky, borderColor: colors.blue, borderWidth: 1 }, danger: { backgroundColor: colors.danger },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 }, secondaryText: { color: colors.navy }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.8 },
  field: { gap: spacing.xs }, label: { color: colors.ink, fontWeight: '600' }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 48, color: colors.ink, backgroundColor: colors.white }, inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 13 }, center: { padding: spacing.lg, gap: spacing.md, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }, badge_info: { backgroundColor: colors.sky }, badge_success: { backgroundColor: '#DCFCE7' }, badge_warning: { backgroundColor: '#FEF3C7' }, badge_danger: { backgroundColor: '#FEE2E2' }, badgeText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
});
