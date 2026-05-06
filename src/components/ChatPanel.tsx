'use client';

import type { ReactNode } from 'react';

interface ChatPanelProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function ChatPanel({ title, open, onClose, children, wide }: ChatPanelProps) {
  if (!open) return null;

  const widthClass = wide ? 'w-[48rem] max-w-[90vw]' : 'w-96 max-w-[90vw]';

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full ${widthClass} bg-stone-50 shadow-xl z-50 flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h2 className="font-semibold text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
