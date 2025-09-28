/**
 * Seeded PRNG utilities for deterministic gameplay.
 * - Uses xmur3 to hash string seeds into 32-bit integer
 * - Uses mulberry32 as the core PRNG
 * - Provides helpers: float, int, pick, shuffle
 */

export type Seed = number | string;

/** xmur3 32-bit hash to seed PRNG from string */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 PRNG; returns a function that yields [0,1) */
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PRNG {
  /** Seed as provided */
  readonly seed: Seed;
  /** Next float in [0,1) */
  next(): number;
  /** Alias of next */
  float(): number;
  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** Pick one element from array; throws if empty */
  pick<T>(arr: ReadonlyArray<T>): T;
  /** Return a new array shuffled using Fisher–Yates */
  shuffle<T>(arr: ReadonlyArray<T>): T[];
}

/** Create a PRNG from a seed (number or string). */
export function createPrng(seed: Seed): PRNG {
  const s = typeof seed === 'string' ? xmur3(seed)() : seed >>> 0;
  const core = mulberry32(s);
  const api: PRNG = {
    seed,
    next: () => core(),
    float: () => core(),
    int: (min: number, max: number) => {
      if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('int() range invalid');
      if (max < min) [min, max] = [max, min];
      // Inclusive bounds
      const r = core();
      return Math.floor(r * (max - min + 1)) + min;
    },
    pick: <T>(arr: ReadonlyArray<T>): T => {
      if (arr.length === 0) throw new Error('pick() from empty array');
      const idx = Math.floor(core() * arr.length);
      if (idx < 0 || idx >= arr.length) throw new Error('pick() index out of bounds');
      return arr[idx] as T;
    },
    shuffle: <T>(arr: ReadonlyArray<T>): T[] => {
      const out = arr.slice();
      // Fisher–Yates
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(core() * (i + 1));
        if (j < 0 || j > i) continue; // safety guard
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
  };
  return api;
}
