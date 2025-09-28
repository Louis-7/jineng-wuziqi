import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from '../ui/components/Board';
import { TurnPanel } from '../ui/components/TurnPanel';
import { createBoard } from '../domain/board';
import { CardRegistry } from '../domain/cards/registry';
import { registerDefaultBaseCards } from '../domain/cards/baseCards';

describe('UI — disables interactions after winner', () => {
  it('board intersections not clickable and card buttons disabled', async () => {
    const user = userEvent.setup();

    // Prepare minimal board and registry
    const board = createBoard(5);
    const registry = new CardRegistry();
    registerDefaultBaseCards(registry);
    const registryMeta = registry.getMetaMap();

    // Fake winner flag the same way App gates interactions
    const winner: unknown = 1;

    render(
      <div>
        <Board
          board={board}
          lastMove={undefined}
          winningLine={undefined}
          onCellClick={() => {
            /* no-op */
          }}
          isCellEnabled={(_p, val) => !winner && val === 0}
        />
        <TurnPanel
          drawn={['Place', 'Take']}
          registryMeta={registryMeta}
          chosen={undefined}
          onChoose={() => {
            /* no-op */
          }}
          needsTarget={false}
          disabled={true}
        />
      </div>,
    );

    // No clickable intersections should be present
    expect(screen.queryByRole('button', { name: /intersection/i })).toBeNull();

    // Card buttons should render but be disabled
    const placeBtn = await screen.findByRole('button', { name: /Place/i });
    expect(placeBtn).toBeDisabled();
    await user.click(placeBtn);
    // Still disabled and no state change feedback available; just ensure not clickable (no error)
    expect(placeBtn).toBeDisabled();
  });
});
