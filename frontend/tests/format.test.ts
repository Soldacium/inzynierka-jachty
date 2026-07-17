import { formatDistance } from '@/src/utils/format';
import { queryString } from '@/src/api/client';

describe('formatowanie danych API', () => {
  it('czytelnie formatuje dystans', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(12_450)).toBe('12.4 km');
  });

  it('pomija puste parametry i koduje granice mapy', () => {
    expect(queryString({ north: 55, south: 54, search: '', region: undefined })).toBe('?north=55&south=54');
  });
});
