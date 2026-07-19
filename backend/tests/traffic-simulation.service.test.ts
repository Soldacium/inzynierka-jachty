import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrafficSimulationService } from '../src/modules/traffic/traffic-simulation.service.js';

describe('traffic simulation', () => {
  afterEach(() => vi.useRealTimers());

  it('resets to stable positions and publishes realtime ticks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-19T12:00:00.000Z'));
    const publish = vi.fn();
    const simulation = new TrafficSimulationService(publish, true, 1_000);
    const bounds = { north: 55, south: 54, east: 19, west: 18 };

    const baseline = simulation.points(bounds);
    const reset = simulation.resetAndStart();
    expect(reset).toMatchObject({ available: true, running: true, tick: 0, vesselCount: 31 });
    expect(simulation.points(bounds).map((point) => point.vesselId)).toEqual(baseline.map((point) => point.vesselId));

    vi.advanceTimersByTime(1_000);
    expect(simulation.status().tick).toBe(1);
    expect(simulation.points(bounds)[0]?.longitude).not.toBe(baseline[0]?.longitude);
    expect(publish).toHaveBeenCalledWith('traffic:points_updated', expect.any(Object));
    expect(publish).toHaveBeenCalledWith('traffic:heatmap_updated', expect.any(Object));
    expect(simulation.stop().running).toBe(false);
  });
});
