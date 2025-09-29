import React from 'react';
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
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t('panel.drawn')}</div>
      <div className="flex gap-2">
        {(() => {
          // Build stable occurrence counts to ensure unique keys even for duplicate IDs
          const seen = new Map<string, number>();
          return drawn.map((id, i) => {
            const count = (seen.get(id) ?? 0) + 1;
            seen.set(id, count);
            const meta = registryMeta[id] ?? { name: id, description: id };
            const isI18nKey = (s: string) => s.startsWith('card.');
            const displayName = isI18nKey(meta.name) ? t(meta.name) : meta.name;
            const displayDesc = isI18nKey(meta.description)
              ? t(meta.description)
              : meta.description;
            const isChosen = id === chosen;
            const key = `${id}-${count}-${i}`; // includes occurrence + position for uniqueness & stability within turn
            return (
              <button
                key={key}
                onClick={() => {
                  if (!disabled) onChoose(id);
                }}
                className={[
                  'px-3 py-2 rounded-md border text-left shadow-sm',
                  isChosen ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-stone-300',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-50',
                ].join(' ')}
                aria-pressed={isChosen}
                disabled={disabled}
                title={displayDesc}
              >
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span>{meta.icon ?? '🂠'}</span>
                  <span>{displayName}</span>
                </div>
                <div className="text-xs text-stone-600 max-w-[12rem]">{displayDesc}</div>
              </button>
            );
          });
        })()}
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
