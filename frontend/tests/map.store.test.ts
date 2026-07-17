import { useMapStore } from '@/src/stores/map.store';

describe('warstwy mapy', () => {
  beforeEach(() => useMapStore.setState({
    activeOverlay: 'traffic',
    alertFilter: 'all',
    mapStyle: 'detailed',
  }));

  it('utrzymuje dokładnie jeden aktywny widok danych', () => {
    useMapStore.getState().setActiveOverlay('vessels');
    expect(useMapStore.getState().activeOverlay).toBe('vessels');
    useMapStore.getState().setActiveOverlay('alerts');
    expect(useMapStore.getState().activeOverlay).toBe('alerts');
  });

  it('filtruje źródło alertów i przełącza styl mapy', () => {
    useMapStore.getState().setAlertFilter('official');
    useMapStore.getState().setMapStyle('simple');
    expect(useMapStore.getState()).toMatchObject({ alertFilter: 'official', mapStyle: 'simple' });
  });
});
