import React from 'react';

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-[90vw] max-w-lg rounded-md bg-white p-4 shadow-lg border border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Help</h2>
          <button className="text-sm px-2 py-1 rounded border border-stone-300" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="prose prose-sm max-w-none">
          <p>
            Place five stones in a row (horizontal, vertical, or diagonal) to win. Use skill cards
            to place, remove, freeze turns, invert polarity, or spawn stones.
          </p>
          <ul>
            <li>
              Draw two cards at start of your turn, choose one to play; the other is discarded.
            </li>
            <li>Some cards require selecting a target cell; follow the on-screen prompt.</li>
            <li>
              If both players complete five simultaneously, the winner is determined by the selected
              policy.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
