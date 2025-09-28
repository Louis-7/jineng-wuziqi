import { setup, assign } from 'xstate';
import type { Player } from '../board';
import type { PRNG } from '../rng';
import { draw as drawCards, type CardId } from '../deck';
import type { MatchContext, TargetValue } from '../cards';
import { DefaultCardRegistry } from '../cards';
import { applyOps, resolveWins, type GameState, type SimultaneousFivePolicy } from '../engine';

export interface TurnContext {
  game: GameState;
  rng: PRNG;
  policy: SimultaneousFivePolicy;
  registry: typeof DefaultCardRegistry;
  drawn: CardId[]; // last drawn 2
  chosen?: CardId; // chosen to play
  target?: unknown; // target value depends on card
  logs: TurnLogEntry[];
}

export type TurnLogTag = 'drawTwo' | 'choose' | 'selectTarget' | 'resolve' | 'checkWin' | 'skip';

export interface TurnLogEntry {
  at: number; // monotonically increasing sequence number starting at 1
  tag: TurnLogTag;
  message: string;
}

export type TurnEvent =
  | { type: 'START_TURN' }
  | { type: 'CHOOSE_CARD'; cardId: CardId }
  | { type: 'SELECT_TARGET'; target: unknown }
  | { type: 'RESOLVE' }
  | { type: 'END_TURN' };

export function createTurnMachine(initialContext: TurnContext) {
  return setup({
    types: {
      context: {} as TurnContext,
      events: {} as TurnEvent,
    },
    actions: {
      doDrawTwo: assign(({ context }) => {
        // Avoid mutating the deck stored in XState context directly; use a copy.
        const deckCopy = {
          drawPile: [...context.game.deck.drawPile],
          discardPile: [...context.game.deck.discardPile],
        };
        const drawn = drawCards(deckCopy, 2, context.rng);
        return {
          drawn,
          game: {
            ...context.game,
            deck: deckCopy,
          },
        };
      }),
      logDrawTwo: assign({
        logs: ({ context }) => {
          const at = context.logs.length + 1;
          const msg = `drawTwo: [${context.drawn.join(', ')}]`;
          return [...context.logs, { at, tag: 'drawTwo', message: msg }];
        },
      }),
      setChosen: assign(({ context, event }) => {
        if (event.type !== 'CHOOSE_CARD') return {};
        const other = context.drawn.find((c: CardId) => c !== event.cardId);
        if (!other) return { chosen: event.cardId };
        // immutably discard the unchosen card
        return {
          chosen: event.cardId,
          game: {
            ...context.game,
            deck: {
              drawPile: context.game.deck.drawPile,
              discardPile: [...context.game.deck.discardPile, other],
            },
          },
        };
      }),
      logChosen: assign(({ context, event }) => {
        if (event.type !== 'CHOOSE_CARD') return {};
        const at = context.logs.length + 1;
        const other = context.drawn.find((c: CardId) => c !== event.cardId);
        const msg = other
          ? `choose: ${event.cardId} (discard ${other})`
          : `choose: ${event.cardId}`;
        return { logs: [...context.logs, { at, tag: 'choose', message: msg }] };
      }),
      setTarget: assign({
        target: ({ context, event }) =>
          event.type === 'SELECT_TARGET' ? event.target : context.target,
      }),
      logTarget: assign(({ context, event }) => {
        if (event.type !== 'SELECT_TARGET') return {};
        const at = context.logs.length + 1;
        const msg = `selectTarget: ${JSON.stringify(event.target)}`;
        return { logs: [...context.logs, { at, tag: 'selectTarget', message: msg }] };
      }),
      applyCardEffect: assign(({ context }) => {
        if (!context.chosen) return {};
        const def = context.registry.require(context.chosen);
        const mc: MatchContext = {
          board: context.game.board,
          currentPlayer: context.game.currentPlayer,
          skipNextTurns: context.game.status.skipNextTurns,
        };
        const can = def.canPlay(mc);
        if (!can.ok) return {};
        // The event target is unknown at runtime; we coerce to TargetValue and let validateTarget handle legality.
        const target: TargetValue = (context.target ?? { kind: 'none' }) as TargetValue;
        const validated = def.validateTarget(mc, target);
        if (!validated.ok) return {};
        const effect = def.effect(mc, context.rng, validated.value);
        const nextGame = applyOps(context.game, effect.ops);
        // immutably discard the played card
        return {
          game: {
            ...nextGame,
            deck: {
              drawPile: nextGame.deck.drawPile,
              discardPile: [...nextGame.deck.discardPile, context.chosen],
            },
          },
          // store ops length in message via separate logger action
        };
      }),
      logEffect: assign(({ context }) => {
        const at = context.logs.length + 1;
        const msg = `resolve: ${String(context.chosen)} applied`;
        return { logs: [...context.logs, { at, tag: 'resolve', message: msg }] };
      }),
      applyWinCheck: assign({
        game: ({ context }) => {
          if (context.game.winner) return context.game;
          return resolveWins(context.game, context.game.currentPlayer, context.policy);
        },
      }),
      logWinCheck: assign(({ context }) => {
        const at = context.logs.length + 1;
        const msg = `checkWin: ${String(context.game.winner ?? 'none')}`;
        return { logs: [...context.logs, { at, tag: 'checkWin', message: msg }] };
      }),
      advanceTurn: assign({
        game: ({ context }) => {
          const opp = (3 - context.game.currentPlayer) as Player;
          return { ...context.game, currentPlayer: opp };
        },
      }),
      consumeSkip: assign({
        game: ({ context }) => {
          const g = context.game;
          const cur = g.status.skipNextTurns[g.currentPlayer] ?? 0;
          if (cur <= 0) return g;
          return {
            ...g,
            status: {
              ...g.status,
              skipNextTurns: {
                ...g.status.skipNextTurns,
                [g.currentPlayer]: cur - 1,
              },
            },
          };
        },
      }),
      logSkip: assign(({ context }) => {
        const at = context.logs.length + 1;
        const msg = 'skip: consumed 1';
        return { logs: [...context.logs, { at, tag: 'skip', message: msg }] };
      }),
    },
    guards: {
      shouldSkip: ({ context }) => {
        const cur = context.game.status.skipNextTurns[context.game.currentPlayer] ?? 0;
        return cur > 0;
      },
      needsTarget: ({ context }) => {
        if (!context.chosen) return false;
        const def = context.registry.require(context.chosen);
        return def.target.kind !== 'none';
      },
      targetValid: ({ context, event }) => {
        if (event.type !== 'SELECT_TARGET' || !context.chosen) return false;
        const def = context.registry.require(context.chosen);
        const mc: MatchContext = {
          board: context.game.board,
          currentPlayer: context.game.currentPlayer,
          skipNextTurns: context.game.status.skipNextTurns,
        };
        const res = def.validateTarget(mc, event.target as never);
        return res.ok;
      },
    },
  }).createMachine({
    id: 'turn',
    initial: 'maybeSkip',
    context: initialContext,
    states: {
      maybeSkip: {
        always: [
          { guard: 'shouldSkip', actions: ['consumeSkip', 'logSkip'], target: 'endTurn' },
          { target: 'drawTwo' },
        ],
      },
      drawTwo: {
        entry: ['doDrawTwo', 'logDrawTwo'],
        always: 'choose',
      },
      choose: {
        on: {
          CHOOSE_CARD: {
            actions: ['setChosen', 'logChosen'],
            target: 'maybeTarget',
          },
        },
      },
      maybeTarget: {
        always: [{ guard: 'needsTarget', target: 'selectTarget' }, { target: 'resolve' }],
      },
      selectTarget: {
        on: {
          SELECT_TARGET: {
            guard: 'targetValid',
            actions: ['setTarget', 'logTarget'],
            target: 'resolve',
          },
        },
      },
      resolve: {
        entry: ['applyCardEffect', 'logEffect'],
        always: 'checkWin',
      },
      checkWin: {
        entry: ['applyWinCheck', 'logWinCheck'],
        always: 'endTurn',
      },
      endTurn: {
        entry: 'advanceTurn',
        type: 'final',
      },
    },
  });
}
