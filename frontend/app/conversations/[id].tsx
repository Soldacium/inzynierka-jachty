import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, EmptyState, ErrorState, Field, LoadingState, Screen } from '@/src/components/ui';
import { useMarkConversationRead, useMessages, useSendMessage } from '@/src/features/data/hooks';
import { useAuthStore } from '@/src/stores/auth.store';
import { useSocketScope } from '@/src/providers/socket-provider';
import { colors, radius, spacing } from '@/src/constants/theme';
import { errorMessage, formatDate } from '@/src/utils/format';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useMessages(id); const send = useSendMessage(id); const { mutate: markRead } = useMarkConversationRead(id); const userId = useAuthStore((state) => state.user?.id); const [body, setBody] = useState(''); const [sendError, setSendError] = useState('');
  useSocketScope('conversation', id); useEffect(() => { if (query.data) markRead(); }, [query.data, markRead]);
  const submit = async () => { const value = body.trim(); if (!value) return; setSendError(''); try { await send.mutateAsync(value); setBody(''); } catch (reason) { setSendError(errorMessage(reason)); } };
  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}><Screen scroll={false} style={styles.fill}>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Nie udało się pobrać wiadomości." retry={() => void query.refetch()} /> : query.data?.items.length ? <ScrollView contentContainerStyle={styles.messages}>{query.data.items.map((message) => <View key={message.id} style={[styles.bubble, message.senderId === userId ? styles.mine : styles.theirs]}><Text style={message.senderId === userId ? styles.mineText : styles.theirText}>{message.body}</Text><Text style={[styles.time, message.senderId === userId && styles.mineTime]}>{formatDate(message.createdAt)}</Text></View>)}</ScrollView> : <EmptyState message="Napisz pierwszą wiadomość." />}
    <View style={styles.composer}>{sendError ? <Text accessibilityRole="alert" style={styles.error}>{sendError}</Text> : null}<View style={styles.flex}><Field label="Wiadomość" value={body} onChangeText={setBody} multiline /></View><Button title="Wyślij" onPress={() => void submit()} disabled={send.isPending || !body.trim()} /></View>
  </Screen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, messages: { padding: spacing.md, gap: spacing.sm }, bubble: { maxWidth: '82%', borderRadius: radius.md, padding: 12, gap: 4 }, mine: { backgroundColor: colors.blue, alignSelf: 'flex-end' }, theirs: { backgroundColor: colors.white, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line }, mineText: { color: colors.white }, theirText: { color: colors.ink }, time: { color: colors.muted, fontSize: 10 }, mineTime: { color: colors.sky }, composer: { padding: spacing.sm, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.foam, gap: spacing.sm }, flex: { flex: 1 }, error: { color: colors.danger } });
