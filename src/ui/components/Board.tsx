import React from 'react';
import type { BoardState, CellValue, Point } from '../../domain/board';

export interface BoardProps {
  board: BoardState;
  lastMove?: Point | undefined;
  winningLine?: Point[] | undefined;
  onCellClick?: (p: Point) => void;
  /** Optional predicate to enable/disable cell clickability */
  isCellEnabled?: (p: Point, value: CellValue) => boolean;
  /** Show coordinate labels around the board */
  showCoords?: boolean;
  /** Show star points (hoshi) for typical sizes like 15×15 */
  showStar?: boolean;
}

function isOnLine(p: Point, line?: Point[]): boolean {
  if (!line || line.length === 0) return false;
  return line.some((q) => q.x === p.x && q.y === p.y);
}

export function Board({
  board,
  lastMove,
  winningLine,
  onCellClick,
  isCellEnabled,
  showCoords = true,
  showStar = true,
}: BoardProps) {
  const size = board.size;
  const tilePercent = `${String(100 / size)}%`;
  const DOT_BASE = 'w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6';
  // Label helpers
  const colLabel = (x: number): string => String.fromCharCode('A'.charCodeAt(0) + x);
  const rowLabel = (y: number): string => String(y + 1);

  // Star (hoshi) points: for 15×15 show 5 points (center + 4 near-corner), otherwise none
  const starPoints: Point[] = [];
  if (showStar && size >= 11 && size % 2 === 1) {
    const edge = 3; // 1-indexed 4线 → 0-indexed 3
    const max = size - 1;
    const c = Math.floor(size / 2);
    starPoints.push({ x: c, y: c });
    starPoints.push({ x: edge, y: edge });
    starPoints.push({ x: edge, y: max - edge });
    starPoints.push({ x: max - edge, y: edge });
    starPoints.push({ x: max - edge, y: max - edge });
  }
  return (
    <div className="relative inline-block p-5 bg-stone-100 border border-stone-300">
      <div
        className="relative inline-grid"
        style={{ gridTemplateColumns: `repeat(${String(size)}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={`Gomoku board ${String(size)} by ${String(size)}`}
      >
        {/* continuous grid lines as a background layer inside padded area */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, #d6d3d1 1px, transparent 1px), linear-gradient(to bottom, #d6d3d1 1px, transparent 1px)',
            backgroundSize: `${tilePercent} 100%, 100% ${tilePercent}`,
            backgroundRepeat: 'repeat, repeat',
          }}
        />
        {/* star points */}
        {starPoints.map((s) => (
          <div
            key={`star-${String(s.x)}-${String(s.y)}`}
            aria-hidden
            className="pointer-events-none absolute rounded-full bg-stone-500"
            style={{
              width: '6px',
              height: '6px',
              left: `${String((s.x / size) * 100)}%`,
              top: `${String((s.y / size) * 100)}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        {board.cells.map((row, y) =>
          row.map((val, x) => {
            const p = { x, y };
            const isLast = lastMove && lastMove.x === x && lastMove.y === y;
            const inWin = isOnLine(p, winningLine);
            const canClick = Boolean(onCellClick) && (!isCellEnabled || isCellEnabled(p, val));
            return (
              <div
                key={`${String(x)}-${String(y)}`}
                role="gridcell"
                aria-label={`cell ${String(x)},${String(y)} ${val === 0 ? 'empty' : `player ${String(val)}`}`}
                className={[
                  'group relative aspect-square w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12',
                  canClick ? '' : '',
                ].join(' ')}
              >
                {/* winning line subtle background highlight */}
                {inWin && <div aria-hidden className="absolute inset-0 bg-yellow-100/30" />}

                {/* stone, placed at the intersection (top-left corner of each cell) */}
                {val !== 0 && (
                  <div
                    className={[
                      'absolute',
                      // Anchor at the top-left intersection and center the dot on it
                      'left-0 top-0 -translate-x-1/2 -translate-y-1/2',
                      DOT_BASE,
                      'rounded-full',
                      val === 1 ? 'bg-stone-900' : 'bg-white border border-stone-400',
                      'shadow-inner',
                      isLast ? 'ring-2 ring-indigo-500' : '',
                    ].join(' ')}
                  />
                )}

                {/* intersection hit area: only this small button is clickable */}
                {canClick && (
                  <button
                    type="button"
                    aria-label={`intersection ${String(x)},${String(y)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCellClick) onCellClick(p);
                    }}
                    className={[
                      'absolute z-10 left-0 top-0 -translate-x-1/2 -translate-y-1/2',
                      'rounded-full',
                      // Slightly smaller than stone base to feel precise
                      'w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5',
                      'border border-indigo-300/70 bg-indigo-300/20',
                      'opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500',
                      'transition-opacity',
                      'cursor-pointer',
                    ].join(' ')}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* coordinate labels */}
      {showCoords && (
        <>
          {/* column labels (top) */}
          {Array.from({ length: size }).map((_, x) => (
            <div
              key={`col-${String(x)}`}
              aria-hidden
              className="absolute text-[10px] md:text-xs text-stone-600"
              style={{
                left: `calc(${String((x / size) * 100)}% + 0px)`,
                top: '6px',
                transform: 'translate(-50%, -100%)',
              }}
            >
              {colLabel(x)}
            </div>
          ))}
          {/* row labels (left) */}
          {Array.from({ length: size }).map((_, y) => (
            <div
              key={`row-${String(y)}`}
              aria-hidden
              className="absolute text-[10px] md:text-xs text-stone-600"
              style={{
                left: '6px',
                top: `calc(${String((y / size) * 100)}% + 0px)`,
                transform: 'translate(-100%, -50%)',
              }}
            >
              {rowLabel(y)}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default Board;
