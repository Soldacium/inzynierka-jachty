import { gridSizeForZoom, trafficLevel } from './traffic.service.js';

interface Bounds { north: number; south: number; east: number; west: number }
export interface DemoTrafficPoint {
  vesselId: string; latitude: number; longitude: number; accuracy: number; speed: number; heading: number; recordedAt: string;
}

interface DemoCluster {
  id: string;
  latitude: number;
  longitude: number;
  users: number;
}

// Fixed geographic locations are intentional. Generating these coordinates from
// the requested viewport made the demo vessels appear glued to the screen while
// panning and zooming the map.
const demoClusters: DemoCluster[] = [
  { id: 'gdynia', latitude: 54.55, longitude: 18.45, users: 4 },
  { id: 'gdansk-roadstead', latitude: 54.48, longitude: 18.68, users: 9 },
  { id: 'gulf-of-gdansk', latitude: 54.65, longitude: 18.83, users: 18 },
  { id: 'swinoujscie', latitude: 53.92, longitude: 14.28, users: 9 },
  { id: 'kolobrzeg', latitude: 54.20, longitude: 15.58, users: 4 },
  { id: 'ustka', latitude: 54.60, longitude: 16.92, users: 9 },
  { id: 'leba', latitude: 54.79, longitude: 17.58, users: 4 },
];

function isInside(bounds: Bounds, latitude: number, longitude: number) {
  return latitude >= bounds.south && latitude <= bounds.north
    && longitude >= bounds.west && longitude <= bounds.east;
}

export function demoTrafficPoints(bounds: Bounds): DemoTrafficPoint[] {
  const now = new Date().toISOString();
  return demoClusters.flatMap((cluster, clusterIndex) => Array.from({ length: cluster.users }, (_, index) => {
    // Golden-angle scatter avoids the artificial rings produced by evenly
    // spacing every demo vessel on a circle.
    const angle = index * Math.PI * (3 - Math.sqrt(5)) + clusterIndex * 0.71;
    const radius = 0.003 + Math.sqrt((index + 1) / cluster.users) * 0.014;
    return {
      vesselId: `demo-${cluster.id}-${index}`,
      longitude: cluster.longitude + Math.cos(angle) * radius * 1.35,
      latitude: cluster.latitude + Math.sin(angle) * radius * 0.8,
      accuracy: 12,
      speed: 1.8 + (index % 5) * 0.7,
      heading: Math.round((angle * 180 / Math.PI + 90) % 360),
      recordedAt: now,
    };
  })).filter((point) => isInside(bounds, point.latitude, point.longitude));
}

export function demoTrafficCells(bounds: Bounds, zoom: number) {
  const gridSize = gridSizeForZoom(zoom);
  return demoClusters.filter((cluster) => isInside(bounds, cluster.latitude, cluster.longitude)).flatMap((cluster) => {
    const level = trafficLevel(cluster.users);
    if (!level) return [];
    return [{
      longitude: Math.floor(cluster.longitude / gridSize) * gridSize + gridSize / 2,
      latitude: Math.floor(cluster.latitude / gridSize) * gridSize + gridSize / 2,
      weight: Math.min(1, cluster.users / 16),
      sampleCount: cluster.users * 3,
      uniqueUsers: cluster.users,
      level,
    }];
  });
}
