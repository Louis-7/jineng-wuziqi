export const EMPTY = 0 as const;
export type Player = 1 | 2;
export type CellValue = typeof EMPTY | Player;

export interface Point {
  x: number;
  y: number;
}

export interface LastMove extends Point {
  player: Player;
}

export interface BoardState {
  size: number;
  cells: CellValue[][];
  lastMove?: LastMove;
}

export function createBoard(size: number): BoardState {
  if (!Number.isInteger(size) || size <= 0) throw new Error('Invalid board size');
  const cells: CellValue[][] = Array.from({ length: size }, () =>
    Array<CellValue>(size).fill(EMPTY),
  );
  return { size, cells };
}

export function isOnBoard(b: BoardState, p: Point): boolean {
  return p.x >= 0 && p.x < b.size && p.y >= 0 && p.y < b.size;
}

export function getCell(b: BoardState, p: Point): CellValue {
  if (!isOnBoard(b, p)) throw new Error('OutOfBounds');
  const row = b.cells[p.y];
  if (!row) throw new Error('OutOfBounds');
  const val = row[p.x];
  if (val === undefined) throw new Error('OutOfBounds');
  return val;
}

export function isEmpty(b: BoardState, p: Point): boolean {
  return getCell(b, p) === EMPTY;
}

export function place(b: BoardState, p: Point, player: Player): void {
  if (!isOnBoard(b, p)) throw new Error('OutOfBounds');
  if (!isEmpty(b, p)) throw new Error('CellOccupied');
  const row = b.cells[p.y];
  if (!row) throw new Error('OutOfBounds');
  row[p.x] = player;
  b.lastMove = { ...p, player };
}

export function remove(b: BoardState, p: Point): void {
  if (!isOnBoard(b, p)) throw new Error('OutOfBounds');
  if (isEmpty(b, p)) throw new Error('CellEmpty');
  const row = b.cells[p.y];
  if (!row) throw new Error('OutOfBounds');
  row[p.x] = EMPTY;
}

export interface WinResult {
  player: Player;
  length: number; // length of the winning contiguous line (>=5)
  line: Point[]; // coordinates of the winning line in order
}

// Directions: horizontal, vertical, diag1 (\), diag2 (/)
const DIRS: Array<{ dx: number; dy: number }> = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
];

/**
 * Check win from the board's lastMove. Returns the first found winning line, or null.
 * Scans four directions; for each, extend both sides and compute total length.
 */
export function checkWinFromLastMove(b: BoardState): WinResult | null {
  const lm = b.lastMove;
  if (!lm) return null;
  const { x, y, player } = lm;

  for (const { dx, dy } of DIRS) {
    // Collect coordinates along the line including the last move
    const line: Point[] = [{ x, y }];

    // extend negative
    let nx = x - dx;
    let ny = y - dy;
    while (nx >= 0 && ny >= 0 && nx < b.size && ny < b.size) {
      const row = b.cells[ny];
      if (!row || row[nx] !== player) break;
      line.unshift({ x: nx, y: ny });
      nx -= dx;
      ny -= dy;
    }

    // extend positive
    nx = x + dx;
    ny = y + dy;
    while (nx >= 0 && ny >= 0 && nx < b.size && ny < b.size) {
      const row = b.cells[ny];
      if (!row || row[nx] !== player) break;
      line.push({ x: nx, y: ny });
      nx += dx;
      ny += dy;
    }

    if (line.length >= 5) {
      return { player, length: line.length, line };
    }
  }

  return null;
}

/**
 * Scan globally for any winning lines for any player. Returns all wins found.
 * Used for effects that may produce simultaneous wins (see Rules.md).
 */
export function scanAllWins(b: BoardState): WinResult[] {
  const wins: WinResult[] = [];
  // Directions to scan only in positive direction to avoid duplicates
  const DIRS: Array<{ dx: number; dy: number }> = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
  ];

  for (let y = 0; y < b.size; y++) {
    const row = b.cells[y];
    if (!row) continue;
    for (let x = 0; x < b.size; x++) {
      const player = row[x];
      if (player === EMPTY) continue;
      for (const { dx, dy } of DIRS) {
        const px = x - dx;
        const py = y - dy;
        // Only start counting if previous cell in direction is different or out of bounds
        if (px >= 0 && px < b.size && py >= 0 && py < b.size) {
          const prev = b.cells[py]?.[px];
          if (prev === player) continue;
        }
        const line: Point[] = [{ x, y }];
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < b.size && ny >= 0 && ny < b.size) {
          const val = b.cells[ny]?.[nx];
          if (val !== player) break;
          line.push({ x: nx, y: ny });
          nx += dx;
          ny += dy;
        }
        if (line.length >= 5) {
          wins.push({ player: player as Player, length: line.length, line });
        }
      }
    }
  }
  return wins;
}
