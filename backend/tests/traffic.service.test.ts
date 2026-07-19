import { describe, expect, it } from 'vitest';
import { TrafficLevel } from '../src/database/entities.js';
import { gridSizeForZoom, trafficLevel } from '../src/modules/traffic/traffic.service.js';
import { demoTrafficCells, demoTrafficPoints } from '../src/modules/traffic/traffic.demo.js';

describe('traffic privacy and levels', () => {
  it('does not expose cells below the privacy threshold', () => {
    expect(trafficLevel(0)).toBeNull();
    expect(trafficLevel(1)).toBeNull();
    expect(trafficLevel(2)).toBeNull();
  });

  it('maps unique user counts to stable traffic levels', () => {
    expect(trafficLevel(3)).toBe(TrafficLevel.Low);
    expect(trafficLevel(5)).toBe(TrafficLevel.Low);
    expect(trafficLevel(6)).toBe(TrafficLevel.Medium);
    expect(trafficLevel(15)).toBe(TrafficLevel.Medium);
    expect(trafficLevel(16)).toBe(TrafficLevel.High);
  });

  it('uses smaller grid cells as map zoom increases', () => {
    expect(gridSizeForZoom(12)).toBeLessThan(gridSizeForZoom(8));
    expect(gridSizeForZoom(22)).toBeGreaterThanOrEqual(0.001);
  });

  it('generates an explicitly synthetic demo with all traffic levels', () => {
    const bounds = { north: 55, south: 54, east: 19, west: 18 };
    expect(demoTrafficPoints(bounds)).toHaveLength(31);
    expect(demoTrafficCells(bounds, 10).map((cell) => cell.level)).toEqual([
      TrafficLevel.Low, TrafficLevel.Medium, TrafficLevel.High,
    ]);
  });

  it('anchors demo vessels to geography instead of the requested viewport', () => {
    const first = demoTrafficPoints({ north: 55, south: 54, east: 19, west: 18 })
      .find((point) => point.vesselId === 'demo-gdynia-1');
    const shifted = demoTrafficPoints({ north: 55.2, south: 54.2, east: 19.2, west: 18.2 })
      .find((point) => point.vesselId === 'demo-gdynia-1');
    expect(shifted).toMatchObject({ latitude: first?.latitude, longitude: first?.longitude });
  });

  it('moves the same vessels deterministically as simulation ticks advance', () => {
    const bounds = { north: 55, south: 54, east: 19, west: 18 };
    const initial = demoTrafficPoints(bounds, 0)[0];
    const moved = demoTrafficPoints(bounds, 5)[0];
    expect(moved?.vesselId).toBe(initial?.vesselId);
    expect(moved?.longitude).not.toBe(initial?.longitude);
    expect(moved?.latitude).not.toBe(initial?.latitude);
  });
});
