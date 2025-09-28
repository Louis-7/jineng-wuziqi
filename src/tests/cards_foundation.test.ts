import { describe, it, expect } from 'vitest';
import { createBoard, place, EMPTY, type Player } from '../domain/board';
import { canPlayByTargetSpec, validateTargetBySpec, type MatchContext } from '../domain/cards';
import { CardRegistry } from '../domain/cards/registry';

function ctx(boardSize = 5, currentPlayer: Player = 1): MatchContext {
  return { board: createBoard(boardSize), currentPlayer };
}

describe('Card Target Validation', () => {
  it('canPlayByTargetSpec requires an empty cell when mustBeEmpty', () => {
    const c = ctx(2);
    // fill board
    place(c.board, { x: 0, y: 0 }, 1);
    place(c.board, { x: 1, y: 0 }, 2);
    place(c.board, { x: 0, y: 1 }, 1);
    place(c.board, { x: 1, y: 1 }, 2);

    const r1 = canPlayByTargetSpec(c, { kind: 'cell', mustBeEmpty: true });
    expect(r1.ok).toBe(false);

    // make an empty
    const row = c.board.cells[1];
    if (!row) throw new Error('row missing');
    row[1] = EMPTY;
    const r2 = canPlayByTargetSpec(c, { kind: 'cell', mustBeEmpty: true });
    expect(r2.ok).toBe(true);
  });

  it('validateTargetBySpec: cell must be empty if required', () => {
    const c = ctx(3, 1);
    place(c.board, { x: 1, y: 1 }, 2);

    const bad = validateTargetBySpec(
      c,
      { kind: 'cell', mustBeEmpty: true },
      {
        kind: 'cell',
        point: { x: 1, y: 1 },
      },
    );
    expect(bad.ok).toBe(false);

    const good = validateTargetBySpec(
      c,
      { kind: 'cell', mustBeEmpty: true },
      {
        kind: 'cell',
        point: { x: 0, y: 0 },
      },
    );
    expect(good.ok).toBe(true);
  });

  it('validateTargetBySpec: player relation self/opponent', () => {
    const c = ctx(5, 2);
    const selfRes = validateTargetBySpec(
      c,
      { kind: 'player', relation: 'self' },
      {
        kind: 'player',
        player: 2,
      },
    );
    expect(selfRes.ok).toBe(true);

    const oppRes = validateTargetBySpec(
      c,
      { kind: 'player', relation: 'opponent' },
      {
        kind: 'player',
        player: 1,
      },
    );
    expect(oppRes.ok).toBe(true);

    const wrong = validateTargetBySpec(
      c,
      { kind: 'player', relation: 'opponent' },
      {
        kind: 'player',
        player: 2,
      },
    );
    expect(wrong.ok).toBe(false);
  });

  it('validateTargetBySpec: ownership checks for self/opponent on cell', () => {
    const c = ctx(4, 1);
    place(c.board, { x: 1, y: 1 }, 1);
    place(c.board, { x: 2, y: 2 }, 2);

    const selfOk = validateTargetBySpec(
      c,
      { kind: 'cell', mustBeOwnedBy: 'self' },
      {
        kind: 'cell',
        point: { x: 1, y: 1 },
      },
    );
    expect(selfOk.ok).toBe(true);

    const oppOk = validateTargetBySpec(
      c,
      { kind: 'cell', mustBeOwnedBy: 'opponent' },
      {
        kind: 'cell',
        point: { x: 2, y: 2 },
      },
    );
    expect(oppOk.ok).toBe(true);

    const wrongSelf = validateTargetBySpec(
      c,
      { kind: 'cell', mustBeOwnedBy: 'self' },
      {
        kind: 'cell',
        point: { x: 2, y: 2 },
      },
    );
    expect(wrongSelf.ok).toBe(false);
  });
});

describe('CardRegistry', () => {
  it('register and retrieve; metadata map', () => {
    const reg = new CardRegistry();
    reg.register({
      id: 'Place',
      meta: { name: 'Place Stone', description: 'Place on an empty cell', icon: '●' },
      target: { kind: 'cell', mustBeEmpty: true },
      canPlay: () => ({ ok: true, value: undefined }),
      validateTarget: (_, t) => ({ ok: true, value: t }),
      effect: () => ({ ops: [] }),
    });

    const def = reg.require('Place');
    expect(def.meta.name).toMatch(/Place/);

    const meta = reg.getMetaMap();
    const placeMeta = meta['Place'];
    expect(placeMeta && placeMeta.description).toContain('empty');

    expect(() => {
      reg.register(def);
    }).toThrowError(/already registered/);
  });
});
