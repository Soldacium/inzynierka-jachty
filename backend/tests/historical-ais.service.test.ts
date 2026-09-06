import { describe, expect, it } from 'vitest';
import { HistoricalAisService } from '../src/modules/traffic/historical-ais.service.js';

const gdanskBay = { north: 55.2, south: 53.9, east: 19.8, west: 17.2 };

describe('historical HELCOM AIS data', () => {
  const service = new HistoricalAisService();

  it('returns real 2024 density cells only from the requested viewport', async () => {
    const result = await service.cells(gdanskBay, 8);

    expect(result.metadata).toMatchObject({
      provider: 'HELCOM',
      year: 2024,
      resolutionMeters: 1000,
      recordCount: 362_564,
      maximumTrips: 34_848,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.available).toBe(true);
    expect(result.normalization).toMatchObject({
      mode: 'viewport_percentile',
      lowerPercentile: 0.7,
      upperPercentile: 0.99,
    });
    expect(result.normalization!.visibleCellCount).toBeLessThan(result.normalization!.sourceCellCount);
    expect(result.items.every((cell) => (
      cell.latitude >= gdanskBay.south
      && cell.latitude <= gdanskBay.north
      && cell.longitude >= gdanskBay.west
      && cell.longitude <= gdanskBay.east
      && cell.tripCount > 0
      && cell.weight > 0
      && cell.weight <= 1
    ))).toBe(true);
  });

  it('aggregates cells more strongly at lower map zooms', async () => {
    const [overview, detail] = await Promise.all([
      service.cells(gdanskBay, 4),
      service.cells(gdanskBay, 10),
    ]);

    expect(overview.items.length).toBeLessThan(detail.items.length);
    expect(overview.normalization!.sourceCellCount).toBeLessThan(detail.normalization!.sourceCellCount);
  });

  it('disables the annual density layer at zoom levels that expose the source grid', async () => {
    const result = await service.cells(gdanskBay, 11);

    expect(result).toMatchObject({
      items: [],
      available: false,
      maxDisplayZoom: 10,
      unavailableReason: 'zoom_too_high',
    });
  });

  it('does not fabricate data outside the HELCOM raster', async () => {
    const result = await service.cells({ north: -32, south: -35, east: 20, west: 15 }, 8);
    expect(result.items).toEqual([]);
  });
});
