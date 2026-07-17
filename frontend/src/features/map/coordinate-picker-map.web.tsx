import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/src/constants/theme';
import type { PickedCoordinate } from './coordinate-picker-map.native';

interface Props { value: PickedCoordinate | null; onChange: (value: PickedCoordinate) => void; mapStyleUrl: string }
export function CoordinatePickerMap({ value }: Props) {
  return <View style={styles.container}><Text style={styles.text}>Wybór punktu na mapie jest dostępny w buildzie Android/iOS.</Text>{value ? <Text>{value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</Text> : null}</View>;
}
const styles = StyleSheet.create({ container: { height: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.sky, padding: spacing.md }, text: { color: colors.navy, textAlign: 'center' } });
