import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryString } from '@/src/api/client';
import { useAuthStore } from '@/src/stores/auth.store';
import type { Alert, AlertSource, ApiList, Conversation, MapBounds, Message, Port, PortNotice, SailRoute, TrafficCell, TrafficPoint, TrafficResponse, User } from '@/src/types/api';

export function usePorts(search = '', bounds?: Omit<MapBounds, 'zoom'>) {
  return useQuery({ queryKey: ['ports', search, bounds], queryFn: () => api.get<ApiList<Port>>(`/ports${queryString({ search, ...bounds })}`), placeholderData: keepPreviousData });
}
export function usePort(id?: string) { return useQuery({ queryKey: ['ports', id], queryFn: () => api.get<Port>(`/ports/${id}`), enabled: Boolean(id) }); }
export function usePortNotices(id?: string) { return useQuery({ queryKey: ['ports', id, 'notices'], queryFn: () => api.get<ApiList<PortNotice>>(`/ports/${id}/notices`), enabled: Boolean(id) }); }
export function useManagedPorts(enabled = true) { return useQuery({ queryKey: ['managed-ports'], queryFn: () => api.get<ApiList<Port>>('/ports/managed'), enabled }); }
export function useUpdatePort(portId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<Port, 'name' | 'description' | 'contactEmail' | 'contactPhone' | 'vhfChannel'>>) => api.patch<Port>(`/ports/${portId}`, input),
    onSuccess: (port) => {
      client.setQueryData(['ports', portId], port);
      void client.invalidateQueries({ queryKey: ['managed-ports'] });
      void client.invalidateQueries({ queryKey: ['ports'] });
    },
  });
}

export function useAlerts(bounds?: Omit<MapBounds, 'zoom'>, source?: AlertSource) {
  return useQuery({ queryKey: ['alerts', bounds, source], queryFn: () => api.get<ApiList<Alert>>(`/alerts${queryString({ ...(bounds ?? {}), source })}`), placeholderData: keepPreviousData, refetchInterval: 60_000 });
}
export function useCreateAlert() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { type: string; description: string; latitude: number; longitude: number; severity: string; portId?: string | null }) => api.post<Alert>('/alerts', { ...input, location: { latitude: input.latitude, longitude: input.longitude } }), onSuccess: () => client.invalidateQueries({ queryKey: ['alerts'] }) });
}

export function useTraffic(bounds: MapBounds, mode: 'points' | 'heatmap', enabled = true) {
  const endpoint = mode === 'points' ? '/traffic/points' : '/traffic/heatmap';
  return useQuery({
    queryKey: ['traffic', mode, bounds],
    queryFn: () => api.get<TrafficResponse<TrafficPoint | TrafficCell>>(`${endpoint}${queryString({ ...bounds })}`),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useRoutes() { return useQuery({ queryKey: ['routes'], queryFn: () => api.get<ApiList<SailRoute>>('/routes') }); }
export function useRoute(id?: string) { return useQuery({ queryKey: ['routes', id], queryFn: () => api.get<SailRoute>(`/routes/${id}`), enabled: Boolean(id) }); }
export function useCreateRoute() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { name: string; points: { latitude: number; longitude: number; label?: string | null }[] }) => api.post<SailRoute>('/routes', { ...input, status: 'planned' }), onSuccess: () => client.invalidateQueries({ queryKey: ['routes'] }) });
}
export function useDeleteRoute() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/routes/${id}`), onSuccess: () => client.invalidateQueries({ queryKey: ['routes'] }) });
}

export function useConversations() { return useQuery({ queryKey: ['conversations'], queryFn: () => api.get<ApiList<Conversation>>('/conversations') }); }
export function useMessages(id?: string) { return useQuery({ queryKey: ['conversations', id, 'messages'], queryFn: () => api.get<ApiList<Message>>(`/conversations/${id}/messages`), enabled: Boolean(id), refetchInterval: 30_000 }); }
export function useStartConversation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (portId: string) => api.post<Conversation>('/conversations', { portId }), onSuccess: () => client.invalidateQueries({ queryKey: ['conversations'] }) });
}
export function useSendMessage(id?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (body: string) => api.post<Message>(`/conversations/${id}/messages`, { body }), onSuccess: () => client.invalidateQueries({ queryKey: ['conversations', id, 'messages'] }) });
}
export function useMarkConversationRead(id?: string) { return useMutation({ mutationFn: () => api.post(`/conversations/${id}/read`) }); }

export function useUpdatePrivacy() {
  const updateUser = useAuthStore((state) => state.updateUser);
  return useMutation({ mutationFn: (input: { locationConsent: boolean; shareActivePosition: boolean }) => api.patch<User>('/users/me/privacy', input), onSuccess: updateUser });
}
export function useDeleteLocationHistory() { return useMutation({ mutationFn: () => api.delete('/users/me/location-history') }); }

export function useUpdateAvailability(portId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { availableSpots: number | null; status: string }) => api.post(`/ports/${portId}/availability`, input), onSuccess: () => { void client.invalidateQueries({ queryKey: ['managed-ports'] }); void client.invalidateQueries({ queryKey: ['ports', portId] }); } });
}
export function useCreateNotice(portId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { title: string; body: string; validUntil?: string | null }) => api.post(`/ports/${portId}/notices`, input), onSuccess: () => client.invalidateQueries({ queryKey: ['ports', portId, 'notices'] }) });
}
