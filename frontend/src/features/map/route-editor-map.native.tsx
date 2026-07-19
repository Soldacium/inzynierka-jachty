import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type NativeSyntheticEvent } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, UserLocation, type CameraRef, type PressEvent, type PressEventWithFeatures } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, LineString, Point } from 'geojson';
import type { Alert, Port } from '@/src/types/api';

export interface EditableRoutePoint { latitude: number; longitude: number; label: string }
interface Props {
  points: EditableRoutePoint[]; selectedIndex: number | null; ports: Port[]; alerts: Alert[]; mapStyleUrl: string;
  onMapPress: (coordinate: { latitude: number; longitude: number }) => void;
  onPointPress: (index: number) => void;
  onPortPress: (port: Port) => void;
}

function pointCollection<T>(items: { coordinate: [number, number]; properties: T }[]): FeatureCollection<Point, T> {
  return { type: 'FeatureCollection', features: items.map((item) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: item.coordinate }, properties: item.properties })) };
}

export function RouteEditorMap({ points, selectedIndex, ports, alerts, mapStyleUrl, onMapPress, onPointPress, onPortPress }: Props) {
  const camera = useRef<CameraRef>(null);
  const focusedPoint = selectedIndex === null ? points.at(-1) : points[selectedIndex];
  const focusedLatitude = focusedPoint?.latitude;
  const focusedLongitude = focusedPoint?.longitude;
  useEffect(() => {
    if (focusedLatitude !== undefined && focusedLongitude !== undefined) camera.current?.flyTo({ center: [focusedLongitude, focusedLatitude], duration: 350 });
  }, [focusedLatitude, focusedLongitude]);
  const routePoints = useMemo(() => pointCollection(points.map((item, index) => ({ coordinate: [item.longitude, item.latitude], properties: { index, selected: index === selectedIndex } }))), [points, selectedIndex]);
  const routeLine = useMemo<FeatureCollection<LineString>>(() => ({ type: 'FeatureCollection', features: points.length >= 2 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: points.map((item) => [item.longitude, item.latitude]) }, properties: {} }] : [] }), [points]);
  const portPoints = useMemo(() => pointCollection(ports.map((item) => ({ coordinate: item.location.coordinates, properties: { id: item.id } }))), [ports]);
  const alertPoints = useMemo(() => pointCollection(alerts.map((item) => ({ coordinate: item.location.coordinates, properties: { source: item.source } }))), [alerts]);
  const selectMap = (event: NativeSyntheticEvent<PressEvent>) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    onMapPress({ latitude, longitude });
  };
  const selectPoint = (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
    event.stopPropagation();
    const index = event.nativeEvent.features[0]?.properties?.index;
    if (typeof index === 'number') onPointPress(index);
  };
  const selectPort = (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
    event.stopPropagation();
    const id = event.nativeEvent.features[0]?.properties?.id;
    const port = typeof id === 'string' ? ports.find((item) => item.id === id) : undefined;
    if (port) onPortPress(port);
  };
  return <Map style={styles.map} mapStyle={mapStyleUrl} onPress={selectMap} attribution compass scaleBar>
    <Camera ref={camera} initialViewState={{ center: [18.65, 54.55], zoom: 8 }} />
    <UserLocation animated accuracy />
    <GeoJSONSource id="editor-ports" data={portPoints} cluster clusterRadius={38} onPress={selectPort}>
      <Layer id="editor-port-clusters" type="circle" source="editor-ports" filter={['has', 'point_count']} paint={{ 'circle-color': '#0369A1', 'circle-radius': 15, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 }} />
      <Layer id="editor-ports-layer" type="circle" source="editor-ports" filter={['!', ['has', 'point_count']]} paint={{ 'circle-color': '#0891B2', 'circle-radius': 7, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 }} />
    </GeoJSONSource>
    <GeoJSONSource id="editor-alerts" data={alertPoints}><Layer id="editor-alerts-layer" type="circle" source="editor-alerts" paint={{ 'circle-color': ['match', ['get', 'source'], 'official', '#B91C1C', '#D97706'], 'circle-radius': 7, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 }} /></GeoJSONSource>
    <GeoJSONSource id="editor-route-line" data={routeLine}><Layer id="editor-route-line-layer" type="line" source="editor-route-line" paint={{ 'line-color': '#7C3AED', 'line-width': 4 }} /></GeoJSONSource>
    <GeoJSONSource id="editor-route-points" data={routePoints} onPress={selectPoint} hitbox={{ top: 18, right: 18, bottom: 18, left: 18 }}>
      <Layer id="editor-route-points-layer" type="circle" source="editor-route-points" paint={{ 'circle-color': ['case', ['get', 'selected'], '#DC2626', '#7C3AED'], 'circle-radius': ['case', ['get', 'selected'], 11, 8], 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
    </GeoJSONSource>
  </Map>;
}

const styles = StyleSheet.create({ map: { flex: 1 } });
