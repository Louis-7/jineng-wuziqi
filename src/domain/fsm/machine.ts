import { setup, assign } from 'xstate';
import type { Player } from '../board';
import type { PRNG } from '../rng';
import { draw as drawCards, discard as discardCards, type CardId } from '../deck';
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
      doDrawTwo: assign({
        drawn: ({ context }) => drawCards(context.game.deck, 2, context.rng),
      }),
      setChosen: assign({
        chosen: ({ context, event }) => {
          if (event.type !== 'CHOOSE_CARD') return context.chosen;
          const other = context.drawn.find((c: CardId) => c !== event.cardId);
          if (other) discardCards(context.game.deck, [other]);
          return event.cardId;
        },
      }),
      setTarget: assign({
        target: ({ context, event }) =>
          event.type === 'SELECT_TARGET' ? event.target : context.target,
      }),
      applyCardEffect: assign({
        game: ({ context }) => {
          if (!context.chosen) return context.game;
          const def = context.registry.require(context.chosen);
          const mc: MatchContext = {
            board: context.game.board,
            currentPlayer: context.game.currentPlayer,
            skipNextTurns: context.game.status.skipNextTurns,
          };
          const can = def.canPlay(mc);
          if (!can.ok) return context.game;
          // The event target is unknown at runtime; we coerce to TargetValue and let validateTarget handle legality.
          const target: TargetValue = (context.target ?? { kind: 'none' }) as TargetValue;
          const validated = def.validateTarget(mc, target);
          if (!validated.ok) return context.game;
          const effect = def.effect(mc, context.rng, validated.value);
          const nextGame = applyOps(context.game, effect.ops);
          discardCards(nextGame.deck, [context.chosen]);
          return nextGame;
        },
      }),
      applyWinCheck: assign({
        game: ({ context }) => {
          if (context.game.winner) return context.game;
          return resolveWins(context.game, context.game.currentPlayer, context.policy);
        },
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
          { guard: 'shouldSkip', actions: 'consumeSkip', target: 'endTurn' },
          { target: 'drawTwo' },
        ],
      },
      drawTwo: {
        entry: 'doDrawTwo',
        always: 'choose',
      },
      choose: {
        on: {
          CHOOSE_CARD: {
            actions: 'setChosen',
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
            actions: 'setTarget',
            target: 'resolve',
          },
        },
      },
      resolve: {
        entry: 'applyCardEffect',
        always: 'checkWin',
      },
      checkWin: {
        entry: 'applyWinCheck',
        always: 'endTurn',
      },
      endTurn: {
        entry: 'advanceTurn',
        type: 'final',
      },
    },
  });
}
