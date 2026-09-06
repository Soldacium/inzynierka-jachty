import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { z } from 'zod';
import { gridSizeForZoom } from './traffic.service.js';

const RECORD_BYTES = 12;
export const HISTORICAL_AIS_MAX_DISPLAY_ZOOM = 10;
const LOWER_VIEWPORT_PERCENTILE = 0.7;
const UPPER_VIEWPORT_PERCENTILE = 0.99;

const metadataSchema = z.object({
  provider: z.string(),
  dataset: z.string(),
  year: z.number().int(),
  shipType: z.string(),
  metric: z.string(),
  resolutionMeters: z.number().positive(),
  sourceCrs: z.string(),
  outputCrs: z.string(),
  sourceUrl: z.string().url(),
  downloadUrl: z.string().url(),
  attribution: z.string(),
  sourceFile: z.string(),
  sourceSha256: z.string(),
  recordCount: z.number().int().nonnegative(),
  minimumTrips: z.number().int().nonnegative(),
  maximumTrips: z.number().int().positive(),
});

export type HistoricalAisMetadata = z.infer<typeof metadataSchema>;

export interface HistoricalAisCell {
  latitude: number;
  longitude: number;
  tripCount: number;
  weight: number;
  level: 'low' | 'medium' | 'high';
}

export interface HistoricalAisResult {
  items: HistoricalAisCell[];
  metadata: HistoricalAisMetadata;
  available: boolean;
  maxDisplayZoom: number;
  unavailableReason?: 'zoom_too_high';
  normalization?: {
    mode: 'viewport_percentile';
    sourceCellCount: number;
    visibleCellCount: number;
    lowerPercentile: number;
    upperPercentile: number;
    lowerTripCount: number;
    upperTripCount: number;
  };
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface HistoricalAisDataset {
  latitudes: Float32Array;
  longitudes: Float32Array;
  tripCounts: Uint32Array;
  metadata: HistoricalAisMetadata;
}

interface Aggregate {
  weightedLatitude: number;
  weightedLongitude: number;
  tripCount: number;
}

export class HistoricalAisService {
  private datasetPromise?: Promise<HistoricalAisDataset>;

  constructor(
    private readonly dataPath = resolve(process.cwd(), 'data/historical-ais/helcom-ais-2024.bin.gz'),
    private readonly metadataPath = dataPath.replace(/\.bin\.gz$/, '.metadata.json'),
  ) {}

  async cells(bounds: Bounds, zoom: number): Promise<HistoricalAisResult> {
    const dataset = await this.dataset();
    if (zoom > HISTORICAL_AIS_MAX_DISPLAY_ZOOM) {
      return {
        items: [],
        metadata: dataset.metadata,
        available: false,
        maxDisplayZoom: HISTORICAL_AIS_MAX_DISPLAY_ZOOM,
        unavailableReason: 'zoom_too_high',
      };
    }
    const gridSize = gridSizeForZoom(zoom);
    const aggregates = new Map<string, Aggregate>();
    const crossesAntimeridian = bounds.west > bounds.east;

    for (let index = 0; index < dataset.metadata.recordCount; index += 1) {
      const latitude = dataset.latitudes[index];
      const longitude = dataset.longitudes[index];
      const tripCount = dataset.tripCounts[index];
      if (latitude === undefined || longitude === undefined || tripCount === undefined) continue;
      const withinLongitude = crossesAntimeridian
        ? longitude >= bounds.west || longitude <= bounds.east
        : longitude >= bounds.west && longitude <= bounds.east;
      if (!withinLongitude || latitude < bounds.south || latitude > bounds.north) continue;

      const key = `${Math.floor(longitude / gridSize)}:${Math.floor(latitude / gridSize)}`;
      const aggregate = aggregates.get(key) ?? { weightedLatitude: 0, weightedLongitude: 0, tripCount: 0 };
      aggregate.weightedLatitude += latitude * tripCount;
      aggregate.weightedLongitude += longitude * tripCount;
      aggregate.tripCount += tripCount;
      aggregates.set(key, aggregate);
    }

    const sortedTripCounts = Array.from(aggregates.values(), (aggregate) => aggregate.tripCount)
      .sort((left, right) => left - right);
    const lowerTripCount = percentile(sortedTripCounts, LOWER_VIEWPORT_PERCENTILE);
    const upperTripCount = percentile(sortedTripCounts, UPPER_VIEWPORT_PERCENTILE);
    const lowerLog = Math.log1p(lowerTripCount);
    const upperLog = Math.log1p(upperTripCount);
    const hasRange = upperLog > lowerLog;
    const items = Array.from(aggregates.values()).flatMap((aggregate): HistoricalAisCell[] => {
      if (hasRange && aggregate.tripCount <= lowerTripCount) return [];
      const weight = hasRange
        ? Math.min(1, Math.max(0, (Math.log1p(aggregate.tripCount) - lowerLog) / (upperLog - lowerLog)))
        : 1;
      return [{
        latitude: aggregate.weightedLatitude / aggregate.tripCount,
        longitude: aggregate.weightedLongitude / aggregate.tripCount,
        tripCount: aggregate.tripCount,
        weight,
        level: weight < 0.34 ? 'low' : weight < 0.67 ? 'medium' : 'high',
      }];
    }).sort((left, right) => right.tripCount - left.tripCount);

    return {
      items,
      metadata: dataset.metadata,
      available: true,
      maxDisplayZoom: HISTORICAL_AIS_MAX_DISPLAY_ZOOM,
      normalization: {
        mode: 'viewport_percentile',
        sourceCellCount: aggregates.size,
        visibleCellCount: items.length,
        lowerPercentile: LOWER_VIEWPORT_PERCENTILE,
        upperPercentile: UPPER_VIEWPORT_PERCENTILE,
        lowerTripCount,
        upperTripCount,
      },
    };
  }

  private dataset(): Promise<HistoricalAisDataset> {
    this.datasetPromise ??= this.loadDataset();
    return this.datasetPromise;
  }

  private async loadDataset(): Promise<HistoricalAisDataset> {
    const [compressed, metadataFile] = await Promise.all([
      readFile(this.dataPath),
      readFile(this.metadataPath, 'utf8'),
    ]);
    const metadata = metadataSchema.parse(JSON.parse(metadataFile));
    const records = gunzipSync(compressed);
    if (records.byteLength !== metadata.recordCount * RECORD_BYTES) {
      throw new Error(`Historical AIS data length does not match metadata: ${records.byteLength} bytes.`);
    }

    const latitudes = new Float32Array(metadata.recordCount);
    const longitudes = new Float32Array(metadata.recordCount);
    const tripCounts = new Uint32Array(metadata.recordCount);
    for (let index = 0; index < metadata.recordCount; index += 1) {
      const offset = index * RECORD_BYTES;
      longitudes[index] = records.readFloatLE(offset);
      latitudes[index] = records.readFloatLE(offset + 4);
      tripCounts[index] = records.readUInt32LE(offset + 8);
    }
    return { latitudes, longitudes, tripCounts, metadata };
  }
}

function percentile(sortedValues: number[], fraction: number): number {
  if (!sortedValues.length) return 0;
  const index = Math.floor((sortedValues.length - 1) * fraction);
  return sortedValues[index] ?? 0;
}
