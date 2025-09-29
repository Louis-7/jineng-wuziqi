import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPrng, type PRNG } from '../domain/rng';
import { createBoard, type Player, type Point, checkWinFromLastMove } from '../domain/board';
import { createTurnMachine } from '../domain/fsm/machine';
import { CardRegistry } from '../domain/cards/registry';
import { registerDefaultBaseCards } from '../domain/cards/baseCards';
import type { GameState, SimultaneousFivePolicy } from '../domain/engine';
import type { MatchContext } from '../domain/cards';
import { createActor } from 'xstate';
import { buildShuffledDeck } from '../domain/deck';
import { RandomBot } from '../ai/randomStrategy';
import { HeuristicBot } from '../ai/heuristicStrategy';
import type { BotStrategy } from '../ai/types';

export interface MatchOptions {
  boardSize?: number;
  firstPlayer?: Player;
  seed?: string | number;
  policy?: SimultaneousFivePolicy;
  /** cardId -> count mapping for initial deck construction */
  deckCounts?: Record<string, number>;
  /** Opponent type: human (local hotseat) or bot */
  opponent?: 'human' | 'bot';
  /** Which bot strategy id to use (currently only 'random-baseline') */
  botStrategyId?: string;
}

export function useMatch(opts: MatchOptions = {}) {
  const boardSize = opts.boardSize ?? 15;
  const firstPlayer = opts.firstPlayer ?? 1;
  const seed = opts.seed ?? 'demo';
  const policy = opts.policy ?? 'attacker';
  const deckCounts = opts.deckCounts ?? {
    Place: 12,
    Take: 6,
    PolarityInversion: 3,
    SpontaneousGeneration: 5,
  };
  const opponent = opts.opponent ?? 'human';
  const botStrategyId = opts.botStrategyId ?? 'random-baseline';
  const botStrategies = useMemo<Record<string, BotStrategy>>(
    () => ({
      'random-baseline': RandomBot,
      'heuristic-v1': HeuristicBot,
    }),
    [],
  );

  const registry = useMemo(() => {
    // Clone a fresh registry
    const reg = new CardRegistry();
    registerDefaultBaseCards(reg);
    return reg;
  }, []);

  const rngRef = useRef<PRNG>(createPrng(seed));
  const optionsRef = useRef<Required<MatchOptions>>({
    boardSize,
    firstPlayer,
    seed,
    policy,
    deckCounts,
    opponent,
    botStrategyId,
  });
  const [game, setGame] = useState<GameState>(() => ({
    board: createBoard(boardSize),
    currentPlayer: firstPlayer,
    deck: { drawPile: buildShuffledDeck(rngRef.current, deckCounts, registry), discardPile: [] },
    status: { skipNextTurns: {} },
  }));

  const [drawn, setDrawn] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [needsTarget, setNeedsTarget] = useState<boolean>(false);
  const [winningLine, setWinningLine] = useState<Point[] | undefined>(undefined);
  const [turnLogs, setTurnLogs] = useState<
    {
      turn: number;
      player: Player;
      bot: boolean;
      entries: { at: number; tag: string; message: string }[];
    }[]
  >([]);
  const turnCounterRef = useRef(0);
  type TurnMachine = ReturnType<typeof createTurnMachine>;
  type Actor = ReturnType<typeof createActor<TurnMachine>>;
  const actorRef = useRef<Actor | null>(null);

  // Placeholder declarations for functions defined later (so bot scheduling can reference typed versions)
  const chooseCardRef = useRef<(cardId: string) => void>();
  const selectCellRef = useRef<(p: Point) => void>();

  const startNewTurn = useCallback(
    (g: GameState): void => {
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
      const {
        policy: currentPolicy,
        opponent: currentOpponent,
        botStrategyId: currentBotStrategyId,
      } = optionsRef.current;
      const machine = createTurnMachine({
        game: g,
        rng: rngRef.current,
        policy: currentPolicy,
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
      // If it's a bot opponent's turn, schedule AI decision after a short delay
      if (currentOpponent === 'bot' && g.currentPlayer === 2) {
        const strategy = botStrategies[currentBotStrategyId] ?? RandomBot;
        setTimeout(() => {
          const a = actorRef.current;
          if (!a) return;
          const s = a.getSnapshot();
          const decision = strategy.decide(
            s.context.game,
            s.context.drawn,
            registry,
            rngRef.current,
          );
          if (decision.cardId) {
            chooseCardRef.current?.(decision.cardId);
            if (decision.target && decision.target.kind === 'cell') {
              const point = decision.target.point;
              setTimeout(() => selectCellRef.current?.(point), 40);
            }
          }
        }, 320); // small UX delay to show drawn cards
      }
    },
    [registry, botStrategies],
  );

  // After each turn finishes, snapshot game and reset interim UI state
  const chooseCard = useCallback(
    (cardId: string): void => {
      // Ignore interactions once the game is finished
      if (game.winner) return;
      const actor = actorRef.current;
      if (!actor) return;
      actor.send({ type: 'CHOOSE_CARD', cardId });
      // No player-targeting cards currently; selection proceeds as normal for cell-target cards.
      const snap = actor.getSnapshot();
      setChosen(cardId);
      const needs = snap.value === 'selectTarget';
      setNeedsTarget(needs);
      if (snap.status === 'done') {
        const next = snap.context.game;
        setGame(next);
        const win = checkWinFromLastMove(next.board);
        setWinningLine(win?.line);
        // store logs
        turnCounterRef.current += 1;
        setTurnLogs((prev) => [
          ...prev,
          {
            turn: turnCounterRef.current,
            player: game.currentPlayer,
            bot: optionsRef.current.opponent === 'bot' && game.currentPlayer === 2,
            entries: snap.context.logs.map((l) => ({ at: l.at, tag: l.tag, message: l.message })),
          },
        ]);
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
    [game.winner, game.currentPlayer, startNewTurn],
  );

  const selectCell = useCallback(
    (p: Point): void => {
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
        turnCounterRef.current += 1;
        setTurnLogs((prev) => [
          ...prev,
          {
            turn: turnCounterRef.current,
            player: game.currentPlayer,
            bot: optionsRef.current.opponent === 'bot' && game.currentPlayer === 2,
            entries: snap.context.logs.map((l) => ({ at: l.at, tag: l.tag, message: l.message })),
          },
        ]);
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
    [game.winner, chosen, game.currentPlayer, startNewTurn],
  );

  // Update refs after hooks are defined
  chooseCardRef.current = chooseCard;
  selectCellRef.current = selectCell;

  // Start first turn on mount if no drawn yet
  useEffect(() => {
    startNewTurn(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registryMeta = useMemo(() => registry.getMetaMap(), [registry]);

  const resetMatch = useCallback(
    (newOpts: MatchOptions) => {
      // Merge with current options
      const merged = {
        boardSize: newOpts.boardSize ?? optionsRef.current.boardSize,
        firstPlayer: newOpts.firstPlayer ?? optionsRef.current.firstPlayer,
        seed: newOpts.seed ?? optionsRef.current.seed,
        policy: newOpts.policy ?? optionsRef.current.policy,
        deckCounts: newOpts.deckCounts ?? optionsRef.current.deckCounts,
        opponent: newOpts.opponent ?? optionsRef.current.opponent,
        botStrategyId: newOpts.botStrategyId ?? optionsRef.current.botStrategyId,
      } as Required<MatchOptions>;

      // Stop any running actor
      if (actorRef.current) {
        try {
          actorRef.current.stop();
        } catch {
          // ignore
        }
      }
      actorRef.current = null;

      // Recreate RNG and game
      rngRef.current = createPrng(merged.seed);
      const g: GameState = {
        board: createBoard(merged.boardSize),
        currentPlayer: merged.firstPlayer,
        deck: {
          drawPile: buildShuffledDeck(rngRef.current, merged.deckCounts, registry),
          discardPile: [],
        },
        status: { skipNextTurns: {} },
      };
      optionsRef.current = merged;
      setGame(g);
      setWinningLine(undefined);
      setDrawn([]);
      setChosen(undefined);
      setNeedsTarget(false);
      setTurnLogs([]);
      turnCounterRef.current = 0;
      startNewTurn(g);
    },
    [startNewTurn, registry],
  );

  return {
    game,
    drawn,
    chosen,
    needsTarget,
    winningLine,
    selectCell,
    chooseCard,
    registryMeta,
    resetMatch,
    currentOptions: optionsRef.current,
    // Domain-aware cell enablement: only enable clicks that the chosen card would accept
    isCellEnabled: (p: Point) => {
      if (!chosen || !needsTarget) return false;
      const def = registry.require(chosen);
      if (def.target.kind !== 'cell') return false;
      const mc: MatchContext = {
        board: game.board,
        currentPlayer: game.currentPlayer,
        skipNextTurns: game.status.skipNextTurns,
      };
      const res = def.validateTarget(mc, { kind: 'cell', point: p } as never);
      return res.ok;
    },
    isBotTurn: optionsRef.current.opponent === 'bot' && game.currentPlayer === 2,
    turnLogs,
  } as const;
}

export default useMatch;
