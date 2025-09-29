import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../ui/App';

// Utility to find the board background rect via role grid then querying within its SVG
function getBoardRect() {
  const grids = screen.getAllByRole('grid');
  if (grids.length === 0) throw new Error('No board grids found');
  const gridMaybe = grids[grids.length - 1];
  if (!gridMaybe) throw new Error('Latest grid missing');
  const grid = gridMaybe;
  const rect = grid.querySelector('rect');
  if (!rect) throw new Error('Board rect not found');
  return rect;
}

describe('Settings / Board Theme', () => {
  it('switches board theme colors', () => {
    render(<App />);
    // Default theme should be modern (#f5f5f4 fill)
    const rectBefore = getBoardRect();
    expect(rectBefore.getAttribute('fill')).toBe('#f5f5f4');

    // Open settings
    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    const classicRadio = screen.getByRole('radio', { name: /Classic/i });
    fireEvent.click(classicRadio);
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    const rectAfter = getBoardRect();
    expect(rectAfter.getAttribute('fill')).toBe('#d6b38a');
    // Ensure gradients injected (black stone gradient id)
    expect(document.querySelector('radialGradient#stone-black-grad')).toBeTruthy();
  });

  it('persists theme selection to localStorage', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    fireEvent.click(screen.getByRole('radio', { name: /Classic/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    // Unmount and re-mount
    // JSDOM keeps localStorage; re-render new App
    render(<App />);
    const rect = getBoardRect();
    expect(rect.getAttribute('fill')).toBe('#d6b38a');
  });
});
