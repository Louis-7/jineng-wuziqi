import { describe, it, expect } from 'vitest';
import { createPrng } from '../domain/rng';
import { createDeck, discard, draw, type CardId } from '../domain/deck';

describe('PRNG', () => {
  it('is deterministic for same seed (number and string)', () => {
    const a = createPrng(123);
    const b = createPrng(123);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);

    const c = createPrng('seed-xyz');
    const d = createPrng('seed-xyz');
    const seqC = Array.from({ length: 5 }, () => c.int(1, 10));
    const seqD = Array.from({ length: 5 }, () => d.int(1, 10));
    expect(seqC).toEqual(seqD);
  });

  it('shuffle is deterministic and does not mutate input', () => {
    const rng1 = createPrng('abc');
    const rng2 = createPrng('abc');
    const arr = [1, 2, 3, 4, 5];
    const s1 = rng1.shuffle(arr);
    const s2 = rng2.shuffle(arr);
    expect(s1).toEqual(s2);
    expect(arr).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Deck', () => {
  it('draw and discard with reshuffle mid-draw', () => {
    const rng = createPrng('deck-seed');
    const initial: CardId[] = ['A', 'B', 'C'];
    const deck = createDeck(initial, rng);

    // Draw 2, then discard 1, then draw 3 (will require reshuffle mid-draw)
    const hand1 = draw(deck, 2, rng);
    expect(hand1).toHaveLength(2);
    const first = hand1[0];
    if (first !== undefined) discard(deck, [first]);

    const hand2 = draw(deck, 3, rng);
    // We had 1 left in drawPile + 1 in discardPile -> after drawing 1, reshuffle discard to continue
    expect(hand2.length).toBe(3 - 1); // we discarded only 1, so total available now is 2
    // More explicit check: unique cards drawn cannot exceed initial deck size
    const unique = new Set([...hand1, ...hand2]);
    expect(unique.size).toBeLessThanOrEqual(3);
  });

  it('returns fewer cards when deck+discard insufficient', () => {
    const rng = createPrng(1);
    const deck = createDeck(['X'], rng);
    const cards = draw(deck, 3, rng);
    expect(cards.length).toBe(1);
  });
});
