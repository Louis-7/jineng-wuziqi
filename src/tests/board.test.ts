import { describe, it, expect } from 'vitest';
import { createBoard, place, remove, checkWinFromLastMove, type Player } from '../domain/board';

function placeMany(
  b: ReturnType<typeof createBoard>,
  pts: Array<{ x: number; y: number }>,
  player: Player,
) {
  for (const p of pts) {
    place(b, p, player);
  }
}

describe('Board & Win Detection', () => {
  it('place/remove basics and bounds', () => {
    const b = createBoard(5);
    place(b, { x: 0, y: 0 }, 1);
    expect(() => {
      place(b, { x: 0, y: 0 }, 2);
    }).toThrowError('CellOccupied');
    remove(b, { x: 0, y: 0 });
    expect(() => {
      remove(b, { x: 0, y: 0 });
    }).toThrowError('CellEmpty');
    expect(() => {
      place(b, { x: -1, y: 0 }, 1);
    }).toThrowError('OutOfBounds');
  });

  it('detects horizontal five', () => {
    const b = createBoard(10);
    placeMany(
      b,
      [
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
      ],
      1,
    );
    place(b, { x: 6, y: 3 }, 1);
    const win = checkWinFromLastMove(b);
    expect(win?.player).toBe(1);
    expect(win?.length).toBeGreaterThanOrEqual(5);
  });

  it('detects vertical five at edge', () => {
    const b = createBoard(7);
    placeMany(
      b,
      [
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 0, y: 3 },
        { x: 0, y: 4 },
      ],
      2,
    );
    place(b, { x: 0, y: 5 }, 2);
    const win = checkWinFromLastMove(b);
    expect(win?.player).toBe(2);
    expect(win?.length).toBeGreaterThanOrEqual(5);
  });

  it('detects both diagonals', () => {
    const b = createBoard(10);
    // diag \
    placeMany(
      b,
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 },
      ],
      1,
    );
    place(b, { x: 5, y: 5 }, 1);
    expect(checkWinFromLastMove(b)?.player).toBe(1);

    // reset a few cells for /
    const b2 = createBoard(10);
    placeMany(
      b2,
      [
        { x: 5, y: 1 },
        { x: 4, y: 2 },
        { x: 3, y: 3 },
        { x: 2, y: 4 },
      ],
      2,
    );
    place(b2, { x: 1, y: 5 }, 2);
    expect(checkWinFromLastMove(b2)?.player).toBe(2);
  });
});
