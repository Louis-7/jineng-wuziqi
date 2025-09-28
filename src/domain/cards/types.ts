import type { CardId } from '../deck';
import type { BoardState, Player, Point } from '../board';
import type { PRNG } from '../rng';

/**
 * Lightweight Result type to standardize validation and pre-checks.
 */
export type Ok<T = void> = { ok: true; value: T };
export type Err = { ok: false; error: CardError };
export type Result<T = void> = Ok<T> | Err;

export function ok<T = void>(value?: T): Ok<T> {
  return { ok: true, value: value as T };
}
export function err(error: CardError): Err {
  return { ok: false, error };
}

/** Canonical card error codes for consistent handling */
export type CardErrorCode =
  | 'CardNotPlayable'
  | 'InvalidTarget'
  | 'OutOfBounds'
  | 'CellOccupied'
  | 'CellEmpty'
  | 'TargetIsSelf'
  | 'TargetNotOpponent'
  | 'InsufficientEmpties';

export interface CardError {
  code: CardErrorCode;
  message?: string;
}

/**
 * What kind of target a card expects. Cards can specialize via options
 * (e.g., require empty cell vs opponent stone).
 */
export type TargetSpec =
  | { kind: 'none' }
  | { kind: 'cell'; mustBeEmpty?: boolean; mustBeOwnedBy?: 'self' | 'opponent' }
  | { kind: 'player'; relation: 'self' | 'opponent' };

export type TargetValue =
  | { kind: 'none' }
  | { kind: 'cell'; point: Point }
  | { kind: 'player'; player: Player };

export interface MatchContext {
  board: BoardState;
  currentPlayer: Player;
  /** Number of turns to skip per player (used by Time Freeze). */
  skipNextTurns?: Partial<Record<Player, number>>;
}

/**
 * Domain-level operations yielded by card effects. The engine applies these in order
 * and performs a win check after the effect resolves (see Rules.md).
 */
export type DomainOp =
  | { type: 'place'; point: Point; player: Player }
  | { type: 'remove'; point: Point }
  | { type: 'swapAll' }
  | { type: 'freeze'; target: Player; amount: number };

export interface EffectOutput {
  ops: DomainOp[];
  /** Optional log entry for replay/debug. */
  log?: string;
}

/**
 * Card metadata for UI mapping.
 */
export interface CardMeta {
  name: string;
  description: string;
  icon?: string; // short text or emoji; UI may map to an asset later
}

/**
 * Core card definition. Effects must be pure given ctx/target/rng and should only
 * produce domain operations; never perform UI side-effects.
 */
export interface CardDefinition<TTarget extends TargetValue = TargetValue> {
  id: CardId;
  meta: CardMeta;
  target: TargetSpec;
  /** Whether the card can be played at all in the current context (no target yet). */
  canPlay(ctx: MatchContext): Result;
  /** Validate and normalize the provided target. */
  validateTarget(ctx: MatchContext, target: TTarget): Result<TTarget>;
  /** Produce domain ops to apply; engine does win check afterwards. */
  effect(ctx: MatchContext, rng: PRNG, target: TTarget): EffectOutput;
}

export type AnyCardDefinition = CardDefinition;
