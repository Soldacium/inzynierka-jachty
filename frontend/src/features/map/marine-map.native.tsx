import { useEffect, useMemo, useRef } from 'react';
import { Camera, GeoJSONSource, Layer, Map, Marker, UserLocation, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import type { Alert, MapBounds, Port, SailRoute, TrafficCell, TrafficPoint } from '@/src/types/api';

interface Props {
  ports: Port[]; alerts: Alert[]; traffic: (TrafficPoint | TrafficCell)[]; route?: SailRoute;
  activeOverlay: 'route' | 'vessels' | 'traffic' | 'alerts';
  focusCoordinate?: [number, number] | null; onBounds: (bounds: MapBounds) => void; onPort: (id: string) => void; mapStyleUrl: string;
}

const emptyPoints: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };
function points<T extends { id?: string }>(items: { coordinates: [number, number]; properties: T }[]): FeatureCollection<Point, T> {
  return {
    type: 'FeatureCollection',
    features: items.map((item) => ({
      type: 'Feature',
      id: item.properties.id,
      geometry: { type: 'Point', coordinates: item.coordinates },
      properties: item.properties,
    })),
  };
}

export function MarineMap(props: Props) {
  const camera = useRef<CameraRef>(null);
  useEffect(() => { if (props.focusCoordinate) camera.current?.flyTo({ center: props.focusCoordinate, zoom: 14, duration: 900 }); }, [props.focusCoordinate]);
  const alertData = useMemo(() => points(props.alerts.map((alert) => ({ coordinates: alert.location.coordinates, properties: { id: alert.id, severity: alert.severity, type: alert.type, source: alert.source } }))), [props.alerts]);
  const trafficData = useMemo(() => points(props.traffic.map((item) => ({
    coordinates: [item.longitude, item.latitude],
    properties: 'vesselId' in item ? { id: item.vesselId, weight: 1, level: 'point' } : { id: `${item.longitude}:${item.latitude}`, weight: item.weight, level: item.level },
  }))), [props.traffic]);
  const routeData: FeatureCollection<LineString> = props.route ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: props.route.path, properties: { id: props.route.id } }] } : { type: 'FeatureCollection', features: [] };
  const onRegion = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const [west, south, east, north] = event.nativeEvent.bounds;
    props.onBounds({ west, south, east, north, zoom: event.nativeEvent.zoom });
  };
  return <Map mapStyle={props.mapStyleUrl} onRegionDidChange={onRegion} attribution logo compass scaleBar>
    <Camera ref={camera} initialViewState={{ center: [18.65, 54.55], zoom: 8 }} minZoom={4} maxZoom={19} />
    <UserLocation animated accuracy heading />
    {props.activeOverlay === 'route' && props.route ? <GeoJSONSource id="route-source" data={routeData}>
      <Layer id="active-route-halo" type="line" source="route-source" paint={{ 'line-color': '#FFFFFF', 'line-width': 8, 'line-opacity': 0.8 }} />
      <Layer id="active-route" type="line" source="route-source" paint={{ 'line-color': '#7C3AED', 'line-width': 4, 'line-opacity': 0.95 }} />
    </GeoJSONSource> : null}
    {props.activeOverlay === 'alerts' ? <GeoJSONSource id="alerts-source" data={alertData}>
      <Layer id="official-alerts" type="circle" source="alerts-source" filter={['==', ['get', 'source'], 'official']} paint={{ 'circle-color': ['match', ['get', 'severity'], 'critical', '#7F1D1D', 'high', '#B91C1C', 'medium', '#DC2626', '#F97316'], 'circle-radius': 10, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
      <Layer id="user-alerts" type="circle" source="alerts-source" filter={['!=', ['get', 'source'], 'official']} paint={{ 'circle-color': '#F59E0B', 'circle-radius': 8, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 }} />
    </GeoJSONSource> : null}
    {props.activeOverlay === 'traffic' || props.activeOverlay === 'vessels' ? <GeoJSONSource id="traffic-source" data={trafficData || emptyPoints}>
      {props.activeOverlay === 'traffic'
        ? <Layer id="traffic-heatmap" type="heatmap" source="traffic-source" paint={{
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 12, 1.6],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 32, 10, 52, 15, 72],
          'heatmap-opacity': 0.78,
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(34,197,94,0)', 0.12, 'rgba(34,197,94,0.65)', 0.35, '#84CC16', 0.55, '#FACC15', 0.76, '#F97316', 1, '#DC2626'],
        }} />
        : <Layer id="vessels" type="circle" source="traffic-source" paint={{ 'circle-color': '#0E7490', 'circle-radius': 5, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 }} />}
    </GeoJSONSource> : null}
    {props.ports.map((port) => <Marker key={port.id} id={`port-${port.id}`} lngLat={port.location.coordinates} anchor="bottom" onPress={() => props.onPort(port.id)}>
      <View accessibilityLabel={`Port ${port.name}`} style={styles.portMarker}><Ionicons name="boat" size={16} color="#FFFFFF" /></View>
    </Marker>)}
  </Map>;
}

const styles = StyleSheet.create({
  portMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#075985',
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
    elevation: 5,
  },
});
