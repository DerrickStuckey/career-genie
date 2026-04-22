'use client';

import { useSession } from '@/context/SessionContext';
import type { WizardStep } from '@/types';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'setup', label: 'Setup' },
  { key: 'chat', label: 'Chat' },
  { key: 'rank', label: 'Rankings' },
  { key: 'results', label: 'Results' },
];

export function WizardNav() {
  const { state } = useSession();
  const currentIndex = STEPS.findIndex((s) => s.key === state.wizardStep);

  return (
    <nav className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              i === currentIndex
                ? 'bg-blue-600 text-white'
                : i < currentIndex
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-white/20">
              {i + 1}
            </span>
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${i < currentIndex ? 'bg-blue-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </nav>
  );
}
