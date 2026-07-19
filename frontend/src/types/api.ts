export type UserRole = 'sailor' | 'port_manager' | 'admin';
export type PortStatus = 'pending' | 'active' | 'inactive' | 'rejected';
export type AlertStatus = 'pending' | 'confirmed' | 'rejected' | 'expired' | 'resolved';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertSource = 'user' | 'official';
export type RouteStatus = 'draft' | 'planned' | 'active' | 'completed' | 'cancelled';

export interface PointGeometry { type: 'Point'; coordinates: [number, number] }
export interface LineGeometry { type: 'LineString'; coordinates: [number, number][] }

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  locationConsent: boolean;
  locationConsentAt?: string | null;
  shareActivePosition: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokens { accessToken: string; refreshToken: string; accessTokenExpiresIn: number }
export interface AuthResponse { user: User; tokens: AuthTokens }
export interface ApiList<T> { items: T[]; nextCursor?: string | null }

export interface PortFacility { id: string; code: string; name: string; details: string | null; available: boolean }
export interface PortAvailability { id: string; availableSpots: number | null; status: string; createdAt: string; stale?: boolean }
export interface Port {
  id: string; name: string; description: string; location: PointGeometry;
  contactEmail: string | null; contactPhone: string | null; vhfChannel: string | null;
  status: PortStatus; createdAt: string; updatedAt: string;
  facilities?: PortFacility[]; availability?: PortAvailability | null;
  source?: string; externalId?: string | null;
}
export interface PortNotice { id: string; portId: string; title: string; body: string; validUntil: string | null; createdAt: string }

export interface RoutePoint { id?: string; position?: number; location?: PointGeometry; latitude?: number; longitude?: number; label?: string | null }
export interface SailRoute {
  id: string; name: string; status: RouteStatus; path: LineGeometry; distanceMeters: number;
  startedAt: string | null; finishedAt: string | null; createdAt: string; updatedAt: string; points?: RoutePoint[];
}

export interface Alert {
  id: string; type: string; description: string; location: PointGeometry; severity: AlertSeverity;
  status: AlertStatus; source: AlertSource; authorId: string; portId: string | null; validUntil: string | null; createdAt: string; updatedAt: string;
}

export interface TrafficPoint {
  vesselId: string; displayName?: string; latitude: number; longitude: number; accuracy: number; speed: number | null; heading: number | null; recordedAt: string;
}
export interface TrafficCell {
  latitude: number; longitude: number; weight: number; sampleCount: number; uniqueUsers: number; level: 'low' | 'medium' | 'high';
}
export interface TrafficResponse<T> {
  items: T[]; calculatedAt: string; minimumUsers?: number; demo?: boolean;
  simulation?: TrafficSimulationStatus;
  debug?: { gridSize: number; privacyThreshold: number; bucketMinutes: number };
}

export interface TrafficSimulationStatus {
  available: boolean;
  running: boolean;
  tick: number;
  vesselCount: number;
  intervalMs: number;
  startedAt: string | null;
  calculatedAt: string;
}

export interface Conversation { id: string; portId: string; port?: Port; createdAt: string; updatedAt: string }
export interface Message { id: string; conversationId: string; senderId: string; body: string; createdAt: string }

export interface ApiErrorBody { error: { code: string; message: string; details: Record<string, unknown>; requestId: string } }
export interface MapBounds { north: number; south: number; east: number; west: number; zoom: number }
