import type { BotStrategy, BotDecision } from './types';
import type { GameState } from '../domain/engine';
import type { CardId } from '../domain/deck';
import type { PRNG } from '../domain/rng';
import type { TargetValue } from '../domain/cards';
import { EMPTY } from '../domain/board';
import { CardRegistry } from '../domain/cards/registry';

function pickRandom<T>(arr: T[], rng: PRNG): T | undefined {
  if (arr.length === 0) return undefined;
  const idx = rng.int(0, arr.length - 1);
  return arr[idx];
}

/**
 * Very naive baseline: choose the first playable card (random order) and pick
 * a random legal target if required. Purely for plumbing validation.
 */
export const RandomBot: BotStrategy = {
  id: 'random-baseline',
  decide(game: GameState, drawn: CardId[], registry: CardRegistry, rng: PRNG): BotDecision {
    const shuffled = [...drawn];
    // simple Fisher–Yates using provided rng for determinism
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      const a = shuffled[i];
      const b = shuffled[j];
      if (a !== undefined && b !== undefined) {
        shuffled[i] = b;
        shuffled[j] = a;
      }
    }
    for (const id of shuffled) {
      const def = registry.get(id);
      if (!def) continue;
      const ctx = {
        board: game.board,
        currentPlayer: game.currentPlayer,
        skipNextTurns: game.status.skipNextTurns,
      };
      const can = def.canPlay(ctx);
      if (!can.ok) continue;
      if (def.target.kind === 'none') return { cardId: id };
      if (def.target.kind === 'cell') {
        const pts: { x: number; y: number }[] = [];
        for (let y = 0; y < game.board.size; y++) {
          const row = game.board.cells[y];
          if (!row) continue;
          for (let x = 0; x < game.board.size; x++) {
            const v = row[x];
            if (def.target.mustBeEmpty && v !== EMPTY) continue;
            if (def.target.mustBeOwnedBy === 'opponent') {
              if (v !== 3 - game.currentPlayer) continue;
            }
            if (def.target.mustBeOwnedBy === 'self') {
              if (v !== game.currentPlayer) continue;
            }
            if (def.target.mustBeEmpty !== true && def.target.mustBeOwnedBy == null) {
              // generic cell target not currently used but keep for completeness
              if (v === EMPTY) continue; // require occupied
            }
            // validate using card definition to be safe
            const target: TargetValue = { kind: 'cell', point: { x, y } } as never;
            const val = def.validateTarget(ctx, target);
            if (val.ok) pts.push({ x, y });
          }
        }
        const pick = pickRandom(pts, rng);
        if (pick) {
          return { cardId: id, target: { kind: 'cell', point: pick } as TargetValue };
        }
        // otherwise continue to next card
      }
      // player targeting cards (e.g., Time Freeze) removed in current rule set; keep placeholder
    }
    // fallback: just pick first drawn (may be illegal and skipped by FSM – acceptable for baseline)
    const fallback = drawn[0];
    return { cardId: fallback ?? shuffled[0] } as BotDecision; // fallback should exist; else undefined behavior acceptable for baseline
  },
};
