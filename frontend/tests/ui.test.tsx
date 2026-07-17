import { fireEvent, render } from '@testing-library/react-native';
import { Button, EmptyState } from '@/src/components/ui';

describe('podstawowe komponenty UI', () => {
  it('renderuje stan pusty', async () => {
    const view = await render(<EmptyState message="Brak portów" />);
    expect(view.getByText('Brak portów')).toBeTruthy();
  });

  it('obsługuje akcję i blokadę przycisku', async () => {
    const action = jest.fn();
    const view = await render(<Button title="Ponów" onPress={action} />);
    await fireEvent.press(view.getByRole('button'));
    expect(action).toHaveBeenCalledTimes(1);
    await view.rerender(<Button title="Ponów" onPress={action} disabled />);
    await fireEvent.press(view.getByRole('button'));
    expect(action).toHaveBeenCalledTimes(1);
  });
});
