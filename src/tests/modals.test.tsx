import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../ui/App';

describe('Modals — New Match and Help', () => {
  it('opens and closes Help modal', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Help/i }));
    expect(await screen.findByText(/Place five stones/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Close/i }));
    expect(screen.queryByText(/Place five stones/i)).toBeNull();
  });

  it('opens New Match modal and randomizes seed each time', async () => {
    const user = userEvent.setup();
    render(<App />);
    // First open
    await user.click(screen.getByRole('button', { name: /New Match/i }));
    const seedInput1 = await screen.findByLabelText(/Seed/i);
    const seed1 = (seedInput1 as HTMLInputElement).value;
    await user.click(screen.getByRole('button', { name: /^Start$/i }));

    // Second open
    await user.click(screen.getByRole('button', { name: /New Match/i }));
    const seedInput2 = await screen.findByLabelText(/Seed/i);
    const seed2 = (seedInput2 as HTMLInputElement).value;
    expect(seed2).not.toBe(seed1);
  });
});
