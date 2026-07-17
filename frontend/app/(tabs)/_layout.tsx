import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors } from '@/src/constants/theme';

export default function TabLayout() {
  const status = useAuthStore((state) => state.status);
  if (status === 'anonymous') return <Redirect href="/(auth)/login" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 6 },
      }}>
      <Tabs.Screen name="map" options={{ title: 'Mapa', tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} /> }} />
      <Tabs.Screen name="ports" options={{ title: 'Porty', tabBarIcon: ({ color, size }) => <Ionicons name="boat" color={color} size={size} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerty', tabBarIcon: ({ color, size }) => <Ionicons name="warning" color={color} size={size} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Wiadomości', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
