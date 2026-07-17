import { TrafficLevel } from '../../database/entities.js';

export function trafficLevel(uniqueUsers: number): TrafficLevel | null {
  if (uniqueUsers < 3) return null;
  if (uniqueUsers <= 5) return TrafficLevel.Low;
  if (uniqueUsers <= 15) return TrafficLevel.Medium;
  return TrafficLevel.High;
}

export function gridSizeForZoom(zoom: number): number {
  return Math.max(0.001, 360 / 2 ** (Math.round(zoom) + 8));
}
