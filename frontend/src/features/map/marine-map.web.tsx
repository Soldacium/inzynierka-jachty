import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/src/constants/theme';
import type { Alert, MapBounds, Port, SailRoute, TrafficCell, TrafficPoint } from '@/src/types/api';

interface Props { ports: Port[]; alerts: Alert[]; traffic: (TrafficPoint | TrafficCell)[]; route?: SailRoute; activeOverlay: 'route' | 'vessels' | 'traffic' | 'alerts'; focusCoordinate?: [number, number] | null; onBounds: (bounds: MapBounds) => void; selectedPortId: string | null; selectedPortDistance?: number | null; selectedAlertId: string | null; onAlert: (id: string) => void; onPort: (id: string) => void; onPortDetails: (id: string) => void; mapStyleUrl: string }
export function MarineMap(_props: Props) { return <View style={styles.container}><Text style={styles.text}>Mapa MapLibre jest dostępna w aplikacji Android i iOS.</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.sky }, text: { color: colors.navy, textAlign: 'center' } });
