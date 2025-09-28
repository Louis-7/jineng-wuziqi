import { describe, it, expect } from 'vitest';
import { createBoard, type Player } from '../domain/board';
import { createPrng } from '../domain/rng';
import { createTurnMachine } from '../domain/fsm/machine';
import { CardRegistry } from '../domain/cards/registry';
import { registerDefaultBaseCards } from '../domain/cards/baseCards';
import type { GameState } from '../domain/engine';
import { createActor } from 'xstate';

function gs(size = 5, current: Player = 1, drawPile: string[] = []): GameState {
  return {
    board: createBoard(size),
    currentPlayer: current,
    deck: { drawPile: [...drawPile], discardPile: [] },
    status: { skipNextTurns: {} },
  };
}

describe('Turn FSM', () => {
  it('happy path: draw → choose Place → select target → resolve → endTurn', () => {
    const registry = new CardRegistry();
    registerDefaultBaseCards(registry);
    const rng = createPrng('seed');
    const game = gs(5, 1, ['Other', 'Place']); // drawn will be ['Place','Other']
    const machine = createTurnMachine({
      game,
      rng,
      policy: 'attacker',
      registry,
      drawn: [],
      logs: [],
    });
    const actor = createActor(machine).start();

    // After start, machine should have drawn two and be in choose state
    let snap = actor.getSnapshot();
    expect(snap.value).toBe('choose');
    expect(snap.context.drawn).toEqual(['Place', 'Other']);

    // Choose the Place card
    actor.send({ type: 'CHOOSE_CARD', cardId: 'Place' });
    snap = actor.getSnapshot();
    expect(snap.value).toBe('selectTarget');

    // Select a valid cell target and the machine should resolve and end turn
    actor.send({ type: 'SELECT_TARGET', target: { kind: 'cell', point: { x: 0, y: 0 } } });
    snap = actor.getSnapshot();
    // Machine ends; verify effect applied and turn advanced
    expect(snap.status).toBe('done');
    expect(snap.context.game.board.cells[0]?.[0]).toBe(1);
    expect(snap.context.game.currentPlayer).toBe(2);
    expect(snap.context.game.deck.discardPile).toContain('Place');
  });

  it('skip logic: consumes skip and immediately ends turn', () => {
    const registry = new CardRegistry();
    registerDefaultBaseCards(registry);
    const rng = createPrng('seed');
    const game = gs(5, 1, ['Place']);
    game.status.skipNextTurns[1] = 1;
    const machine = createTurnMachine({
      game,
      rng,
      policy: 'attacker',
      registry,
      drawn: [],
      logs: [],
    });
    const actor = createActor(machine).start();
    const snap = actor.getSnapshot();
    expect(snap.status).toBe('done');
    // Turn advanced to opponent and skip consumed
    expect(snap.context.game.currentPlayer).toBe(2);
    expect(snap.context.game.status.skipNextTurns[1]).toBe(0);
    // No cards drawn when skipped
    expect(snap.context.drawn).toEqual([]);
  });

  it('logs: records draw, choose, target, resolve, checkWin in order', () => {
    const registry = new CardRegistry();
    registerDefaultBaseCards(registry);
    const rng = createPrng('seed');
    const game = gs(5, 1, ['Other', 'Place']);
    const machine = createTurnMachine({
      game,
      rng,
      policy: 'attacker',
      registry,
      drawn: [],
      logs: [],
    });
    const actor = createActor(machine).start();
    actor.send({ type: 'CHOOSE_CARD', cardId: 'Place' });
    actor.send({ type: 'SELECT_TARGET', target: { kind: 'cell', point: { x: 0, y: 0 } } });
    const snap = actor.getSnapshot();
    expect(snap.status).toBe('done');
    const tags = snap.context.logs.map((l) => l.tag);
    expect(tags).toEqual(['drawTwo', 'choose', 'selectTarget', 'resolve', 'checkWin']);
    expect(snap.context.logs[0]?.message.startsWith('drawTwo:')).toBe(true);
  });
});
