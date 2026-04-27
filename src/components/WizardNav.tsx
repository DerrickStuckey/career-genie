'use client';

import { useSession, areQuestionsComplete, isRankingComplete } from '@/context/SessionContext';
import type { WizardStep } from '@/types';

const STEPS: { key: string; label: string }[] = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'discover', label: 'Discover' },
  { key: 'results', label: 'Results' },
];

function getStepIndex(wizardStep: WizardStep): number {
  if (wizardStep === 'setup') return 0;
  if (wizardStep === 'hub' || wizardStep === 'questions' || wizardStep === 'rank') return 1;
  return 2;
}

export function WizardNav() {
  const { state } = useSession();
  const currentIndex = getStepIndex(state.wizardStep);
  const questionsComplete = areQuestionsComplete(state);
  const rankingComplete = isRankingComplete(state);

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
            {step.key === 'discover' && i === currentIndex && (
              <span className="text-xs opacity-75 ml-1">
                ({[questionsComplete && 'Q', rankingComplete && 'R'].filter(Boolean).join(', ') || '...'})
              </span>
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${i < currentIndex ? 'bg-blue-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </nav>
  );
}
