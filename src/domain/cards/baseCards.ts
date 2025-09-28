import type { PRNG } from '../rng';
import { EMPTY, type BoardState, type Player, type Point } from '../board';
import type { CardDefinition, EffectOutput, MatchContext, Result } from './types';
import { canPlayByTargetSpec, validateCellTarget, validatePlayerTarget } from './validate';
import { DefaultCardRegistry } from './registry';

function countEmpties(b: BoardState): number {
  let c = 0;
  for (let y = 0; y < b.size; y++) {
    const row = b.cells[y];
    if (!row) continue;
    for (let x = 0; x < b.size; x++) if (row[x] === EMPTY) c++;
  }
  return c;
}

function hasOpponentStone(b: BoardState, current: Player): boolean {
  const opp = (3 - current) as Player;
  for (let y = 0; y < b.size; y++) {
    const row = b.cells[y];
    if (!row) continue;
    for (let x = 0; x < b.size; x++) if (row[x] === opp) return true;
  }
  return false;
}

// 1) Place Stone
export const PlaceCard: CardDefinition<{ kind: 'cell'; point: Point }> = {
  id: 'Place',
  meta: {
    name: 'Place Stone',
    description: 'Place one stone on an empty cell.',
    icon: '●',
  },
  target: { kind: 'cell', mustBeEmpty: true },
  canPlay: (ctx: MatchContext): Result =>
    canPlayByTargetSpec(ctx, { kind: 'cell', mustBeEmpty: true }),
  validateTarget: (ctx, t) => validateCellTarget(ctx, { kind: 'cell', mustBeEmpty: true }, t),
  effect: (ctx, _rng: PRNG, target): EffectOutput => ({
    ops: [{ type: 'place' as const, point: target.point, player: ctx.currentPlayer }],
    log: `Place at (${String(target.point.x)},${String(target.point.y)})`,
  }),
};

// 2) Take Stone
export const TakeCard: CardDefinition<{ kind: 'cell'; point: Point }> = {
  id: 'Take',
  meta: {
    name: 'Take Stone',
    description: "Remove an opponent's stone.",
    icon: '×',
  },
  target: { kind: 'cell', mustBeOwnedBy: 'opponent' },
  canPlay: (ctx: MatchContext): Result => {
    return hasOpponentStone(ctx.board, ctx.currentPlayer)
      ? { ok: true, value: undefined }
      : { ok: false, error: { code: 'CardNotPlayable', message: 'No opponent stones' } };
  },
  validateTarget: (ctx, t) =>
    validateCellTarget(ctx, { kind: 'cell', mustBeOwnedBy: 'opponent' }, t),
  effect: (_ctx, _rng, target): EffectOutput => ({
    ops: [{ type: 'remove' as const, point: target.point }],
    log: `Remove at (${String(target.point.x)},${String(target.point.y)})`,
  }),
};

// 3) Polarity Inversion
export const PolarityInversionCard: CardDefinition<{ kind: 'none' }> = {
  id: 'PolarityInversion',
  meta: {
    name: 'Polarity Inversion',
    description: 'Swap ownership of all stones (1 ↔ 2).',
    icon: '↔',
  },
  target: { kind: 'none' },
  canPlay: () => ({ ok: true, value: undefined }),
  validateTarget: (_ctx, t) => ({ ok: true, value: t }),
  effect: () => ({ ops: [{ type: 'swapAll' as const }], log: 'Swap all stones' }),
};

// 4) Time Freeze
export const TimeFreezeCard: CardDefinition<{ kind: 'player'; player: Player }> = {
  id: 'TimeFreeze',
  meta: {
    name: 'Time Freeze',
    description: 'Opponent skips their next turn.',
    icon: '🕒',
  },
  target: { kind: 'player', relation: 'opponent' },
  canPlay: () => ({ ok: true, value: undefined }),
  validateTarget: (ctx, t) =>
    validatePlayerTarget(ctx, { kind: 'player', relation: 'opponent' }, t),
  effect: (_ctx, _rng, target) => ({
    ops: [{ type: 'freeze' as const, target: target.player, amount: 1 }],
    log: 'Freeze 1',
  }),
};

// 5) Spontaneous Generation
export const SpontaneousGenerationCard: CardDefinition<{ kind: 'none' }> = {
  id: 'SpontaneousGeneration',
  meta: {
    name: 'Spontaneous Generation',
    description: 'Randomly place 5 stones with random colors on empty cells.',
    icon: '✨',
  },
  target: { kind: 'none' },
  canPlay: (ctx) => {
    const empties = countEmpties(ctx.board);
    if (empties < 5) return { ok: false, error: { code: 'InsufficientEmpties' } };
    return { ok: true, value: undefined };
  },
  validateTarget: (_ctx, t) => ({ ok: true, value: t }),
  effect: (ctx, rng): EffectOutput => {
    const empties: Point[] = [];
    for (let y = 0; y < ctx.board.size; y++) {
      const row = ctx.board.cells[y];
      if (!row) continue;
      for (let x = 0; x < ctx.board.size; x++) if (row[x] === EMPTY) empties.push({ x, y });
    }
    const picks = rng.shuffle(empties).slice(0, 5);
    const ops = picks.map((p) => ({
      type: 'place' as const,
      point: p,
      player: rng.int(1, 2) as Player,
    }));
    return { ops, log: 'Spawn 5 random stones' };
  },
};

export function registerDefaultBaseCards(
  reg: typeof DefaultCardRegistry = DefaultCardRegistry,
): void {
  reg.register(PlaceCard);
  reg.register(TakeCard);
  reg.register(PolarityInversionCard);
  reg.register(TimeFreezeCard);
  reg.register(SpontaneousGenerationCard);
}
