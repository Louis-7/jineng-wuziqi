import React from 'react';
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
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Drawn</div>
      <div className="flex gap-2">
        {drawn.map((id, i) => {
          const meta = registryMeta[id] ?? { name: id, description: id };
          const isChosen = id === chosen;
          return (
            <button
              key={id + '-' + String(i)}
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
              title={meta.description}
            >
              <div className="text-sm font-semibold flex items-center gap-2">
                <span>{meta.icon ?? '🂠'}</span>
                <span>{meta.name}</span>
              </div>
              <div className="text-xs text-stone-600 max-w-[12rem]">{meta.description}</div>
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="text-xs text-stone-700">
          Chosen: <strong>{registryMeta[chosen]?.name ?? chosen}</strong>
          {needsTarget ? ' — pick a target on the board' : ' — auto-resolves'}
        </div>
      )}
      {disabled && (
        <div className="text-xs text-stone-600">Game over — start a new match to play again.</div>
      )}
    </div>
  );
}

export default TurnPanel;
