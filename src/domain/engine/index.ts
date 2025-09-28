import { produce } from 'immer';
import { type BoardState, EMPTY, remove, place, scanAllWins, type Player } from '../board';
import type { DeckState } from '../deck';
import type { DomainOp } from '../cards';

export type SimultaneousFivePolicy = 'attacker' | 'draw';

export interface GameSettings {
  boardSize: number;
  firstPlayer: Player;
  seed: string | number;
  simultaneousFivePolicy: SimultaneousFivePolicy;
}

export interface StatusState {
  skipNextTurns: Partial<Record<Player, number>>;
}

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  deck: DeckState;
  status: StatusState;
  winner?: Player | 'draw';
}

export function applyOps(state: GameState, ops: DomainOp[]): GameState {
  return produce(state, (draft: GameState) => {
    for (const op of ops) {
      if (op.type === 'place') {
        place(draft.board, op.point, op.player);
      } else if (op.type === 'remove') {
        remove(draft.board, op.point);
      } else if (op.type === 'swapAll') {
        for (let y = 0; y < draft.board.size; y++) {
          const row = draft.board.cells[y];
          if (!row) continue;
          for (let x = 0; x < draft.board.size; x++) {
            const v = row[x];
            if (v == null || v === EMPTY) continue;
            row[x] = (3 - v) as Player; // 1<->2
          }
        }
      } else {
        // op.type === 'freeze'
        const cur = draft.status.skipNextTurns[op.target] ?? 0;
        draft.status.skipNextTurns[op.target] = cur + op.amount;
      }
    }
  });
}

export function resolveWins(
  state: GameState,
  attacker: Player,
  policy: SimultaneousFivePolicy,
): GameState {
  return produce(state, (draft: GameState) => {
    const wins = scanAllWins(draft.board);
    const p1 = wins.some((w) => w.player === 1);
    const p2 = wins.some((w) => w.player === 2);
    if (!p1 && !p2) return;
    if (p1 && p2) {
      draft.winner = policy === 'attacker' ? attacker : 'draw';
    } else if (p1) {
      draft.winner = 1;
    } else if (p2) {
      draft.winner = 2;
    }
  });
}
