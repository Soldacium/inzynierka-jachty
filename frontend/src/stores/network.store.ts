import { create } from 'zustand';

interface NetworkState { online: boolean; initialized: boolean; setNetwork: (online: boolean) => void }
export const useNetworkStore = create<NetworkState>((set) => ({ online: true, initialized: false, setNetwork: (online) => set({ online, initialized: true }) }));
