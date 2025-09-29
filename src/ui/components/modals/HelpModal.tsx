import React from 'react';
import { useTranslation } from 'react-i18next';

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-[90vw] max-w-lg rounded-md bg-white p-4 shadow-lg border border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{t('help.title')}</h2>
          <button className="text-sm px-2 py-1 rounded border border-stone-300" onClick={onClose}>
            {t('help.close')}
          </button>
        </div>
        <div className="prose prose-sm max-w-none">
          <p>{t('help.p1')}</p>
          <ul>
            <li>{t('help.li1')}</li>
            <li>{t('help.li2')}</li>
            <li>{t('help.li3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
