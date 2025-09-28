import { describe, it, expect } from 'vitest';
import { createBoard, place, type Player } from '../domain/board';
import { applyOps, resolveWins, type GameState } from '../domain/engine';

function gs(size = 5, current: Player = 1): GameState {
  return {
    board: createBoard(size),
    currentPlayer: current,
    deck: { drawPile: [], discardPile: [] },
    status: { skipNextTurns: {} },
  };
}

describe('Engine: applyOps and resolveWins', () => {
  it('applyOps: place/remove/freeze/swapAll', () => {
    let s = gs();
    s = applyOps(s, [
      { type: 'place', point: { x: 0, y: 0 }, player: 1 },
      { type: 'place', point: { x: 1, y: 0 }, player: 2 },
      { type: 'freeze', target: 2, amount: 1 },
    ]);
    expect(s.board.cells[0]?.[0]).toBe(1);
    expect(s.board.cells[0]?.[1]).toBe(2);
    expect(s.status.skipNextTurns[2]).toBe(1);

    s = applyOps(s, [{ type: 'swapAll' }]);
    expect(s.board.cells[0]?.[0]).toBe(2);
    expect(s.board.cells[0]?.[1]).toBe(1);

    s = applyOps(s, [{ type: 'remove', point: { x: 0, y: 0 } }]);
    expect(s.board.cells[0]?.[0]).toBe(0);
  });

  it('resolveWins: simultaneous policy attacker/draw', () => {
    let s = gs(5);
    // Create both rows as five-in-a-row for different players, then swap
    for (let x = 0; x < 5; x++) {
      place(s.board, { x, y: 0 }, 1);
      place(s.board, { x, y: 1 }, 2);
    }
    // swapAll keeps simultaneous (owners swap but both lines persist)
    s = applyOps(s, [{ type: 'swapAll' }]);

    const attackerPolicy = resolveWins(s, 1, 'attacker');
    expect(attackerPolicy.winner).toBe(1);

    const drawPolicy = resolveWins(s, 2, 'draw');
    expect(drawPolicy.winner).toBe('draw');
  });
});
