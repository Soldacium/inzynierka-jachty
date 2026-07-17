import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import type { LocationObject } from 'expo-location';
import { api } from '@/src/api/client';

interface QueueRow {
  id: string; latitude: number; longitude: number; accuracy: number; speed: number | null; heading: number | null; recorded_at: string;
}

let database: Promise<SQLite.SQLiteDatabase> | null = null;
async function db() {
  database ??= SQLite.openDatabaseAsync('na-fali-location.db').then(async (connection) => {
    await connection.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS location_queue (
        id TEXT PRIMARY KEY NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL,
        accuracy REAL NOT NULL, speed REAL, heading REAL, recorded_at TEXT NOT NULL
      );`);
    return connection;
  });
  return database;
}

export async function enqueueLocations(locations: LocationObject[]): Promise<void> {
  const connection = await db();
  await connection.withTransactionAsync(async () => {
    for (const location of locations) {
      await connection.runAsync(
        'INSERT OR IGNORE INTO location_queue (id, latitude, longitude, accuracy, speed, heading, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        Crypto.randomUUID(), location.coords.latitude, location.coords.longitude, location.coords.accuracy ?? 9999,
        location.coords.speed, location.coords.heading, new Date(location.timestamp).toISOString(),
      );
    }
  });
}

export async function flushLocationQueue(): Promise<number> {
  const connection = await db();
  const rows = await connection.getAllAsync<QueueRow>('SELECT * FROM location_queue ORDER BY recorded_at ASC LIMIT 100');
  if (!rows.length) return 0;
  await api.post('/locations/batch', { samples: rows.map((row) => ({
    clientGeneratedId: row.id, latitude: row.latitude, longitude: row.longitude, accuracy: row.accuracy,
    speed: row.speed, heading: row.heading, recordedAt: row.recorded_at,
  })) });
  const placeholders = rows.map(() => '?').join(',');
  await connection.runAsync(`DELETE FROM location_queue WHERE id IN (${placeholders})`, ...rows.map((row) => row.id));
  return rows.length;
}

export async function clearLocationQueue(): Promise<void> { await (await db()).runAsync('DELETE FROM location_queue'); }
export async function locationQueueSize(): Promise<number> { return (await (await db()).getFirstAsync<{ count: number }>('SELECT count(*) AS count FROM location_queue'))?.count ?? 0; }
