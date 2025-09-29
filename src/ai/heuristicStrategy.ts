import type { BotStrategy, BotDecision } from './types';
import type { GameState } from '../domain/engine';
import type { CardId } from '../domain/deck';
import type { PRNG } from '../domain/rng';
import { EMPTY, type Player } from '../domain/board';
import { CardRegistry } from '../domain/cards/registry';

// Directions
const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
];

function evaluatePointPlace(game: GameState, x: number, y: number, player: Player): number {
  // Temporarily treat as player's stone and score based on line potentials
  let score = 0;
  for (const { dx, dy } of DIRS) {
    let len = 1; // hypothetical stone
    let openEnds = 0;
    // forward
    let nx = x + dx;
    let ny = y + dy;
    while (nx >= 0 && nx < game.board.size && ny >= 0 && ny < game.board.size) {
      const val = game.board.cells[ny]?.[nx];
      if (val === player) {
        len++;
        nx += dx;
        ny += dy;
        continue;
      }
      if (val === EMPTY) openEnds++;
      break;
    }
    // backward
    nx = x - dx;
    ny = y - dy;
    while (nx >= 0 && nx < game.board.size && ny >= 0 && ny < game.board.size) {
      const val = game.board.cells[ny]?.[nx];
      if (val === player) {
        len++;
        nx -= dx;
        ny -= dy;
        continue;
      }
      if (val === EMPTY) openEnds++;
      break;
    }
    // Basic pattern weights
    if (len >= 5)
      score += 10_000; // immediate win
    else if (len === 4 && openEnds > 0) score += 1_000 * openEnds;
    else if (len === 3 && openEnds > 0) score += 120 * openEnds;
    else if (len === 2 && openEnds > 0) score += 25 * openEnds;
  }
  return score;
}

function isWinningPlacement(game: GameState, x: number, y: number, player: Player): boolean {
  if (game.board.cells[y]?.[x] !== EMPTY) return false;
  for (const { dx, dy } of DIRS) {
    let len = 1;
    let nx = x + dx;
    let ny = y + dy;
    while (nx >= 0 && nx < game.board.size && ny >= 0 && ny < game.board.size) {
      const v = game.board.cells[ny]?.[nx];
      if (v !== player) break;
      len++;
      nx += dx;
      ny += dy;
    }
    nx = x - dx;
    ny = y - dy;
    while (nx >= 0 && nx < game.board.size && ny >= 0 && ny < game.board.size) {
      const v = game.board.cells[ny]?.[nx];
      if (v !== player) break;
      len++;
      nx -= dx;
      ny -= dy;
    }
    if (len >= 5) return true;
  }
  return false;
}

function collectWinningPlacements(game: GameState, player: Player): { x: number; y: number }[] {
  const res: { x: number; y: number }[] = [];
  for (let y = 0; y < game.board.size; y++) {
    const row = game.board.cells[y];
    if (!row) continue;
    for (let x = 0; x < game.board.size; x++) {
      if (row[x] !== EMPTY) continue;
      if (isWinningPlacement(game, x, y, player)) res.push({ x, y });
    }
  }
  return res;
}

/** Identify opponent threat moves (cells where they could win next turn). */
function collectOpponentThreatPlacements(
  game: GameState,
  player: Player,
): { x: number; y: number }[] {
  const opp = (3 - player) as Player;
  return collectWinningPlacements(game, opp);
}

function bestPlacement(
  game: GameState,
  drawn: CardId[],
  player: Player,
  forceCells?: { x: number; y: number }[],
): { decision?: BotDecision } {
  if (!drawn.includes('Place')) return {};
  // If forceCells provided (e.g. winning move or block list), restrict search to them
  let best: { x: number; y: number; score: number } | undefined;
  const iterate = forceCells
    ? forceCells
    : (() => {
        const cells: { x: number; y: number }[] = [];
        for (let y = 0; y < game.board.size; y++) {
          const row = game.board.cells[y];
          if (!row) continue;
          for (let x = 0; x < game.board.size; x++) if (row[x] === EMPTY) cells.push({ x, y });
        }
        return cells;
      })();
  for (const { x, y } of iterate) {
    if (game.board.cells[y]?.[x] !== EMPTY) continue;
    const own = evaluatePointPlace(game, x, y, player);
    const opp = evaluatePointPlace(game, x, y, (3 - player) as Player);
    const composite = own + opp * 0.9 + (own >= 10_000 ? 50_000 : 0) + (opp >= 10_000 ? 40_000 : 0);
    if (!best || composite > best.score) best = { x, y, score: composite };
  }
  if (best) {
    return {
      decision: {
        cardId: 'Place',
        target: { kind: 'cell', point: { x: best.x, y: best.y } },
        score: best.score,
        explanation: 'Heuristic place targeting highest combined offensive/defensive value',
      },
    };
  }
  return {};
}

function bestTake(game: GameState, drawn: CardId[], player: Player): { decision?: BotDecision } {
  if (!drawn.includes('Take')) return {};
  // Remove opponent stones that are part of their strongest patterns
  let best: { x: number; y: number; score: number } | undefined;
  const opp = (3 - player) as Player;
  for (let y = 0; y < game.board.size; y++) {
    const row = game.board.cells[y];
    if (!row) continue;
    for (let x = 0; x < game.board.size; x++) {
      if (row[x] !== opp) continue;
      // Evaluate if this stone contributes to a long or open line for opponent
      const before = evaluatePointPlace(game, x, y, opp); // treat as if placing again (approx continuity)
      // Bonus if near center for board control
      const centerDist = Math.abs(x - game.board.size / 2) + Math.abs(y - game.board.size / 2);
      const score = before + (100 - centerDist);
      if (!best || score > best.score) best = { x, y, score };
    }
  }
  if (best) {
    return {
      decision: {
        cardId: 'Take',
        target: { kind: 'cell', point: { x: best.x, y: best.y } },
        score: best.score,
        explanation: 'Heuristic take removing a high-influence opponent stone',
      },
    };
  }
  return {};
}

export const HeuristicBot: BotStrategy = {
  id: 'heuristic-v1',
  decide(game: GameState, drawn: CardId[], _registry: CardRegistry, rng: PRNG): BotDecision {
    // Try immediate win or block using Place
    const player: Player = game.currentPlayer;
    // 1) Immediate winning placement
    const winningMoves = collectWinningPlacements(game, player);
    if (drawn.includes('Place') && winningMoves.length > 0) {
      const winRes = bestPlacement(game, drawn, player, winningMoves).decision;
      if (winRes) {
        winRes.explanation = 'Immediate win';
        winRes.score = 1_000_000;
        return winRes;
      }
    }
    // 2) Block opponent immediate win
    const oppThreats = collectOpponentThreatPlacements(game, player);
    if (drawn.includes('Place') && oppThreats.length > 0) {
      const blockRes = bestPlacement(game, drawn, player, oppThreats).decision;
      if (blockRes) {
        blockRes.explanation = 'Block opponent imminent win';
        blockRes.score = 900_000;
        return blockRes;
      }
    }
    // 3) If cannot block with Place but can Take an opponent stone from threat
    if (!drawn.includes('Place') && oppThreats.length > 0 && drawn.includes('Take')) {
      // Count stones participating in threats
      const freq = new Map<string, { x: number; y: number; count: number }>();
      for (const t of oppThreats) {
        for (const { dx, dy } of DIRS) {
          // Reconstruct line containing threat: search contiguous opponent stones both sides
          let preX = t.x - dx;
          let preY = t.y - dy;
          while (
            preX >= 0 &&
            preX < game.board.size &&
            preY >= 0 &&
            preY < game.board.size &&
            game.board.cells[preY]?.[preX] === 3 - player
          ) {
            const key = preX + ':' + preY;
            const ent = freq.get(key) ?? { x: preX, y: preY, count: 0 };
            ent.count++;
            freq.set(key, ent);
            preX -= dx;
            preY -= dy;
          }
          let postX = t.x + dx;
          let postY = t.y + dy;
          while (
            postX >= 0 &&
            postX < game.board.size &&
            postY >= 0 &&
            postY < game.board.size &&
            game.board.cells[postY]?.[postX] === 3 - player
          ) {
            const key = postX + ':' + postY;
            const ent = freq.get(key) ?? { x: postX, y: postY, count: 0 };
            ent.count++;
            freq.set(key, ent);
            postX += dx;
            postY += dy;
          }
        }
      }
      let bestStone: { x: number; y: number; count: number } | undefined;
      for (const v of freq.values()) if (!bestStone || v.count > bestStone.count) bestStone = v;
      if (bestStone) {
        return {
          cardId: 'Take',
          target: { kind: 'cell', point: { x: bestStone.x, y: bestStone.y } },
          score: 850_000,
          explanation: 'Defensive take removing threat stone',
        };
      }
    }
    // 4) General heuristic evaluation
    const place = bestPlacement(game, drawn, player).decision;
    const take = bestTake(game, drawn, player).decision;
    const candidates: BotDecision[] = [];
    if (place) candidates.push(place);
    if (take) candidates.push(take);
    // If PolarityInversion could yield win (rare) give it modest baseline
    if (drawn.includes('PolarityInversion')) {
      candidates.push({ cardId: 'PolarityInversion', score: 50, explanation: 'Polarity probe' });
    }
    if (drawn.includes('SpontaneousGeneration')) {
      candidates.push({
        cardId: 'SpontaneousGeneration',
        score: 10,
        explanation: 'Random swing card',
      });
    }
    if (candidates.length === 0) {
      // fallback random
      const idx = drawn.length > 0 ? rng.int(0, drawn.length - 1) : 0;
      const fallback = drawn[idx] ?? 'Place';
      return { cardId: fallback, explanation: 'Fallback random (no heuristic move)' };
    }
    candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return (
      candidates[0] ?? { cardId: drawn[0] ?? 'Place', explanation: 'Empty candidate fallback' }
    );
  },
};
