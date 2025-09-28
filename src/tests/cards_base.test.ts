import { describe, it, expect } from 'vitest';
import { createBoard, place, EMPTY, type Player } from '../domain/board';
import { createPrng } from '../domain/rng';
import {
  PlaceCard,
  TakeCard,
  PolarityInversionCard,
  SpontaneousGenerationCard,
  type MatchContext,
} from '../domain/cards';

function ctx(boardSize = 5, currentPlayer: Player = 1): MatchContext {
  return { board: createBoard(boardSize), currentPlayer, skipNextTurns: {} };
}

describe('Base Cards — domain outputs', () => {
  it('Place: validates empty cell and produces place op', () => {
    const c = ctx();
    place(c.board, { x: 1, y: 1 }, 2);
    const can = PlaceCard.canPlay(c);
    expect(can.ok).toBe(true);
    const valid = PlaceCard.validateTarget(c, { kind: 'cell', point: { x: 0, y: 0 } });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      const eff = PlaceCard.effect(c, createPrng(1), valid.value);
      expect(eff.ops[0]).toEqual({ type: 'place', point: { x: 0, y: 0 }, player: 1 });
    }
  });

  it('Take: requires opponent stones and produces remove op', () => {
    const c = ctx();
    place(c.board, { x: 2, y: 2 }, 2);
    const can = TakeCard.canPlay(c);
    expect(can.ok).toBe(true);
    const valid = TakeCard.validateTarget(c, { kind: 'cell', point: { x: 2, y: 2 } });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      const eff = TakeCard.effect(c, createPrng(1), valid.value);
      expect(eff.ops[0]).toEqual({ type: 'remove', point: { x: 2, y: 2 } });
    }
  });

  it('Polarity Inversion: yields swapAll', () => {
    const c = ctx();
    const eff = PolarityInversionCard.effect(c, createPrng(1), { kind: 'none' });
    expect(eff.ops[0]).toEqual({ type: 'swapAll' });
  });

  // Time Freeze card removed.

  it('Spontaneous Generation: requires 5 empties, yields 5 place ops with seeded randomness', () => {
    const c = ctx(3); // 3x3 has 9 cells
    // Fill 5 cells leaving 4 empties to make canPlay false
    place(c.board, { x: 0, y: 0 }, 1);
    place(c.board, { x: 1, y: 0 }, 1);
    place(c.board, { x: 2, y: 0 }, 1);
    place(c.board, { x: 0, y: 1 }, 2);
    place(c.board, { x: 1, y: 1 }, 2);
    // empties remaining = 4 -> cannot play
    const can1 = SpontaneousGenerationCard.canPlay(c);
    expect(can1.ok).toBe(false);

    // Make it 5 empties by clearing a cell
    const row = c.board.cells[1];
    if (!row) throw new Error('row missing');
    row[1] = EMPTY;
    const can2 = SpontaneousGenerationCard.canPlay(c);
    expect(can2.ok).toBe(true);

    const eff = SpontaneousGenerationCard.effect(c, createPrng('seed'), { kind: 'none' });
    expect(eff.ops).toHaveLength(5);
    // players are 1 or 2
    for (const op of eff.ops) {
      if (op.type === 'place') {
        expect([1, 2]).toContain(op.player);
      } else {
        throw new Error('unexpected op');
      }
    }
  });
});
