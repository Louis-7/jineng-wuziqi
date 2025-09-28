import type { Player, CellValue } from '../board';
import type { DeckState } from '../deck';
import type { GameState, StatusState } from './index';

export interface SerializedGameState {
  board: {
    size: number;
    cells: CellValue[][];
  };
  currentPlayer: Player;
  deck: DeckState;
  status: StatusState;
  winner: Player | 'draw' | null;
}

export function serializeGameState(game: GameState): SerializedGameState {
  return {
    board: {
      size: game.board.size,
      cells: game.board.cells.map((row) => row.slice()),
    },
    currentPlayer: game.currentPlayer,
    deck: { drawPile: [...game.deck.drawPile], discardPile: [...game.deck.discardPile] },
    status: {
      skipNextTurns: { ...game.status.skipNextTurns },
    },
    winner: game.winner ?? null,
  };
}

export function deserializeGameState(s: SerializedGameState): GameState {
  const base: Omit<GameState, 'winner'> & { winner?: GameState['winner'] } = {
    board: { size: s.board.size, cells: s.board.cells.map((r) => r.slice()) },
    currentPlayer: s.currentPlayer,
    deck: { drawPile: [...s.deck.drawPile], discardPile: [...s.deck.discardPile] },
    status: { skipNextTurns: { ...s.status.skipNextTurns } },
  };
  if (s.winner !== null) base.winner = s.winner;
  return base as GameState;
}
