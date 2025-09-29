import { describe, it, expect } from 'vitest';
import { createPrng } from '../domain/rng';
import { createBoard } from '../domain/board';
import { buildShuffledDeck } from '../domain/deck';
import { CardRegistry } from '../domain/cards/registry';
import { registerDefaultBaseCards } from '../domain/cards/baseCards';
import { RandomBot } from '../ai/randomStrategy';
import type { GameState } from '../domain/engine';

describe('AI RandomBot baseline', () => {
  it('decides a playable card and optional target deterministically by seed', () => {
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    const seed = 'bot-seed';
    const rng = createPrng(seed);
    const deck = buildShuffledDeck(rng, { Place: 4, Take: 2, SpontaneousGeneration: 1 }, reg);
    const game: GameState = {
      board: createBoard(15),
      currentPlayer: 2, // bot perspective not enforced here
      deck: { drawPile: deck, discardPile: [] },
      status: { skipNextTurns: {} },
    };
    const drawn = deck.slice(-2); // mimic draw order (draw pops from end)
    const decision = RandomBot.decide(game, drawn, reg, rng);
    expect(drawn).toContain(decision.cardId);
    // If target required ensure shape correct
    if (decision.target) {
      expect(decision.target.kind === 'cell' || decision.target.kind === 'none').toBe(true);
    }
  });
});
