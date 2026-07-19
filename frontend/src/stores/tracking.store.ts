import { create } from 'zustand';
import { isTracking, revokeLocalTracking, startTracking, stopTracking, type TrackingStartResult } from '@/src/features/location/location.service';

interface TrackingState {
  active: boolean; checking: boolean;
  refresh: () => Promise<void>;
  start: () => Promise<TrackingStartResult>;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
}
export const useTrackingStore = create<TrackingState>((set) => ({
  active: false, checking: true,
  refresh: async () => set({ active: await isTracking(), checking: false }),
  start: async () => { const result = await startTracking(); set({ active: result === 'started', checking: false }); return result; },
  stop: async () => { await stopTracking(); set({ active: false }); },
  reset: async () => { await revokeLocalTracking(); set({ active: false, checking: false }); },
}));
