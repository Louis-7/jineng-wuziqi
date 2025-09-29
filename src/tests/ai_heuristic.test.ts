import { describe, it, expect } from 'vitest';
import { createBoard, place } from '../domain/board';
import type { GameState } from '../domain/engine';
import { HeuristicBot } from '../ai/heuristicStrategy';
import { createPrng } from '../domain/rng';
import { CardRegistry } from '../domain/cards/registry';
import { registerDefaultBaseCards } from '../domain/cards/baseCards';

function baseGame(size = 9): GameState {
  return {
    board: createBoard(size),
    currentPlayer: 2, // we let bot be player 2 for tests
    deck: { drawPile: [], discardPile: [] },
    status: { skipNextTurns: {} },
  };
}

describe('HeuristicBot strategy (Hard)', () => {
  it('plays immediate winning placement when available', () => {
    const g = baseGame();
    // four in a row for player 2 at top row (0,0)-(3,0), open at (4,0)
    place(g.board, { x: 0, y: 0 }, 2);
    place(g.board, { x: 1, y: 0 }, 2);
    place(g.board, { x: 2, y: 0 }, 2);
    place(g.board, { x: 3, y: 0 }, 2);
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    const decision = HeuristicBot.decide(g, ['Place', 'Take'], reg, createPrng('t1'));
    expect(decision.cardId).toBe('Place');
    expect(decision.target && decision.target.kind === 'cell').toBe(true);
    const target = decision.target;
    if (!target || target.kind !== 'cell') throw new Error('expected cell target');
    const pt = target.point;
    expect(pt).toEqual({ x: 4, y: 0 });
    expect(decision.explanation).toMatch(/Immediate win/i);
  });

  it('blocks opponent imminent win when no own immediate win', () => {
    const g = baseGame();
    // opponent (player 1) has four in a row needing block at (4,1)
    g.currentPlayer = 2;
    place(g.board, { x: 0, y: 1 }, 1);
    place(g.board, { x: 1, y: 1 }, 1);
    place(g.board, { x: 2, y: 1 }, 1);
    place(g.board, { x: 3, y: 1 }, 1);
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    const decision = HeuristicBot.decide(g, ['Place', 'Take'], reg, createPrng('t2'));
    expect(decision.cardId).toBe('Place');
    const target = decision.target;
    if (!target || target.kind !== 'cell') throw new Error('expected cell target');
    const pt = target.point;
    expect(pt).toEqual({ x: 4, y: 1 });
    expect(decision.explanation).toMatch(/Block/i);
  });

  it('uses Take defensively when cannot block with Place', () => {
    const g = baseGame();
    g.currentPlayer = 2;
    // opponent threat line; remove one of them
    place(g.board, { x: 0, y: 2 }, 1);
    place(g.board, { x: 1, y: 2 }, 1);
    place(g.board, { x: 2, y: 2 }, 1);
    place(g.board, { x: 3, y: 2 }, 1);
    // drawn does NOT include Place, only Take
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    const decision = HeuristicBot.decide(g, ['Take', 'PolarityInversion'], reg, createPrng('t3'));
    expect(decision.cardId).toBe('Take');
    expect(decision.explanation).toMatch(/Take to break lethal/i);
    const target = decision.target;
    if (!target || target.kind !== 'cell') throw new Error('expected cell target');
    const pt = target.point;
    expect([0, 1, 2, 3]).toContain(pt.x);
    expect(pt.y).toBe(2);
  });

  it('prefers polarity inversion when board swap is advantageous', () => {
    const g = baseGame();
    g.currentPlayer = 2;
    // Player 1 controls strong formation; swap would hand it to player 2
    place(g.board, { x: 3, y: 3 }, 1);
    place(g.board, { x: 4, y: 3 }, 1);
    place(g.board, { x: 5, y: 3 }, 1);
    place(g.board, { x: 6, y: 3 }, 1);
    place(g.board, { x: 7, y: 3 }, 1);
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    const decision = HeuristicBot.decide(
      g,
      ['PolarityInversion', 'SpontaneousGeneration'],
      reg,
      createPrng('t5'),
    );
    expect(decision.cardId).toBe('PolarityInversion');
    expect(decision.explanation).toMatch(/Invert polarity/i);
  });

  it('falls back to heuristic place when no wins/threats', () => {
    const g = baseGame();
    // sparse neutral stones
    place(g.board, { x: 4, y: 4 }, 1);
    place(g.board, { x: 5, y: 5 }, 2);
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    const decision = HeuristicBot.decide(g, ['Place', 'Take'], reg, createPrng('t4'));
    expect(['Place', 'Take', 'PolarityInversion', 'SpontaneousGeneration']).toContain(
      decision.cardId,
    );
    expect(decision.explanation).toBeTruthy();
  });
});
