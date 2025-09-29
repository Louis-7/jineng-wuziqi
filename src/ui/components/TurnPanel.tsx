import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CardId } from '../../domain/deck';
import type { AnyCardDefinition } from '../../domain/cards';

export interface TurnPanelProps {
  drawn: CardId[];
  registryMeta: Record<CardId, AnyCardDefinition['meta']>;
  chosen?: CardId | undefined;
  onChoose: (cardId: CardId) => void;
  needsTarget: boolean;
  onTargetCell?: (x: number, y: number) => void;
  disabled?: boolean;
}

export function TurnPanel({
  drawn,
  registryMeta,
  chosen,
  onChoose,
  needsTarget,
  disabled = false,
}: TurnPanelProps) {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState<string | undefined>();

  // Precompute frequency + entries with stable keys
  interface Entry {
    id: CardId;
    key: string;
    count: number;
    total: number;
  }
  const entries: Entry[] = React.useMemo(() => {
    const freq: Record<string, number> = {};
    drawn.forEach((id) => {
      freq[id] = (freq[id] ?? 0) + 1;
    });
    const seen = new Map<string, number>();
    return drawn.map((id, i) => {
      const count = (seen.get(id) ?? 0) + 1;
      seen.set(id, count);
      const key = `${id}-${count}-${i}`; // unique per instance this turn
      const total = freq[id] ?? 0; // freq built above guarantees presence, fallback for TS
      return { id, key, count, total };
    });
  }, [drawn]);

  // Keep selectedKey aligned with chosen card from above layers / AI
  useEffect(() => {
    if (!chosen) {
      setSelectedKey(undefined);
      return;
    }
    const chosenKeys = entries.filter((e) => e.id === chosen).map((e) => e.key);
    if (chosenKeys.length === 0) {
      setSelectedKey(undefined);
      return;
    }
    if (!selectedKey || !chosenKeys.includes(selectedKey)) {
      setSelectedKey(chosenKeys[0]);
    }
  }, [chosen, entries, selectedKey]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t('panel.drawn')}</div>
      <div className="flex gap-3">
        {entries.map((e) => {
          const meta = registryMeta[e.id] ?? { name: e.id, description: e.id };
          const isI18nKey = (s: string) => s.startsWith('card.');
          const displayName = isI18nKey(meta.name) ? t(meta.name) : meta.name;
          const displayDesc = isI18nKey(meta.description) ? t(meta.description) : meta.description;
          const baseChosen = e.id === chosen;
          const highlight = baseChosen && (e.total === 1 || selectedKey === e.key);
          return (
            <button
              key={e.key}
              onClick={() => {
                if (disabled) return;
                setSelectedKey(e.key);
                onChoose(e.id);
              }}
              className={[
                'relative w-32 h-40 flex flex-col justify-between rounded-lg border bg-white text-left shadow-sm transition-all duration-150',
                'p-3 overflow-hidden',
                highlight
                  ? 'border-indigo-500 ring-2 ring-indigo-400 shadow-md'
                  : 'border-stone-300 hover:border-stone-400 hover:shadow',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
              aria-pressed={highlight}
              disabled={disabled}
              title={displayDesc}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none" aria-hidden="true">
                  {meta.icon ?? '🂠'}
                </span>
                <span className="text-sm font-semibold leading-snug line-clamp-2">
                  {displayName}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-stone-600 leading-snug h-16 overflow-hidden">
                {displayDesc}
              </div>
              {e.total > 1 && (
                <span className="absolute top-1 right-1 bg-stone-200 text-[10px] rounded px-1 py-0.5 font-medium text-stone-700">
                  {e.count}/{e.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="text-xs text-stone-700">
          {t('panel.chosen')}:{' '}
          <strong>
            {(() => {
              const n = registryMeta[chosen]?.name ?? chosen;
              return n.startsWith('card.') ? t(n) : n;
            })()}
          </strong>
          {needsTarget
            ? ` ${t('panel.chosen.targetPrompt')}`
            : ` ${t('panel.chosen.autoResolves')}`}
        </div>
      )}
      {disabled && <div className="text-xs text-stone-600">{t('panel.gameOver')}</div>}
    </div>
  );
}

export default TurnPanel;
