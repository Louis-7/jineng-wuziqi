import React, { useEffect, useState, useMemo } from 'react';
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
    isBotTurn,
    turnLogs,
  } = useMatch({
    boardSize: 15,
    firstPlayer: 1,
    seed: 'demo',
    policy: 'attacker',
    opponent: 'human',
  });

  const showLogs = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('log') === 'true';
  }, []);

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
            {isBotTurn && !game.winner && (
              <div className="mt-2 text-xs text-indigo-600 animate-pulse">AI thinking...</div>
            )}
          </div>
          {showLogs && (
            <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm max-h-72 overflow-auto text-xs">
              <h3 className="font-semibold mb-1">Turn Log</h3>
              <ul className="space-y-2">
                {turnLogs.map((t) => (
                  <li key={t.turn} className="border-b last:border-b-0 pb-1">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        Turn {t.turn} – P{t.player} {t.bot ? '(AI)' : '(Human)'}
                      </span>
                      {t.entries.some((e) => e.tag === 'checkWin') && <span>✔</span>}
                    </div>
                    <ul className="mt-0.5">
                      {t.entries.map((e) => (
                        <li key={e.at} className="leading-snug">
                          <span className="text-stone-500">[{e.tag}]</span> {e.message}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
                {turnLogs.length === 0 && <li className="italic text-stone-500">No turns yet.</li>}
              </ul>
            </div>
          )}
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
          opponent: currentOptions.opponent,
          botStrategyId: currentOptions.botStrategyId,
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
