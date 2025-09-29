import type { BotStrategy, BotDecision } from './types';
import type { GameState } from '../domain/engine';
import { applyOps } from '../domain/engine';
import type { CardId } from '../domain/deck';
import type { PRNG } from '../domain/rng';
import { createPrng } from '../domain/rng';
import { EMPTY, type Player, type Point, isOnBoard } from '../domain/board';
import type { MatchContext } from '../domain/cards/types';
import type { DomainOp } from '../domain/cards/types';
import { CardRegistry } from '../domain/cards/registry';

interface PlannerContext {
  readonly game: GameState;
  readonly player: Player;
  readonly drawn: readonly CardId[];
  readonly registry: CardRegistry;
  readonly rng: PRNG;
  readonly baseline: number;
}

interface CardPlan extends BotDecision {
  readonly score: number;
  readonly explanation: string;
}

type CardPlanner = (ctx: PlannerContext) => CardPlan[];

const WIN_SCORE = 1_000_000_000;
const BLOCK_SCORE = 600_000_000;
const DIRS: Array<{ dx: number; dy: number }> = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
];

function toMatchContext(game: GameState): MatchContext {
  return {
    board: game.board,
    currentPlayer: game.currentPlayer,
    skipNextTurns: game.status.skipNextTurns,
  };
}

function cloneRng(parent: PRNG, salt: string, sample: number): PRNG {
  return createPrng(`${String(parent.seed)}:${salt}:${sample}`);
}

function lineScore(length: number, openEnds: number): number {
  if (length >= 5) return WIN_SCORE / 2 + length * 5_000;
  if (length === 4) return openEnds === 2 ? 120_000 : 60_000;
  if (length === 3) return openEnds === 2 ? 25_000 : 9_000;
  if (length === 2) return openEnds === 2 ? 5_000 : 1_500;
  return openEnds > 0 ? 500 : 120;
}

function evaluateBoardForPlayer(game: GameState, player: Player): number {
  const { size, cells } = game.board;
  const center = (size - 1) / 2;
  let total = 0;
  for (let y = 0; y < size; y++) {
    const row = cells[y];
    if (!row) continue;
    for (let x = 0; x < size; x++) {
      if (row[x] !== player) continue;
      for (const { dx, dy } of DIRS) {
        const prevX = x - dx;
        const prevY = y - dy;
        if (
          prevX >= 0 &&
          prevX < size &&
          prevY >= 0 &&
          prevY < size &&
          cells[prevY]?.[prevX] === player
        ) {
          continue; // avoid double counting chains
        }
        let len = 1;
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < size && ny >= 0 && ny < size && cells[ny]?.[nx] === player) {
          len++;
          nx += dx;
          ny += dy;
        }
        let openEnds = 0;
        if (isOnBoard(game.board, { x: prevX, y: prevY }) && cells[prevY]?.[prevX] === EMPTY)
          openEnds++;
        if (isOnBoard(game.board, { x: nx, y: ny }) && cells[ny]?.[nx] === EMPTY) openEnds++;
        total += lineScore(len, openEnds);
      }
      const dist = Math.abs(x - center) + Math.abs(y - center);
      total += Math.max(0, 8 - dist) * 120;
    }
  }
  return total;
}

function relativeScore(game: GameState, player: Player): number {
  const self = evaluateBoardForPlayer(game, player);
  const opp = evaluateBoardForPlayer(game, (3 - player) as Player);
  return self - opp;
}

function winningPlacements(game: GameState, player: Player): Point[] {
  const points: Point[] = [];
  for (let y = 0; y < game.board.size; y++) {
    const row = game.board.cells[y];
    if (!row) continue;
    for (let x = 0; x < game.board.size; x++) {
      if (row[x] !== EMPTY) continue;
      if (isWinningPlacement(game, { x, y }, player)) points.push({ x, y });
    }
  }
  return points;
}

function isWinningPlacement(game: GameState, point: Point, player: Player): boolean {
  if (game.board.cells[point.y]?.[point.x] !== EMPTY) return false;
  for (const { dx, dy } of DIRS) {
    let len = 1;
    let nx = point.x + dx;
    let ny = point.y + dy;
    while (isOnBoard(game.board, { x: nx, y: ny }) && game.board.cells[ny]?.[nx] === player) {
      len++;
      nx += dx;
      ny += dy;
    }
    nx = point.x - dx;
    ny = point.y - dy;
    while (isOnBoard(game.board, { x: nx, y: ny }) && game.board.cells[ny]?.[nx] === player) {
      len++;
      nx -= dx;
      ny -= dy;
    }
    if (len >= 5) return true;
  }
  return false;
}

function opponentThreatPlacements(game: GameState, player: Player): Point[] {
  return winningPlacements(game, (3 - player) as Player);
}

function addCandidate(candidates: Set<string>, game: GameState, point: Point): void {
  if (!isOnBoard(game.board, point)) return;
  if (game.board.cells[point.y]?.[point.x] !== EMPTY) return;
  candidates.add(`${point.x},${point.y}`);
}

function candidateCells(game: GameState, radius = 2): Point[] {
  const candidates = new Set<string>();
  const { size, cells } = game.board;
  for (let y = 0; y < size; y++) {
    const row = cells[y];
    if (!row) continue;
    for (let x = 0; x < size; x++) {
      if (row[x] === EMPTY) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          addCandidate(candidates, game, { x: x + dx, y: y + dy });
        }
      }
    }
  }
  if (candidates.size === 0) {
    const mid = Math.floor(size / 2);
    addCandidate(candidates, game, { x: mid, y: mid });
  }
  const sorted = Array.from(candidates, (key) => {
    const [sx, sy] = key.split(',');
    return { x: Number(sx), y: Number(sy) } as Point;
  });
  const center = (size - 1) / 2;
  sorted.sort((a, b) => {
    const da = Math.abs(a.x - center) + Math.abs(a.y - center);
    const db = Math.abs(b.x - center) + Math.abs(b.y - center);
    return da - db;
  });
  return sorted.slice(0, 64);
}

function simulate(game: GameState, ops: DomainOp[]): GameState {
  return applyOps(game, ops);
}

function encodePoint(point: Point): string {
  return `${point.x},${point.y}`;
}

function collectThreatStones(game: GameState, player: Player, threats: Point[]): Set<string> {
  const opp = (3 - player) as Player;
  const stones = new Set<string>();
  threats.forEach((point) => {
    for (const { dx, dy } of DIRS) {
      let nx = point.x + dx;
      let ny = point.y + dy;
      while (isOnBoard(game.board, { x: nx, y: ny }) && game.board.cells[ny]?.[nx] === opp) {
        stones.add(encodePoint({ x: nx, y: ny }));
        nx += dx;
        ny += dy;
      }
      nx = point.x - dx;
      ny = point.y - dy;
      while (isOnBoard(game.board, { x: nx, y: ny }) && game.board.cells[ny]?.[nx] === opp) {
        stones.add(encodePoint({ x: nx, y: ny }));
        nx -= dx;
        ny -= dy;
      }
    }
  });
  return stones;
}

function planPlace(ctx: PlannerContext): CardPlan[] {
  if (!ctx.drawn.includes('Place')) return [];
  const plans: CardPlan[] = [];
  const wins = winningPlacements(ctx.game, ctx.player);
  if (wins.length > 0) {
    wins.forEach((point, index) => {
      plans.push({
        cardId: 'Place',
        target: { kind: 'cell', point },
        score: WIN_SCORE - index,
        explanation: `Place for immediate win at (${point.x},${point.y})`,
      });
    });
    return plans;
  }

  const threats = opponentThreatPlacements(ctx.game, ctx.player);
  if (threats.length > 0) {
    let bestBlockPlan: CardPlan | undefined;
    threats.forEach((point, index) => {
      const next = simulate(ctx.game, [{ type: 'place', point, player: ctx.player }]);
      const score = relativeScore(next, ctx.player);
      const delta = score - ctx.baseline;
      const plan: CardPlan = {
        cardId: 'Place',
        target: { kind: 'cell', point },
        score: BLOCK_SCORE + delta - index,
        explanation: `Block opponent lethal threat at (${point.x},${point.y}) (Δ=${delta.toFixed(0)})`,
      };
      if (!bestBlockPlan || plan.score > bestBlockPlan.score) bestBlockPlan = plan;
    });
    if (bestBlockPlan) plans.push(bestBlockPlan);
    return plans;
  }

  const base = ctx.baseline;
  let best: CardPlan | undefined;
  for (const point of candidateCells(ctx.game)) {
    const next = simulate(ctx.game, [{ type: 'place', point, player: ctx.player }]);
    const score = relativeScore(next, ctx.player);
    const delta = score - base;
    const plan: CardPlan = {
      cardId: 'Place',
      target: { kind: 'cell', point },
      score,
      explanation: `Place to improve board (Δ=${delta.toFixed(0)}) at (${point.x},${point.y})`,
    };
    if (!best || plan.score > best.score) best = plan;
  }
  if (best) plans.push(best);
  return plans;
}

function planTake(ctx: PlannerContext): CardPlan[] {
  if (!ctx.drawn.includes('Take')) return [];
  const opp = (3 - ctx.player) as Player;
  const { size, cells } = ctx.game.board;
  const base = ctx.baseline;
  const threats = opponentThreatPlacements(ctx.game, ctx.player);
  const threatStones = collectThreatStones(ctx.game, ctx.player, threats);
  const hasPlace = ctx.drawn.includes('Place');
  let best: CardPlan | undefined;
  for (let y = 0; y < size; y++) {
    const row = cells[y];
    if (!row) continue;
    for (let x = 0; x < size; x++) {
      if (row[x] !== opp) continue;
      const next = simulate(ctx.game, [{ type: 'remove', point: { x, y } }]);
      const score = relativeScore(next, ctx.player);
      const delta = score - base;
      const key = encodePoint({ x, y });
      const blocksThreat = threatStones.has(key);
      const priorityBase = blocksThreat ? (hasPlace ? BLOCK_SCORE - 100_000 : BLOCK_SCORE) : 0;
      const planScore = blocksThreat ? priorityBase + delta : score;
      const plan: CardPlan = {
        cardId: 'Take',
        target: { kind: 'cell', point: { x, y } },
        score: planScore,
        explanation: `${blocksThreat ? 'Take to break lethal chain' : 'Take to dismantle opponent chain'} at (${x},${y}) (Δ=${delta.toFixed(0)})`,
      };
      if (!best || plan.score > best.score) best = plan;
    }
  }
  return best ? [best] : [];
}

function planPolarityInversion(ctx: PlannerContext): CardPlan[] {
  if (!ctx.drawn.includes('PolarityInversion')) return [];
  const next = simulate(ctx.game, [{ type: 'swapAll' }]);
  const score = relativeScore(next, ctx.player);
  const delta = score - ctx.baseline;
  return [
    {
      cardId: 'PolarityInversion',
      score,
      explanation: `Invert polarity to ${delta >= 0 ? 'gain' : 'lose'} advantage (Δ=${delta.toFixed(0)})`,
    },
  ];
}

function planSpontaneousGeneration(ctx: PlannerContext): CardPlan[] {
  if (!ctx.drawn.includes('SpontaneousGeneration')) return [];
  const emptyCells: Point[] = [];
  for (let y = 0; y < ctx.game.board.size; y++) {
    const row = ctx.game.board.cells[y];
    if (!row) continue;
    for (let x = 0; x < ctx.game.board.size; x++) {
      if (row[x] === EMPTY) emptyCells.push({ x, y });
    }
  }
  if (emptyCells.length < 5) {
    return [
      {
        cardId: 'SpontaneousGeneration',
        score: ctx.baseline - 10_000,
        explanation: 'Spontaneous Generation unavailable (insufficient empty cells)',
      },
    ];
  }
  const def = ctx.registry.require('SpontaneousGeneration');
  const samples = 8;
  let totalScore = 0;
  for (let i = 0; i < samples; i++) {
    const sampleRng = cloneRng(ctx.rng, 'spgen', i);
    const ops = def.effect(toMatchContext(ctx.game), sampleRng, { kind: 'none' }).ops;
    const next = simulate(ctx.game, ops);
    totalScore += relativeScore(next, ctx.player);
  }
  const score = totalScore / samples;
  const delta = score - ctx.baseline;
  return [
    {
      cardId: 'SpontaneousGeneration',
      score,
      explanation: `Spontaneous Generation gamble (E[Δ]=${delta.toFixed(0)})`,
    },
  ];
}

const CARD_PLANNERS: Record<CardId, CardPlanner> = {
  Place: planPlace,
  Take: planTake,
  PolarityInversion: planPolarityInversion,
  SpontaneousGeneration: planSpontaneousGeneration,
};

function chooseBest(plans: CardPlan[], ctx: PlannerContext): BotDecision {
  if (plans.length === 0) {
    const idx = ctx.drawn.length > 0 ? ctx.rng.int(0, ctx.drawn.length - 1) : 0;
    return {
      cardId: ctx.drawn[idx] ?? 'Place',
      explanation: 'Fallback random choice (no heuristic available)',
    };
  }
  plans.sort((a, b) => b.score - a.score);
  return plans[0]!;
}

export const HeuristicBot: BotStrategy = {
  id: 'heuristic-v2',
  decide(game: GameState, drawn: CardId[], registry: CardRegistry, rng: PRNG): BotDecision {
    const ctx: PlannerContext = {
      game,
      player: game.currentPlayer,
      drawn,
      registry,
      rng,
      baseline: relativeScore(game, game.currentPlayer),
    };

    const plans: CardPlan[] = [];
    for (const cardId of drawn) {
      const planner = CARD_PLANNERS[cardId];
      if (!planner) continue;
      plans.push(...planner(ctx));
    }
    return chooseBest(plans, ctx);
  },
};
