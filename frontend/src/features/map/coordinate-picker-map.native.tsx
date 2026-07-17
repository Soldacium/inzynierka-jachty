import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type NativeSyntheticEvent } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef, type PressEvent } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';

export interface PickedCoordinate { latitude: number; longitude: number }
interface Props { value: PickedCoordinate | null; onChange: (value: PickedCoordinate) => void; mapStyleUrl: string }

export function CoordinatePickerMap({ value, onChange, mapStyleUrl }: Props) {
  const camera = useRef<CameraRef>(null);
  const latitude = value?.latitude;
  const longitude = value?.longitude;
  useEffect(() => { if (latitude !== undefined && longitude !== undefined) camera.current?.flyTo({ center: [longitude, latitude], zoom: 13, duration: 500 }); }, [latitude, longitude]);
  const data = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: value ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [value.longitude, value.latitude] }, properties: {} }] : [],
  }), [value]);
  const select = (event: NativeSyntheticEvent<PressEvent>) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    onChange({ latitude, longitude });
  };
  return <Map style={styles.map} mapStyle={mapStyleUrl} onPress={select} attribution logo={false} compass>
    <Camera ref={camera} initialViewState={{ center: value ? [value.longitude, value.latitude] : [18.65, 54.55], zoom: value ? 13 : 8 }} />
    <GeoJSONSource id="picked-coordinate" data={data}>
      <Layer id="picked-coordinate-halo" type="circle" source="picked-coordinate" paint={{ 'circle-color': '#FFFFFF', 'circle-radius': 13 }} />
      <Layer id="picked-coordinate-dot" type="circle" source="picked-coordinate" paint={{ 'circle-color': '#DC2626', 'circle-radius': 8 }} />
    </GeoJSONSource>
  </Map>;
}

const styles = StyleSheet.create({ map: { height: 280, borderRadius: 16, overflow: 'hidden' } });
