import { env } from '../../config/env.js';
import { demoTrafficCells, demoTrafficPoints, demoVesselDefinitions, type Bounds } from './traffic.demo.js';

export interface TrafficSimulationStatus {
  available: boolean;
  running: boolean;
  tick: number;
  vesselCount: number;
  intervalMs: number;
  startedAt: string | null;
  calculatedAt: string;
}

type Publish = (event: 'traffic:points_updated' | 'traffic:heatmap_updated', data: unknown) => void;

export class TrafficSimulationService {
  private tick = 0;
  private timer: NodeJS.Timeout | null = null;
  private startedAt: Date | null = null;
  private calculatedAt = new Date();

  constructor(
    private readonly publish: Publish,
    private readonly available = env.TRAFFIC_DEMO_MODE,
    private readonly intervalMs = env.TRAFFIC_SIMULATION_INTERVAL_MS,
  ) {}

  status(): TrafficSimulationStatus {
    return {
      available: this.available,
      running: this.timer !== null,
      tick: this.tick,
      vesselCount: demoVesselDefinitions.length,
      intervalMs: this.intervalMs,
      startedAt: this.startedAt?.toISOString() ?? null,
      calculatedAt: this.calculatedAt.toISOString(),
    };
  }

  resetAndStart(): TrafficSimulationStatus {
    this.stop(false);
    this.tick = 0;
    this.startedAt = new Date();
    this.calculatedAt = this.startedAt;
    this.timer = setInterval(() => this.advance(), this.intervalMs);
    this.timer.unref();
    this.publishUpdate('reset');
    return this.status();
  }

  stop(publish = true): TrafficSimulationStatus {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (publish) this.publishUpdate('stopped');
    return this.status();
  }

  points(bounds: Bounds) {
    return demoTrafficPoints(bounds, this.tick, this.calculatedAt);
  }

  cells(bounds: Bounds, zoom: number) {
    return demoTrafficCells(bounds, zoom, this.tick);
  }

  private advance() {
    this.tick += 1;
    this.calculatedAt = new Date();
    this.publishUpdate('tick');
  }

  private publishUpdate(reason: 'reset' | 'tick' | 'stopped') {
    const data = { reason, simulation: this.status() };
    this.publish('traffic:points_updated', data);
    this.publish('traffic:heatmap_updated', data);
  }
}
