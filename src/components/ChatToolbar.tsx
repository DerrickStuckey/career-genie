'use client';

type PanelType = 'answers' | 'rankings' | 'resume';

interface ChatToolbarProps {
  onOpenPanel: (panel: PanelType) => void;
  onDownload: () => void;
}

const BUTTONS: { panel?: PanelType; label: string; action?: 'download' }[] = [
  { panel: 'answers', label: 'Answers' },
  { panel: 'rankings', label: 'Rankings' },
  { panel: 'resume', label: 'Resume' },
  { label: 'Download .md', action: 'download' },
];

export function ChatToolbar({ onOpenPanel, onDownload }: ChatToolbarProps) {
  return (
    <div className="sticky top-0 z-10 flex gap-2 py-2 border-b border-stone-200 mb-2 bg-stone-50">
      {BUTTONS.map((btn) => (
        <button
          key={btn.label}
          onClick={() => (btn.action === 'download' ? onDownload() : onOpenPanel(btn.panel!))}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
