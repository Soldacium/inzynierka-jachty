import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { enqueueLocations, flushLocationQueue } from './location-queue';

export const LOCATION_TASK = 'na-fali-active-voyage-location';
const locationSampleIntervalMs = 60_000;
const locationUploadIntervalMs = 60_000;
let lastLocationSampleAt = 0;
let lastLocationUploadAt = 0;

interface LocationTaskData { locations: Location.LocationObject[] }

if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations.length) return;
    const latest = data.locations.reduce((current, location) => location.timestamp > current.timestamp ? location : current);
    if (latest.timestamp - lastLocationSampleAt < locationSampleIntervalMs) return;
    await enqueueLocations([latest]);
    lastLocationSampleAt = latest.timestamp;
    if (Date.now() - lastLocationUploadAt < locationUploadIntervalMs) return;
    try {
      await flushLocationQueue();
      lastLocationUploadAt = Date.now();
    } catch { /* keep the app-local queue for reconnect */ }
  });
}
