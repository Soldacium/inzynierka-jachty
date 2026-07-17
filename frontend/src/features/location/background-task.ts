import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { enqueueLocations, flushLocationQueue } from './location-queue';

export const LOCATION_TASK = 'na-fali-active-voyage-location';

interface LocationTaskData { locations: Location.LocationObject[] }

if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations.length) return;
    await enqueueLocations(data.locations);
    try { await flushLocationQueue(); } catch { /* keep the app-local queue for reconnect */ }
  });
}
