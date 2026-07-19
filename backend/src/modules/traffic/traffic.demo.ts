import { gridSizeForZoom, trafficLevel } from './traffic.service.js';

export interface Bounds { north: number; south: number; east: number; west: number }

export interface DemoTrafficPoint {
  vesselId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  recordedAt: string;
}

export interface DemoVesselDefinition {
  userId: string;
  vesselId: string;
  displayName: string;
  email: string;
}

interface DemoFleet {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  latitudeRadius: number;
  longitudeRadius: number;
  phase: number;
  angularSpeed: number;
  users: number;
}

const demoFleets: DemoFleet[] = [
  { id: 'gdynia', name: 'Gdynia', latitude: 54.55, longitude: 18.62, latitudeRadius: 0.025, longitudeRadius: 0.055, phase: 0.2, angularSpeed: 0.018, users: 4 },
  { id: 'gdansk-roadstead', name: 'Reda Gdańska', latitude: 54.43, longitude: 18.72, latitudeRadius: 0.035, longitudeRadius: 0.09, phase: 2.1, angularSpeed: 0.014, users: 9 },
  { id: 'gulf-of-gdansk', name: 'Zatoka Gdańska', latitude: 54.66, longitude: 18.84, latitudeRadius: 0.05, longitudeRadius: 0.12, phase: 4.2, angularSpeed: 0.01, users: 18 },
];

export const demoVesselDefinitions: DemoVesselDefinition[] = demoFleets.flatMap((fleet, fleetIndex) =>
  Array.from({ length: fleet.users }, (_, vesselIndex) => {
    const serial = fleetIndex * 100 + vesselIndex + 1;
    return {
      userId: `10000000-0000-4000-8000-${String(serial).padStart(12, '0')}`,
      vesselId: `demo-${fleet.id}-${vesselIndex + 1}`,
      displayName: `${fleet.name} ${vesselIndex + 1}`,
      email: `demo.${fleet.id}.${vesselIndex + 1}@example.invalid`,
    };
  }),
);

function isInside(bounds: Bounds, latitude: number, longitude: number) {
  return latitude >= bounds.south && latitude <= bounds.north
    && longitude >= bounds.west && longitude <= bounds.east;
}

function fleetCenter(fleet: DemoFleet, tick: number) {
  const angle = fleet.phase + tick * fleet.angularSpeed;
  return {
    angle,
    latitude: fleet.latitude + Math.sin(angle) * fleet.latitudeRadius,
    longitude: fleet.longitude + Math.cos(angle) * fleet.longitudeRadius,
  };
}

export function demoTrafficPoints(bounds: Bounds, tick = 0, recordedAt = new Date()): DemoTrafficPoint[] {
  let definitionOffset = 0;
  return demoFleets.flatMap((fleet) => {
    const center = fleetCenter(fleet, tick);
    const definitions = demoVesselDefinitions.slice(definitionOffset, definitionOffset + fleet.users);
    definitionOffset += fleet.users;
    return definitions.map((definition, index) => {
      const scatterAngle = index * Math.PI * (3 - Math.sqrt(5)) + tick * 0.004;
      const scatterRadius = 0.002 + Math.sqrt((index + 1) / fleet.users) * 0.01;
      const longitude = center.longitude + Math.cos(scatterAngle) * scatterRadius * 1.3;
      const latitude = center.latitude + Math.sin(scatterAngle) * scatterRadius * 0.75;
      const eastVelocity = -Math.sin(center.angle) * fleet.longitudeRadius;
      const northVelocity = Math.cos(center.angle) * fleet.latitudeRadius;
      return {
        vesselId: definition.vesselId,
        displayName: definition.displayName,
        longitude,
        latitude,
        accuracy: 8 + index % 5,
        speed: 1.8 + index % 6 * 0.45,
        heading: Math.round((Math.atan2(eastVelocity, northVelocity) * 180 / Math.PI + 360) % 360),
        recordedAt: recordedAt.toISOString(),
      };
    }).filter((point) => isInside(bounds, point.latitude, point.longitude));
  });
}

export function demoTrafficCells(bounds: Bounds, zoom: number, tick = 0) {
  const gridSize = gridSizeForZoom(zoom);
  return demoFleets.flatMap((fleet) => {
    const center = fleetCenter(fleet, tick);
    if (!isInside(bounds, center.latitude, center.longitude)) return [];
    const level = trafficLevel(fleet.users);
    if (!level) return [];
    return [{
      longitude: Math.floor(center.longitude / gridSize) * gridSize + gridSize / 2,
      latitude: Math.floor(center.latitude / gridSize) * gridSize + gridSize / 2,
      weight: Math.min(1, fleet.users / 16),
      sampleCount: fleet.users * 3,
      uniqueUsers: fleet.users,
      level,
    }];
  });
}
