import { z } from 'zod';

export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const bboxSchema = z.object({
  north: z.coerce.number().min(-90).max(90).optional(),
  south: z.coerce.number().min(-90).max(90).optional(),
  east: z.coerce.number().min(-180).max(180).optional(),
  west: z.coerce.number().min(-180).max(180).optional(),
}).superRefine((value, context) => {
  const values = [value.north, value.south, value.east, value.west];
  if (values.some((item) => item !== undefined) && values.some((item) => item === undefined)) {
    context.addIssue({ code: 'custom', message: 'All bounding box coordinates are required.' });
  }
  if (value.north !== undefined && value.south !== undefined && value.north <= value.south) {
    context.addIssue({ code: 'custom', message: 'north must be greater than south.' });
  }
});

export function point(latitude: number, longitude: number) {
  return { type: 'Point' as const, coordinates: [longitude, latitude] };
}

export function bboxSql(alias: string): string {
  return `ST_Intersects(${alias}.location, ST_MakeEnvelope(:west, :south, :east, :north, 4326))`;
}
