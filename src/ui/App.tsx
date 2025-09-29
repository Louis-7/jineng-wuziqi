import React, { useEffect, useState } from 'react';
import { Board } from './components/Board';
import { StatusBar } from './components/StatusBar';
import { TurnPanel } from './components/TurnPanel';
import { useMatch, type MatchOptions } from './useMatch';
import { NewMatchModal } from './components/modals/NewMatchModal';
import { HelpModal } from './components/modals/HelpModal';
import { SettingsModal, type BoardTheme } from './components/modals/SettingsModal';

export default function App() {
  const {
    game,
    drawn,
    chosen,
    needsTarget,
    winningLine,
    selectCell,
    chooseCard,
    registryMeta,
    resetMatch,
    currentOptions,
    isCellEnabled,
  } = useMatch({
    boardSize: 15,
    firstPlayer: 1,
    seed: 'demo',
    policy: 'attacker',
  });

  const [showNewMatch, setShowNewMatch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('boardTheme');
      if (stored === 'modern' || stored === 'classic') return stored;
    }
    return 'modern';
  });

  // Persist theme
  useEffect(() => {
    try {
      window.localStorage.setItem('boardTheme', boardTheme);
    } catch {
      // ignore quota errors
    }
  }, [boardTheme]);

  return (
    <div className="min-h-full p-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jineng Wuziqi</h1>
          <p className="text-sm text-gray-600">Gomoku + Cards (MVP demo)</p>
        </div>
        {/* Placeholder for Modals (new match, help) */}
        <div className="flex gap-2">
          <button
            className="text-sm px-3 py-1.5 rounded border border-stone-300"
            onClick={() => setShowNewMatch(true)}
          >
            New Match
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded border border-stone-300"
            onClick={() => setShowSettings(true)}
          >
            Settings
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded border border-stone-300"
            onClick={() => setShowHelp(true)}
          >
            Help
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-6 items-start">
        <section className="justify-self-center">
          <Board
            board={game.board}
            lastMove={game.board.lastMove}
            winningLine={winningLine}
            onCellClick={(p) => {
              selectCell(p);
            }}
            isCellEnabled={(p) => !game.winner && needsTarget && isCellEnabled(p)}
            theme={boardTheme}
          />
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <StatusBar game={game} />
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <TurnPanel
              drawn={drawn}
              registryMeta={registryMeta}
              chosen={chosen}
              onChoose={chooseCard}
              needsTarget={needsTarget}
              disabled={Boolean(game.winner)}
            />
          </div>
        </aside>
      </main>

      <NewMatchModal
        open={showNewMatch}
        onClose={() => setShowNewMatch(false)}
        onStart={(opts: MatchOptions) => {
          resetMatch(opts);
          setShowNewMatch(false);
        }}
        defaults={{
          boardSize: currentOptions.boardSize,
          firstPlayer: currentOptions.firstPlayer,
          seed: String(currentOptions.seed),
          policy: currentOptions.policy,
        }}
      />

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        theme={boardTheme}
        onChangeTheme={(t) => setBoardTheme(t)}
      />
    </div>
  );
}
