import { Platform } from 'react-native';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? `http://${fallbackHost}:3000/api/v1`,
  mapStyles: {
    detailed: process.env.EXPO_PUBLIC_MAP_STYLE_DETAILED_URL ?? process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty',
    simple: process.env.EXPO_PUBLIC_MAP_STYLE_SIMPLE_URL ?? 'https://tiles.openfreemap.org/styles/positron',
  },
};
