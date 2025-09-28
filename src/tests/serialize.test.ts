import { describe, it, expect } from 'vitest';
import { createBoard, place } from '../domain/board';
import type { GameState } from '../domain/engine';
import { serializeGameState, deserializeGameState } from '../domain/engine/serialize';

function gs(): GameState {
  const board = createBoard(3);
  place(board, { x: 0, y: 0 }, 1);
  return {
    board,
    currentPlayer: 1,
    deck: { drawPile: ['A', 'B'], discardPile: ['C'] },
    status: { skipNextTurns: { 2: 1 } },
  };
}

describe('GameState serialize/deserialize', () => {
  it('round-trips without mutating original', () => {
    const s = gs();
    const ser = serializeGameState(s);
    const de = deserializeGameState(ser);
    expect(de.board.size).toBe(3);
    expect(de.board.cells[0]?.[0]).toBe(1);
    expect(de.deck.drawPile).toEqual(['A', 'B']);
    expect(de.deck.discardPile).toEqual(['C']);
    expect(de.status.skipNextTurns[2]).toBe(1);
  });
});
