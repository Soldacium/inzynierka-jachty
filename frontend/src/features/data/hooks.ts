import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryString } from '@/src/api/client';
import type { Alert, AlertSource, ApiList, Conversation, MapBounds, Message, Port, PortNotice, SailRoute, TrafficCell, TrafficPoint, TrafficResponse, TrafficSimulationStatus } from '@/src/types/api';

async function getAllPages<T>(path: string, parameters: Record<string, string | number | undefined>): Promise<ApiList<T>> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.get<ApiList<T>>(`${path}${queryString({ ...parameters, cursor, limit: 100 })}`);
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return { items, nextCursor: null };
}

export function usePorts(search = '') {
  return useQuery({ queryKey: ['ports', 'global', search], queryFn: () => getAllPages<Port>('/ports', { search }), placeholderData: keepPreviousData });
}
export function useViewportPorts(bounds: Omit<MapBounds, 'zoom'>) {
  return useQuery({ queryKey: ['ports', 'viewport', bounds], queryFn: () => getAllPages<Port>('/ports', bounds), placeholderData: keepPreviousData });
}
export function useInfinitePorts(search = '') {
  return useInfiniteQuery({
    queryKey: ['ports', 'list', search],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<ApiList<Port>>(`/ports${queryString({ search, cursor: pageParam, limit: 25 })}`),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
export function usePort(id?: string) { return useQuery({ queryKey: ['ports', id], queryFn: () => api.get<Port>(`/ports/${id}`), enabled: Boolean(id), refetchInterval: 120_000 }); }
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

export function useAlerts(source?: AlertSource) {
  return useQuery({ queryKey: ['alerts', 'global', source], queryFn: () => getAllPages<Alert>('/alerts', { source }), placeholderData: keepPreviousData, refetchInterval: 60_000 });
}
export function useViewportAlerts(bounds: Omit<MapBounds, 'zoom'>, source?: AlertSource) {
  return useQuery({ queryKey: ['alerts', 'viewport', bounds, source], queryFn: () => getAllPages<Alert>('/alerts', { ...bounds, source }), placeholderData: keepPreviousData, refetchInterval: 60_000 });
}
export function useInfiniteAlerts(source?: AlertSource) {
  return useInfiniteQuery({
    queryKey: ['alerts', 'list', source],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<ApiList<Alert>>(`/alerts${queryString({ source, cursor: pageParam, limit: 25 })}`),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: 60_000,
  });
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
    refetchInterval: mode === 'points' ? 30_000 : 120_000,
  });
}

export function useTrafficSimulation(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'traffic-simulation'],
    queryFn: () => api.get<TrafficSimulationStatus>('/admin/traffic-simulation'),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useResetTrafficSimulation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<TrafficSimulationStatus>('/admin/traffic-simulation/reset'),
    onSuccess: (status) => {
      client.setQueryData(['admin', 'traffic-simulation'], status);
      void client.invalidateQueries({ queryKey: ['traffic'] });
    },
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
export function useUpdateRoute(id?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<SailRoute, 'status' | 'startedAt' | 'finishedAt'>>) => api.patch<SailRoute>(`/routes/${id}`, input),
    onSuccess: (route) => {
      client.setQueryData(['routes', id], route);
      void client.invalidateQueries({ queryKey: ['routes'] });
    },
  });
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

export function useUpdateAvailability(portId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { availableSpots: number | null; status: string }) => api.post(`/ports/${portId}/availability`, input), onSuccess: () => { void client.invalidateQueries({ queryKey: ['managed-ports'] }); void client.invalidateQueries({ queryKey: ['ports', portId] }); } });
}
export function useCreateNotice(portId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { title: string; body: string; validUntil?: string | null }) => api.post(`/ports/${portId}/notices`, input), onSuccess: () => client.invalidateQueries({ queryKey: ['ports', portId, 'notices'] }) });
}
