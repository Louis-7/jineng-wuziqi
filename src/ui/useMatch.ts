import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPrng, type PRNG } from '../domain/rng';
import { createBoard, type Player, type Point, checkWinFromLastMove } from '../domain/board';
import { createTurnMachine } from '../domain/fsm/machine';
import { CardRegistry } from '../domain/cards/registry';
import { registerDefaultBaseCards } from '../domain/cards/baseCards';
import type { GameState, SimultaneousFivePolicy } from '../domain/engine';
import { createActor } from 'xstate';

export interface MatchOptions {
  boardSize?: number;
  firstPlayer?: Player;
  seed?: string | number;
  policy?: SimultaneousFivePolicy;
  /** Initial deck composition (top at end of array to align with pop()) */
  deck?: string[];
}

export function useMatch(opts: MatchOptions = {}) {
  const boardSize = opts.boardSize ?? 15;
  const firstPlayer = opts.firstPlayer ?? 1;
  const seed = opts.seed ?? 'demo';
  const policy = opts.policy ?? 'attacker';
  const initialDeck = opts.deck ?? [
    'Place',
    'Take',
    'PolarityInversion',
    'TimeFreeze',
    'SpontaneousGeneration',
    'Place',
    'Place',
    'Take',
  ];

  const registry = useMemo(() => {
    // Clone a fresh registry
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    return reg;
  }, []);

  const rngRef = useRef<PRNG>(createPrng(seed));
  const [game, setGame] = useState<GameState>(() => ({
    board: createBoard(boardSize),
    currentPlayer: firstPlayer,
    deck: { drawPile: [...initialDeck], discardPile: [] },
    status: { skipNextTurns: {} },
  }));

  const [drawn, setDrawn] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [needsTarget, setNeedsTarget] = useState<boolean>(false);
  const [winningLine, setWinningLine] = useState<Point[] | undefined>(undefined);
  type TurnMachine = ReturnType<typeof createTurnMachine>;
  type Actor = ReturnType<typeof createActor<TurnMachine>>;
  const actorRef = useRef<Actor | null>(null);

  const startNewTurn = useCallback(
    (g: GameState) => {
      // If the game already has a winner, do not start a new turn.
      if (g.winner) {
        if (actorRef.current) {
          try {
            actorRef.current.stop();
          } catch {
            // ignore
          }
        }
        actorRef.current = null;
        setDrawn([]);
        setChosen(undefined);
        setNeedsTarget(false);
        return;
      }

      // dispose previous
      if (actorRef.current) {
        try {
          actorRef.current.stop();
        } catch {
          // ignore
        }
      }
      const machine = createTurnMachine({
        game: g,
        rng: rngRef.current,
        policy,
        registry,
        drawn: [],
        logs: [],
      });
      const actor = createActor(machine).start();
      actorRef.current = actor;
      const snap = actor.getSnapshot();
      setDrawn(snap.context.drawn);
      setChosen(undefined);
      setNeedsTarget(false);
    },
    [policy, registry],
  );

  // After each turn finishes, snapshot game and reset interim UI state
  const chooseCard = useCallback(
    (cardId: string) => {
      // Ignore interactions once the game is finished
      if (game.winner) return;
      const actor = actorRef.current;
      if (!actor) return;
      actor.send({ type: 'CHOOSE_CARD', cardId });
      const snap = actor.getSnapshot();
      setChosen(cardId);
      const needs = snap.value === 'selectTarget';
      setNeedsTarget(needs);
      if (!needs && snap.status === 'done') {
        const next = snap.context.game;
        setGame(next);
        const win = checkWinFromLastMove(next.board);
        setWinningLine(win?.line);
        if (next.winner) {
          // End of game: stop the actor and clear turn UI
          try {
            actor.stop();
          } catch {
            // ignore
          }
          actorRef.current = null;
          setDrawn([]);
          setChosen(undefined);
          setNeedsTarget(false);
        } else {
          startNewTurn({ ...next });
        }
      }
    },
    [game.winner, startNewTurn],
  );

  const selectCell = useCallback(
    (p: Point) => {
      // Ignore interactions once the game is finished
      if (game.winner) return;
      const actor = actorRef.current;
      if (!actor || !chosen) return;
      actor.send({ type: 'SELECT_TARGET', target: { kind: 'cell', point: p } });
      const snap = actor.getSnapshot();
      if (snap.status === 'done') {
        const next = snap.context.game;
        setGame(next);
        const win = checkWinFromLastMove(next.board);
        setWinningLine(win?.line);
        if (next.winner) {
          // End of game: stop the actor and clear turn UI
          try {
            actor.stop();
          } catch {
            // ignore
          }
          actorRef.current = null;
          setDrawn([]);
          setChosen(undefined);
          setNeedsTarget(false);
        } else {
          startNewTurn({ ...next });
        }
      }
    },
    [game.winner, chosen, startNewTurn],
  );

  // Start first turn on mount if no drawn yet
  useEffect(() => {
    startNewTurn(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registryMeta = useMemo(() => registry.getMetaMap(), [registry]);

  return {
    game,
    drawn,
    chosen,
    needsTarget,
    winningLine,
    selectCell,
    chooseCard,
    registryMeta,
  } as const;
}

export default useMatch;
