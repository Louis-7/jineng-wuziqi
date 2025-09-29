import type { PRNG } from '../rng';
import { DefaultCardRegistry } from '../cards/registry';

export type CardId = string;

export interface DeckState {
  drawPile: CardId[];
  discardPile: CardId[];
}

/**
 * Build an (unshuffled) deck array from a mapping of card id -> count.
 * - Ignores unknown card ids (not present in current registry) for safety.
 * - Skips zero / negative counts.
 */
export function buildDeckFromCounts(
  counts: Record<CardId, number>,
  registry: typeof DefaultCardRegistry = DefaultCardRegistry,
): CardId[] {
  const out: CardId[] = [];
  for (const [id, nRaw] of Object.entries(counts)) {
    const n = Math.floor(nRaw);
    if (n <= 0) continue;
    // only include if card id is known
    if (!registry.get(id)) continue;
    for (let i = 0; i < n; i++) out.push(id);
  }
  return out;
}

/**
 * Shuffle a built deck with the provided PRNG. Additionally, if ensurePlaceTop is true
 * and the deck contains at least one 'Place' card, guarantee that the last element
 * (top of draw pile, since draw pops from end) is a 'Place' card so that the very first
 * draw(2) always offers at least one placement action.
 */
export function buildShuffledDeck(
  prng: PRNG,
  counts: Record<CardId, number>,
  registry: typeof DefaultCardRegistry = DefaultCardRegistry,
  ensurePlaceTop = true,
): CardId[] {
  const base = buildDeckFromCounts(counts, registry);
  const shuffled = prng.shuffle([...base]);
  if (ensurePlaceTop) {
    const idx = shuffled.indexOf('Place');
    if (idx !== -1) {
      const last = shuffled.length - 1;
      const a = shuffled[idx];
      const b = shuffled[last];
      if (a !== undefined && b !== undefined) {
        shuffled[idx] = b;
        shuffled[last] = a;
      }
    }
  }
  return shuffled;
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
