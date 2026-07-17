import 'dotenv/config';
import { z } from 'zod';

const booleanString = z.string().optional().transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().default('postgresql://app:password@localhost:5432/appdb'),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-123456'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-12345'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),
  PUBLIC_POSITION_DECIMALS: z.coerce.number().int().min(0).max(6).default(3),
  LOCATION_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
  TRAFFIC_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  TRAFFIC_MIN_USERS: z.coerce.number().int().min(2).default(3),
  TRAFFIC_DEMO_MODE: booleanString,
  ALERT_CREATE_LIMIT: z.coerce.number().int().positive().default(5),
  ALERT_CREATE_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  OVERPASS_API_URL: z.string().url().default('https://overpass-api.de/api/interpreter'),
  SMTP_URL: z.string().default('smtp://localhost:1025'),
  APP_BASE_URL: z.string().url().default('http://localhost:8081'),
  TRUST_PROXY: booleanString,
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
};

export type AppEnv = typeof env;
