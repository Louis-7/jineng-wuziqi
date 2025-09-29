import type { PRNG } from '../domain/rng';
import type { GameState } from '../domain/engine';
import type { CardId } from '../domain/deck';
import type { TargetValue } from '../domain/cards';
import { CardRegistry } from '../domain/cards/registry';

export interface BotDecision {
  cardId: CardId;
  target?: TargetValue; // only if needed
  score?: number; // heuristic evaluation score (higher is better)
  explanation?: string; // human-readable reasoning summary
}

export interface BotStrategy {
  /** Unique id for logging / debugging */
  id: string;
  /** Decide which card to play among the drawn 2 (or fewer) and optionally a target. */
  decide(game: GameState, drawn: CardId[], registry: CardRegistry, rng: PRNG): BotDecision;
}
