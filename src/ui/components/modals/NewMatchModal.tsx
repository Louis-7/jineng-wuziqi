import React, { useEffect, useState } from 'react';
import type { MatchOptions } from '../../useMatch';

export interface NewMatchModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (opts: MatchOptions) => void;
  defaults: Required<Omit<MatchOptions, 'deck'>>;
}

export function NewMatchModal({ open, onClose, onStart, defaults }: NewMatchModalProps) {
  const [boardSize, setBoardSize] = useState<number>(defaults.boardSize);
  const [firstPlayer, setFirstPlayer] = useState<number>(defaults.firstPlayer);
  const [seed, setSeed] = useState<string>(String(defaults.seed));
  const [policy, setPolicy] = useState<'attacker' | 'draw'>(defaults.policy);

  // When modal opens, refresh fields from provided defaults
  useEffect(() => {
    if (open) {
      // Board size and first player are kept internal; hidden from UI
      setBoardSize(defaults.boardSize);
      setFirstPlayer(defaults.firstPlayer);
      // Randomize seed every time the modal opens
      const randSeed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      setSeed(randSeed);
      setPolicy(defaults.policy);
    }
  }, [open, defaults]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-[90vw] max-w-2xl rounded-md bg-white p-4 shadow-lg border border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">New Match</h2>
          <button className="text-sm px-2 py-1 rounded border border-stone-300" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Board Size hidden per requirements
          <label className="text-sm flex flex-col gap-1">
            <span>Board Size</span>
            <input type="number" min={5} max={25} step={1} value={boardSize} onChange={(e) => setBoardSize(Number(e.target.value))} className="rounded border border-stone-300 px-2 py-1" />
          </label>
          */}

          {/* First Player hidden per requirements
          <label className="text-sm flex flex-col gap-1">
            <span>First Player</span>
            <select value={firstPlayer} onChange={(e) => setFirstPlayer(Number(e.target.value))} className="rounded border border-stone-300 px-2 py-1">
              <option value={1}>Player 1</option>
              <option value={2}>Player 2</option>
            </select>
          </label>
          */}

          <label className="text-sm flex flex-col gap-1">
            <span>Seed</span>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="rounded border border-stone-300 px-2 py-1"
            />
          </label>

          <label className="text-sm flex flex-col gap-1">
            <span>Simultaneous Five Policy</span>
            <select
              value={policy}
              onChange={(e) => setPolicy(e.target.value as 'attacker' | 'draw')}
              className="rounded border border-stone-300 px-2 py-1"
            >
              <option value="attacker">Attacker wins</option>
              <option value="draw">Draw</option>
            </select>
          </label>
        </div>

        <div className="mt-4 text-xs text-stone-600">
          Deck will be generated deterministically from the seed.
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="text-sm px-3 py-1.5 rounded border border-stone-300"
            onClick={() => {
              setBoardSize(defaults.boardSize);
              setFirstPlayer(defaults.firstPlayer);
              // Reset to a fresh random seed as per UX guidance
              const randSeed = `${Date.now().toString(36)}-${Math.random()
                .toString(36)
                .slice(2, 10)}`;
              setSeed(randSeed);
              setPolicy(defaults.policy);
            }}
          >
            Reset to defaults
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded bg-indigo-600 text-white"
            onClick={() => {
              const opts: MatchOptions = {
                boardSize,
                firstPlayer: firstPlayer as 1 | 2,
                seed,
                policy,
              };
              onStart(opts);
            }}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewMatchModal;
