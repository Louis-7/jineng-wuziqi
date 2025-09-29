import React, { useEffect, useState } from 'react';

export type BoardTheme = 'modern' | 'classic';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: BoardTheme;
  onChangeTheme: (t: BoardTheme) => void;
}

/**
 * Settings modal (MVP): currently only exposes Board Theme selection.
 * Persistence will be added alongside wider settings per TODO #9.
 */
export function SettingsModal({ open, onClose, theme, onChangeTheme }: SettingsModalProps) {
  const [localTheme, setLocalTheme] = useState<BoardTheme>(theme);

  useEffect(() => {
    if (open) setLocalTheme(theme);
  }, [open, theme]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-[90vw] max-w-md rounded-md bg-white p-4 shadow-lg border border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button className="text-sm px-2 py-1 rounded border border-stone-300" onClick={onClose}>
            Close
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onChangeTheme(localTheme);
            onClose();
          }}
        >
          <fieldset className="text-sm">
            <legend className="font-medium mb-2">Board Theme</legend>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: 'modern', label: 'Modern', desc: 'Light neutral' },
                  { id: 'classic', label: 'Classic', desc: 'Wooden' },
                ] as const
              ).map((t) => {
                const active = localTheme === t.id;
                return (
                  <label
                    key={t.id}
                    className={
                      'cursor-pointer rounded border p-2 flex flex-col gap-2 focus-within:ring-2 focus-within:ring-indigo-400 ' +
                      (active ? 'border-indigo-500 ring-1 ring-indigo-400' : 'border-stone-300')
                    }
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="board-theme"
                      value={t.id}
                      checked={active}
                      onChange={() => setLocalTheme(t.id as BoardTheme)}
                    />
                    <div className="text-xs font-medium flex items-center justify-between">
                      <span>
                        {t.label}
                        <span className="ml-1 font-normal text-[10px] text-stone-500">
                          {t.desc}
                        </span>
                      </span>
                      {active && <span className="text-[10px] text-indigo-600">Selected</span>}
                    </div>
                    {/* mini preview */}
                    <div className="relative h-16 w-full overflow-hidden rounded">
                      {t.id === 'modern' ? (
                        <div className="h-full w-full bg-stone-100 grid grid-cols-5 grid-rows-5">
                          {Array.from({ length: 25 }, (_, i) => (
                            <div
                              key={i}
                              className="border border-stone-300/60"
                              style={{ borderWidth: 0.5 }}
                            />
                          ))}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-5 w-5 rounded-full bg-black shadow" />
                            <div className="h-5 w-5 rounded-full bg-white border border-stone-300 ml-2" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full" style={{ background: '#d6b38a' }}>
                          <div className="grid grid-cols-5 grid-rows-5 h-full w-full">
                            {Array.from({ length: 25 }, (_, i) => (
                              <div
                                key={i}
                                className="border"
                                style={{ borderColor: '#8b5e34', borderWidth: 0.5 }}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="h-5 w-5 rounded-full"
                              style={{
                                background: 'radial-gradient(circle at 35% 35%, #4a4a4a, #000)',
                              }}
                            />
                            <div
                              className="h-5 w-5 rounded-full ml-2 border"
                              style={{
                                background: 'radial-gradient(circle at 35% 35%, #fff, #cfcfcf)',
                                borderColor: '#b5b5b5',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="text-sm px-3 py-1.5 rounded border border-stone-300"
              onClick={() => setLocalTheme(theme)}
            >
              Reset
            </button>
            <button type="submit" className="text-sm px-3 py-1.5 rounded bg-indigo-600 text-white">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsModal;
