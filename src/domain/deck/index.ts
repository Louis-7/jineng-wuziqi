import type { PRNG } from '../rng';

export type CardId = string;

export interface DeckState {
  drawPile: CardId[];
  discardPile: CardId[];
}

export function createDeck(initial: CardId[], rng: PRNG): DeckState {
  return {
    drawPile: rng.shuffle(initial),
    discardPile: [],
  };
}

/** Discard cards to the discard pile (append order preserved). */
export function discard(state: DeckState, cards: ReadonlyArray<CardId>): void {
  if (cards.length === 0) return;
  state.discardPile.push(...cards);
}

/**
 * Draw n cards. If draw pile depletes mid-draw, reshuffle discard into draw and continue.
 * If both draw and discard are empty before satisfying n, returns fewer than n cards.
 */
export function draw(state: DeckState, n: number, rng: PRNG): CardId[] {
  if (n <= 0) return [];
  const out: CardId[] = [];
  for (let i = 0; i < n; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length > 0) {
        state.drawPile = rng.shuffle(state.discardPile);
        state.discardPile = [];
      } else {
        break;
      }
    }
    const card = state.drawPile.pop();
    if (card !== undefined) out.push(card);
  }
  return out;
}
