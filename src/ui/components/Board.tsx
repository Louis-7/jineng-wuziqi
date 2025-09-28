import React from 'react';
import type { BoardState, CellValue, Point } from '../../domain/board';

export interface BoardProps {
  board: BoardState;
  lastMove?: Point | undefined;
  winningLine?: Point[] | undefined;
  onCellClick?: (p: Point) => void;
  /** Optional predicate to enable/disable cell clickability */
  isCellEnabled?: (p: Point, value: CellValue) => boolean;
}

function isOnLine(p: Point, line?: Point[]): boolean {
  if (!line || line.length === 0) return false;
  return line.some((q) => q.x === p.x && q.y === p.y);
}

export function Board({ board, lastMove, winningLine, onCellClick, isCellEnabled }: BoardProps) {
  const size = board.size;
  return (
    <div
      className="inline-grid bg-stone-100 border border-stone-300"
      style={{ gridTemplateColumns: `repeat(${String(size)}, minmax(0, 1fr))` }}
      role="grid"
      aria-label={`Gomoku board ${String(size)} by ${String(size)}`}
    >
      {board.cells.map((row, y) =>
        row.map((val, x) => {
          const p = { x, y };
          const isLast = lastMove && lastMove.x === x && lastMove.y === y;
          const inWin = isOnLine(p, winningLine);
          const canClick = Boolean(onCellClick) && (!isCellEnabled || isCellEnabled(p, val));
          return (
            <button
              key={`${String(x)}-${String(y)}`}
              role="gridcell"
              aria-label={`cell ${String(x)},${String(y)} ${val === 0 ? 'empty' : `player ${String(val)}`}`}
              onClick={() => {
                if (canClick && onCellClick) onCellClick(p);
              }}
              className={[
                'group relative aspect-square w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10',
                canClick ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              {/* grid lines crossing at center to simulate intersections */}
              <div aria-hidden className="absolute inset-0">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-stone-300" />
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-stone-300" />
              </div>

              {/* winning line subtle background highlight */}
              {inWin && <div aria-hidden className="absolute inset-0 bg-yellow-100/30" />}

              {/* stone, centered at intersection */}
              {val !== 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={[
                      'rounded-full',
                      'w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6',
                      val === 1 ? 'bg-stone-900' : 'bg-white border border-stone-400',
                      'shadow-inner',
                      isLast ? 'ring-2 ring-indigo-500' : '',
                    ].join(' ')}
                  />
                </div>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}

export default Board;
