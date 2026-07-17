import { ApiError } from '@/src/api/client';

export function formatDate(value?: string | null): string {
  if (!value) return 'Brak danych';
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const known: Record<string, string> = {
      INVALID_CREDENTIALS: 'Nieprawidłowy e-mail lub hasło.',
      EMAIL_ALREADY_USED: 'Konto z tym adresem już istnieje.',
      LOCATION_CONSENT_REQUIRED: 'Najpierw włącz zgodę na udostępnianie lokalizacji.',
      NETWORK_ERROR: 'Nie udało się połączyć z serwerem.',
    };
    return known[error.code] ?? error.message;
  }
  return 'Wystąpił nieoczekiwany błąd.';
}
