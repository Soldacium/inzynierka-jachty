import { create } from 'zustand';

export type MapOverlay = 'route' | 'vessels' | 'traffic' | 'alerts';
export type AlertFilter = 'all' | 'official' | 'user';
export type MapStyleChoice = 'detailed' | 'simple';
interface MapState {
  activeOverlay: MapOverlay; setActiveOverlay: (overlay: MapOverlay) => void;
  alertFilter: AlertFilter; setAlertFilter: (filter: AlertFilter) => void;
  mapStyle: MapStyleChoice; setMapStyle: (style: MapStyleChoice) => void;
}

export const useMapStore = create<MapState>((set) => ({
  activeOverlay: 'traffic',
  alertFilter: 'all',
  mapStyle: 'detailed',
  setActiveOverlay: (activeOverlay) => set({ activeOverlay }),
  setAlertFilter: (alertFilter) => set({ alertFilter }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
}));
