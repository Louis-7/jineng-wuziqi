import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../ui/App';

describe('UI flow — choose Place and play on board', () => {
  it('draws two, chooses Place, selects empty cell, and advances turn', async () => {
    const user = userEvent.setup();
    render(<App />);

    // After initial render, two cards should be shown; ensure Place exists
    const placeBtn = await screen.findByRole('button', { name: /Place Stone/i });
    await user.click(placeBtn);

    // Select a cell 0,0
    const cell00 = await screen.findByRole('gridcell', { name: /cell 0,0 empty/i });
    await user.click(cell00);

    // After resolution, current player should be P2 and the cell now has a stone (player 1)
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Current:\s*P2/);
    // The aria-label of 0,0 should no longer be 'empty'
    expect(screen.queryByRole('gridcell', { name: /cell 0,0 empty/i })).toBeNull();
  });
});
