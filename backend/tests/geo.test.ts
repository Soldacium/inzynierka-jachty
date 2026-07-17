import { describe, expect, it } from 'vitest';
import { bboxSchema, coordinateSchema, point } from '../src/common/geo.js';

describe('geospatial input', () => {
  it('uses GeoJSON longitude-latitude coordinate order', () => {
    expect(point(54.5189, 18.5305)).toEqual({ type: 'Point', coordinates: [18.5305, 54.5189] });
  });

  it('rejects invalid coordinates and incomplete bounding boxes', () => {
    expect(coordinateSchema.safeParse({ latitude: 91, longitude: 18 }).success).toBe(false);
    expect(bboxSchema.safeParse({ north: 55 }).success).toBe(false);
    expect(bboxSchema.safeParse({ north: 54, south: 55, east: 19, west: 18 }).success).toBe(false);
  });
});
