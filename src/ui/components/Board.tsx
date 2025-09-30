import React, { useMemo } from 'react';
import type { BoardState, CellValue, Point } from '../../domain/board';

export interface BoardProps {
  board: BoardState;
  lastMove?: Point | undefined;
  winningLine?: Point[] | undefined;
  onCellClick?: (p: Point) => void;
  /** Optional predicate to enable/disable cell clickability */
  isCellEnabled?: (p: Point, value: CellValue) => boolean;
  /** Show star points (hoshi) for typical sizes like 15×15 */
  showStar?: boolean;
  /** Visual theme for board rendering */
  theme?: 'modern' | 'classic';
}

/**
 * SVG-based board renderer. No CSS grid cells — stones live on intersections.
 * - Draw N×N lines
 * - Place stones as circles at integer coordinates (x,y)
 * - Click targets are small SVG circles with role="button" labeled as "intersection x,y"
 * - For a11y/test compatibility, we also expose non-interactive gridcells with labels
 */
export function Board({
  board,
  lastMove,
  winningLine,
  onCellClick,
  isCellEnabled,
  showStar = true,
  theme = 'modern',
}: BoardProps) {
  const size = board.size;

  const starPoints: Point[] = useMemo(() => {
    const stars: Point[] = [];
    if (showStar && size >= 11 && size % 2 === 1) {
      const edge = 3; // 1-indexed 4th line → 0-indexed 3
      const max = size - 1;
      const c = Math.floor(size / 2);
      stars.push({ x: c, y: c });
      stars.push({ x: edge, y: edge });
      stars.push({ x: edge, y: max - edge });
      stars.push({ x: max - edge, y: edge });
      stars.push({ x: max - edge, y: max - edge });
    }
    return stars;
  }, [showStar, size]);

  // Geometry: use an SVG viewBox that maps intersections to integer coordinates [0..size-1]
  // We pad by 0.5 to leave room for stroke width at the outer border
  const viewBox = useMemo(() => '-0.5 -0.5 ' + String(size) + ' ' + String(size), [size]);

  // Theme palette (kept internal; pure function of theme string)
  const palette =
    theme === 'classic'
      ? {
          boardFill: '#d6b38a', // light wood
          boardStroke: '#8b5e34',
          grid: '#8b5e34',
          star: '#5b3a17',
        }
      : {
          boardFill: '#f5f5f4',
          boardStroke: '#d6d3d1',
          grid: '#d6d3d1',
          star: '#6b7280',
        };

  return (
    <div className="relative inline-block">
      <div role="grid" aria-label={'Gomoku board ' + String(size) + ' by ' + String(size)}>
        <svg
          className="block select-none w-[360px] h-[360px] md:w-[360px] md:h-[360px] lg:w-[600px] lg:h-[600px]"
          viewBox={viewBox}
        >
          {theme === 'classic' && (
            <defs>
              <radialGradient id="stone-black-grad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#4a4a4a" />
                <stop offset="60%" stopColor="#101010" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
              <radialGradient id="stone-white-grad" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#dddddd" />
                <stop offset="100%" stopColor="#cfcfcf" />
              </radialGradient>
            </defs>
          )}
          {/* board background + border */}
          <rect
            x={-0.5}
            y={-0.5}
            width={size - 1 + 1}
            height={size - 1 + 1}
            fill={palette.boardFill}
            stroke={palette.boardStroke}
            strokeWidth={0.06}
          />

          {/* grid lines */}
          {Array.from({ length: size }, (_, i) => (
            <line
              key={'h-' + String(i)}
              x1={0}
              y1={i}
              x2={size - 1}
              y2={i}
              stroke={palette.grid}
              strokeWidth={0.04}
            />
          ))}
          {Array.from({ length: size }, (_, i) => (
            <line
              key={'v-' + String(i)}
              x1={i}
              y1={0}
              x2={i}
              y2={size - 1}
              stroke={palette.grid}
              strokeWidth={0.04}
            />
          ))}

          {/* star points */}
          {starPoints.map((s) => (
            <circle
              key={'star-' + String(s.x) + '-' + String(s.y)}
              cx={s.x}
              cy={s.y}
              r={0.08}
              fill={palette.star}
            />
          ))}

          {/* winning line highlight underlay (soft ring behind stones) */}
          {winningLine?.map((p) => (
            <circle
              key={'win-under-' + String(p.x) + '-' + String(p.y)}
              cx={p.x}
              cy={p.y}
              r={0.36}
              fill="#fde68a"
              opacity={0.2}
            />
          ))}

          {/* stones */}
          {board.cells.map((row, y) =>
            row.map((val, x) => {
              if (val === 0) return null;
              const isLast = lastMove && lastMove.x === x && lastMove.y === y;
              const isP1 = val === 1;
              const baseFill =
                theme === 'classic'
                  ? isP1
                    ? 'url(#stone-black-grad)'
                    : 'url(#stone-white-grad)'
                  : isP1
                    ? '#0c0a09'
                    : '#ffffff';
              const stroke =
                theme === 'classic' ? (isP1 ? '#000000' : '#b5b5b5') : isP1 ? 'none' : '#a8a29e';
              return (
                <g key={'stone-' + String(x) + '-' + String(y)}>
                  <circle
                    cx={x}
                    cy={y}
                    r={0.38}
                    fill={baseFill}
                    stroke={stroke}
                    strokeWidth={0.04}
                  />
                  {isLast && (
                    <circle
                      cx={x}
                      cy={y}
                      r={0.44}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth={0.06}
                    />
                  )}
                </g>
              );
            }),
          )}

          {/* winning line overlay ring to make it clearer */}
          {winningLine?.map((p) => (
            <circle
              key={'win-over-' + String(p.x) + '-' + String(p.y)}
              cx={p.x}
              cy={p.y}
              r={0.44}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={0.06}
            />
          ))}

          {/* interactive click targets at intersections (only when enabled) */}
          {board.cells.map((row, y) =>
            row.map((val, x) => {
              const canClick =
                Boolean(onCellClick) && (!isCellEnabled || isCellEnabled({ x, y }, val));
              if (!canClick) return null;
              return (
                <circle
                  key={'hit-' + String(x) + '-' + String(y)}
                  role="button"
                  aria-label={'intersection ' + String(x) + ',' + String(y)}
                  cx={x}
                  cy={y}
                  r={0.24}
                  fill="transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCellClick?.({ x, y });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCellClick?.({ x, y });
                    }
                  }}
                  tabIndex={0}
                  style={{ cursor: 'pointer', outline: 'none' }}
                  onMouseDown={(e) => {
                    // prevent any default focus/press visual
                    e.preventDefault();
                    (e.currentTarget as unknown as HTMLElement).blur();
                  }}
                />
              );
            }),
          )}
        </svg>

        {/* Accessibility gridcells (non-interactive), so tests and screen readers can query cell states */}
        <div aria-hidden={false} className="sr-only">
          {board.cells.map((row, y) =>
            row.map((val, x) => (
              <div
                key={'aria-' + String(x) + '-' + String(y)}
                role="gridcell"
                aria-label={
                  'cell ' +
                  String(x) +
                  ',' +
                  String(y) +
                  ' ' +
                  (val === 0 ? 'empty' : 'player ' + String(val))
                }
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}

export default Board;
