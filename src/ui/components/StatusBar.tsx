import React from 'react';
import type { GameState } from '../../domain/engine';

export interface StatusBarProps {
  game: GameState;
}

export function StatusBar({ game }: StatusBarProps) {
  const skip1 = game.status.skipNextTurns[1] ?? 0;
  const skip2 = game.status.skipNextTurns[2] ?? 0;
  return (
    <div
      className="flex flex-wrap items-center gap-3 text-sm text-stone-700"
      role="status"
      aria-live="polite"
    >
      <span>
        Current: <strong className="font-semibold">P{game.currentPlayer}</strong>
      </span>
      <span>
        Deck: <strong>{game.deck.drawPile.length}</strong>
      </span>
      <span>
        Discard: <strong>{game.deck.discardPile.length}</strong>
      </span>
      {(skip1 > 0 || skip2 > 0) && (
        <span className="ml-auto text-indigo-700">
          Freeze → P1: {skip1} • P2: {skip2}
        </span>
      )}
      {game.winner && (
        <span className="ml-auto text-green-700 font-medium">Winner: {String(game.winner)}</span>
      )}
    </div>
  );
}

export default StatusBar;
