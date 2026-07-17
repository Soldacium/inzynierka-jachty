import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/src/constants/theme';
import type { Alert, Port } from '@/src/types/api';
import type { EditableRoutePoint } from './route-editor-map.native';
interface Props { points: EditableRoutePoint[]; selectedIndex: number | null; ports: Port[]; alerts: Alert[]; mapStyleUrl: string; onMapPress: (coordinate: { latitude: number; longitude: number }) => void; onPointPress: (index: number) => void; onPortPress: (port: Port) => void }
export function RouteEditorMap({ points }: Props) { return <View style={styles.container}><Text style={styles.text}>Interaktywny edytor mapy jest dostępny w buildzie Android/iOS.</Text><Text>Dodane punkty: {points.length}</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.sky }, text: { color: colors.navy, textAlign: 'center' } });
