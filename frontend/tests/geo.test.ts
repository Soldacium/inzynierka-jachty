import { distanceBetweenCoordinates } from '@/src/utils/geo';

describe('odległość geograficzna', () => {
  it('zwraca zero dla tej samej pozycji', () => {
    expect(distanceBetweenCoordinates([18.65, 54.55], [18.65, 54.55])).toBe(0);
  });

  it('oblicza przybliżoną odległość między Gdynią i Helem', () => {
    const distance = distanceBetweenCoordinates([18.5305, 54.5189], [18.8018, 54.6083]);
    expect(distance).toBeGreaterThan(19_000);
    expect(distance).toBeLessThan(22_000);
  });
});
