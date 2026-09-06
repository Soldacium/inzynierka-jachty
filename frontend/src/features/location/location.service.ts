import * as Location from 'expo-location';
import { LOCATION_TASK } from './background-task';
import { clearLocationQueue, flushLocationQueue } from './location-queue';

export type TrackingStartResult = 'started' | 'foreground_denied' | 'background_denied' | 'services_disabled';

export async function startTracking(): Promise<TrackingStartResult> {
  if (!await Location.hasServicesEnabledAsync()) return 'services_disabled';
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return 'foreground_denied';
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return 'background_denied';
  if (!await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 60_000,
      deferredUpdatesInterval: 60_000,
      activityType: Location.ActivityType.OtherNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Boja — udostępnianie pozycji',
        notificationBody: 'Anonimowa pozycja łodzi jest aktualizowana w tle.',
        notificationColor: '#0369A1',
      },
    });
  }
  return 'started';
}

export async function stopTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  try { await flushLocationQueue(); } catch { /* next foreground reconnect will retry */ }
}

export async function isTracking(): Promise<boolean> { return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK); }
export async function currentPosition(): Promise<Location.LocationObject> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('LOCATION_PERMISSION_DENIED');
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}
export async function lastKnownPosition(): Promise<Location.LocationObject | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;
  return Location.getLastKnownPositionAsync();
}
export async function revokeLocalTracking(): Promise<void> { await stopTracking(); await clearLocationQueue(); }
