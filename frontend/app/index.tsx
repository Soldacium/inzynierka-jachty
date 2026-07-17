import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors } from '@/src/constants/theme';

export default function Index() {
  const status = useAuthStore((state) => state.status);
  if (status === 'bootstrapping') return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  return <Redirect href={status === 'authenticated' ? '/(tabs)/map' : '/(auth)/login'} />;
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.foam } });
