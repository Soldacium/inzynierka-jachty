import { useEffect, useMemo, useRef } from 'react';
import { Camera, GeoJSONSource, Layer, Map, Marker, UserLocation, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { Pressable, StyleSheet, Text, View, type NativeSyntheticEvent } from 'react-native';
import type { Alert, HistoricalAisCell, MapBounds, Port, SailRoute, TrafficCell, TrafficPoint } from '@/src/types/api';
import { formatDate, formatDistance } from '@/src/utils/format';
import { HISTORICAL_AIS_MAX_DISPLAY_ZOOM } from './historical-ais.constants';

const alertNames: Record<string, string> = {
  obstacle: 'Przeszkoda', failure: 'Awaria', port_disruption: 'Utrudnienie w porcie', accident: 'Wypadek',
  closed_area: 'Obszar zamknięty', emergency_stop: 'Awaryjny postój',
};
const alertSeverityNames: Record<string, string> = { low: 'niski', medium: 'średni', high: 'wysoki', critical: 'krytyczny' };

interface Props {
  ports: Port[]; alerts: Alert[]; traffic: (TrafficPoint | TrafficCell | HistoricalAisCell)[]; route?: SailRoute;
  activeOverlay: 'route' | 'vessels' | 'traffic' | 'historical' | 'alerts';
  focusCoordinate?: [number, number] | null; onBounds: (bounds: MapBounds) => void;
  selectedPortId: string | null; selectedPortDistance?: number | null;
  selectedAlertId: string | null; onAlert: (id: string) => void;
  onPort: (id: string) => void; onPortDetails: (id: string) => void; mapStyleUrl: string;
}

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
  const trafficData = useMemo(() => points(props.traffic.map((item) => ({
    coordinates: [item.longitude, item.latitude],
    properties: 'vesselId' in item ? { id: item.vesselId, weight: 1, level: 'point' } : { id: `${item.longitude}:${item.latitude}`, weight: item.weight, level: item.level },
  }))), [props.traffic]);
  const validRouteCoordinates = props.route?.path.coordinates.filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude)) ?? [];
  const routeData: FeatureCollection<LineString> = props.route && validRouteCoordinates.length >= 2
    ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: validRouteCoordinates }, properties: { id: props.route.id } }] }
    : { type: 'FeatureCollection', features: [] };
  const selectedPort = props.ports.find((port) => port.id === props.selectedPortId);
  const selectedAlert = props.activeOverlay === 'alerts' ? props.alerts.find((alert) => alert.id === props.selectedAlertId) : undefined;
  const onRegion = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const [west, south, east, north] = event.nativeEvent.bounds;
    props.onBounds({ west, south, east, north, zoom: event.nativeEvent.zoom });
  };
  return <Map mapStyle={props.mapStyleUrl} onRegionDidChange={onRegion} attribution logo compass scaleBar>
    <Camera ref={camera} initialViewState={{ center: [18.65, 54.55], zoom: 8 }} minZoom={4} maxZoom={19} />
    <UserLocation animated accuracy heading />
    {props.activeOverlay === 'route' && routeData.features.length ? <GeoJSONSource id="route-source" data={routeData}>
      <Layer id="active-route-halo" type="line" source="route-source" paint={{ 'line-color': '#FFFFFF', 'line-width': 8, 'line-opacity': 0.8 }} />
      <Layer id="active-route" type="line" source="route-source" paint={{ 'line-color': '#7C3AED', 'line-width': 4, 'line-opacity': 0.95 }} />
    </GeoJSONSource> : null}
    {props.activeOverlay === 'alerts' ? props.alerts.map((alert) => <Marker key={alert.id} id={`alert-${alert.id}`} lngLat={alert.location.coordinates} anchor="center" onPress={() => props.onAlert(alert.id)}>
      <View accessibilityLabel={`${alert.source === 'official' ? 'Oficjalny alert' : 'Alert użytkownika'}: ${alertNames[alert.type] ?? alert.type}`} style={[styles.alertMarker, alert.source === 'official' ? styles.officialAlertMarker : styles.userAlertMarker, alert.id === props.selectedAlertId && styles.alertMarkerSelected]}>
        <Ionicons name={alert.source === 'official' ? 'megaphone' : 'warning'} size={16} color="#FFFFFF" />
      </View>
    </Marker>) : null}
    {props.activeOverlay === 'traffic' ? <GeoJSONSource id="traffic-heatmap-source" data={trafficData}>
      <Layer id="traffic-heatmap" type="heatmap" source="traffic-heatmap-source" paint={{
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 12, 1.6],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 32, 10, 52, 15, 72],
        'heatmap-opacity': 0.78,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(34,197,94,0)', 0.12, 'rgba(34,197,94,0.65)', 0.35, '#84CC16', 0.55, '#FACC15', 0.76, '#F97316', 1, '#DC2626'],
      }} />
    </GeoJSONSource> : null}
    {props.activeOverlay === 'historical' ? <GeoJSONSource id="historical-ais-source" data={trafficData}>
      <Layer id="historical-ais-heatmap" type="heatmap" source="historical-ais-source" maxzoom={HISTORICAL_AIS_MAX_DISPLAY_ZOOM} paint={{
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.45, 8, 0.62, 10, 0.78],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 5, 8, 9, 10, 15],
        'heatmap-opacity': 0.74,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(37,99,235,0)', 0.16, 'rgba(37,99,235,0.45)', 0.38, '#06B6D4', 0.62, '#A3E635', 0.82, '#F59E0B', 1, '#E11D48'],
      }} />
    </GeoJSONSource> : null}
    {props.activeOverlay === 'vessels' ? <GeoJSONSource id="vessels-source" data={trafficData}>
      <Layer id="vessels" type="circle" source="vessels-source" paint={{ 'circle-color': '#0E7490', 'circle-radius': 5, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 }} />
    </GeoJSONSource> : null}
    {props.ports.map((port) => <Marker key={port.id} id={`port-${port.id}`} lngLat={port.location.coordinates} anchor="bottom" onPress={() => props.onPort(port.id)}>
      <View accessibilityLabel={`Port ${port.name}`} style={[styles.portMarker, port.id === props.selectedPortId && styles.portMarkerSelected]}>
        <Ionicons name="boat" size={16} color="#FFFFFF" />
      </View>
    </Marker>)}
    {selectedPort ? <Marker id="selected-port-popup" lngLat={selectedPort.location.coordinates} anchor="bottom" offset={[0, -38]}>
      <Pressable accessibilityRole="button" style={styles.callout} onPress={() => props.onPortDetails(selectedPort.id)}>
        <View style={styles.portPopup}>
          <Text numberOfLines={2} style={styles.popupTitle}>{selectedPort.name}</Text>
          <Text style={styles.popupDistance}>{props.selectedPortDistance === undefined
            ? 'Odległość: ustalanie…'
            : props.selectedPortDistance === null ? 'Odległość: niedostępna' : `Odległość: ${formatDistance(props.selectedPortDistance)}`}</Text>
          <View style={styles.popupAction}>
            <Text style={styles.popupActionText}>Szczegóły portu</Text><Ionicons name="chevron-forward" size={16} color="#0369A1" />
          </View>
        </View>
        <View style={styles.popupArrow} />
      </Pressable>
    </Marker> : null}
    {selectedAlert ? <Marker id="selected-alert-popup" lngLat={selectedAlert.location.coordinates} anchor="bottom" offset={[0, -27]}>
      <View style={styles.callout}>
        <View style={styles.alertPopup}>
          <View style={styles.alertPopupHeader}><View style={[styles.sourceDot, selectedAlert.source === 'official' ? styles.officialAlertMarker : styles.userAlertMarker]} /><Text style={styles.alertSource}>{selectedAlert.source === 'official' ? 'Alert oficjalny' : 'Zgłoszenie użytkownika'}</Text><Pressable accessibilityLabel="Zamknij informacje o alercie" onPress={() => props.onAlert(selectedAlert.id)} hitSlop={10}><Ionicons name="close" size={18} color="#64748B" /></Pressable></View>
          <Text numberOfLines={2} style={styles.popupTitle}>{alertNames[selectedAlert.type] ?? selectedAlert.type}</Text>
          <Text numberOfLines={3} style={styles.alertDescription}>{selectedAlert.description}</Text>
          <Text style={styles.alertMeta}>Poziom: {alertSeverityNames[selectedAlert.severity] ?? selectedAlert.severity} · ważność: {formatDate(selectedAlert.validUntil)}</Text>
        </View>
        <View style={styles.popupArrow} />
      </View>
    </Marker> : null}
  </Map>;
}

const styles = StyleSheet.create({
  callout: { width: 220, alignItems: 'center' },
  portPopup: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  popupTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  popupDistance: { color: '#64748B', fontSize: 12, marginTop: 5 },
  popupAction: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 9 },
  popupActionText: { color: '#0369A1', fontSize: 13, fontWeight: '800' },
  popupArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
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
  portMarkerSelected: { backgroundColor: '#0369A1', transform: [{ scale: 1.08 }] },
  alertMarker: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderColor: '#FFFFFF', borderWidth: 2.5, elevation: 5 },
  officialAlertMarker: { backgroundColor: '#B91C1C' },
  userAlertMarker: { backgroundColor: '#D97706' },
  alertMarkerSelected: { transform: [{ scale: 1.14 }], borderWidth: 3.5 },
  alertPopup: { width: '100%', padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.22, shadowRadius: 8, elevation: 8 },
  alertPopupHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  sourceDot: { width: 9, height: 9, borderRadius: 5 },
  alertSource: { flex: 1, color: '#64748B', fontSize: 12, fontWeight: '700' },
  alertDescription: { color: '#334155', fontSize: 13, lineHeight: 18, marginTop: 5 },
  alertMeta: { color: '#64748B', fontSize: 11, marginTop: 8 },
});
