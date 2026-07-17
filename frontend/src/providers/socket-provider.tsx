import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { io, type Socket } from 'socket.io-client';
import { config } from '@/src/config/env';
import { getSessionTokens } from '@/src/services/session';
import { useAuthStore } from '@/src/stores/auth.store';
import { queryClient } from './app-providers';

const SocketContext = createContext<Socket | null>(null);
const socketOrigin = config.apiUrl.replace(/\/api\/v1\/?$/, '');

export function SocketProvider({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const socket = useMemo(() => status === 'authenticated' ? io(socketOrigin, { autoConnect: false, transports: ['websocket'], auth: async (callback) => callback({ token: (await getSessionTokens())?.accessToken }) }) : null, [status]);
  useEffect(() => {
    if (!socket) return;
    const invalidate = (key: string) => { void queryClient.invalidateQueries({ queryKey: [key] }); };
    socket.on('connect', () => { socket.emit('scope:join', { type: 'alerts' }); socket.emit('scope:join', { type: 'traffic' }); });
    socket.on('port:availability_updated', () => invalidate('ports'));
    socket.on('port:notice_created', () => invalidate('ports'));
    socket.on('alert:created', () => invalidate('alerts'));
    socket.on('alert:updated', () => invalidate('alerts'));
    socket.on('traffic:points_updated', () => invalidate('traffic'));
    socket.on('traffic:heatmap_updated', () => invalidate('traffic'));
    socket.on('message:created', () => invalidate('conversations'));
    socket.connect();
    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, [socket]);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocketScope(type: 'port' | 'conversation', id?: string) {
  const socket = useContext(SocketContext);
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('scope:join', { type, id });
    return () => { socket.emit('scope:leave', `${type}:${id}`); };
  }, [id, socket, type]);
}
