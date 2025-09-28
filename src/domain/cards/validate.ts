import { EMPTY, getCell, isOnBoard, type Player, type Point } from '../board';
import type { MatchContext, Result, TargetSpec, TargetValue } from './types';
import { err, ok } from './types';

export function canPlayByTargetSpec(ctx: MatchContext, spec: TargetSpec): Result {
  if (spec.kind === 'cell') {
    if (spec.mustBeEmpty) {
      // playable if at least one empty exists
      for (let y = 0; y < ctx.board.size; y++) {
        const row = ctx.board.cells[y];
        if (!row) continue;
        for (let x = 0; x < ctx.board.size; x++) {
          if (row[x] === EMPTY) return ok();
        }
      }
      return err({ code: 'InsufficientEmpties', message: 'No empty cells available' });
    }
  }
  // default: playable
  return ok();
}

export function validateTargetBySpec(
  ctx: MatchContext,
  spec: TargetSpec,
  target: TargetValue,
): Result<TargetValue> {
  switch (spec.kind) {
    case 'none':
      if (target.kind !== 'none') return err({ code: 'InvalidTarget' });
      return ok(target);
    case 'player': {
      if (target.kind !== 'player') return err({ code: 'InvalidTarget' });
      const { relation } = spec;
      const expected: Player =
        relation === 'self' ? ctx.currentPlayer : ((3 - ctx.currentPlayer) as Player);
      if (target.player !== expected) {
        return err({ code: relation === 'self' ? 'TargetIsSelf' : 'TargetNotOpponent' });
      }
      return ok(target);
    }
    case 'cell': {
      if (target.kind !== 'cell') return err({ code: 'InvalidTarget' });
      const p = target.point;
      if (!isOnBoard(ctx.board, p)) return err({ code: 'OutOfBounds' });
      const val = getCell(ctx.board, p);
      if (spec.mustBeEmpty && val !== EMPTY) return err({ code: 'CellOccupied' });
      if (spec.mustBeOwnedBy === 'self' && val !== ctx.currentPlayer)
        return err({ code: 'InvalidTarget' });
      if (spec.mustBeOwnedBy === 'opponent' && val === ctx.currentPlayer)
        return err({ code: 'InvalidTarget' });
      if (spec.mustBeOwnedBy && val === EMPTY) return err({ code: 'CellEmpty' });
      return ok(target);
    }
    default:
      return err({ code: 'InvalidTarget' });
  }
}

export function validateCellTarget(
  ctx: MatchContext,
  spec: Extract<TargetSpec, { kind: 'cell' }>,
  target: { kind: 'cell'; point: Point },
): Result<{ kind: 'cell'; point: Point }> {
  const res = validateTargetBySpec(ctx, spec, target);
  if (res.ok) return ok(target);
  return res;
}

export function validatePlayerTarget(
  ctx: MatchContext,
  spec: Extract<TargetSpec, { kind: 'player' }>,
  target: { kind: 'player'; player: Player },
): Result<{ kind: 'player'; player: Player }> {
  const res = validateTargetBySpec(ctx, spec, target);
  if (res.ok) return ok(target);
  return res;
}
