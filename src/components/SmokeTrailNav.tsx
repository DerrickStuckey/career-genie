'use client';

import Image from 'next/image';
import { useSession, areQuestionsComplete, isRankingComplete } from '@/context/SessionContext';
import type { WizardStep } from '@/types';

function isCoachingStage(step: WizardStep): boolean {
  return step === 'next-steps' || step === 'chat';
}

export function SmokeTrailNav() {
  const { state } = useSession();
  const questionsComplete = areQuestionsComplete(state);
  const rankingComplete = isRankingComplete(state);
  const coaching = isCoachingStage(state.wizardStep);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex sticky top-0 h-screen w-24 shrink-0 flex-col items-center justify-center overflow-visible">
        {coaching ? (
          <div className="transition-opacity duration-700 opacity-100 translate-x-10">
            <Image src="/genie.png" alt="" width={80} height={136} className="w-20 h-auto" />
          </div>
        ) : (
          <>
            {/* Puff 2: ranking complete */}
            <div className={`translate-x-10 transition-all duration-500 ${rankingComplete ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <Image src="/smoke-puff.png" alt="" width={36} height={60} className="w-9 h-auto" />
            </div>

            {/* Puff 1: questions complete */}
            <div className={`translate-x-10 transition-all duration-500 ${questionsComplete ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <Image src="/smoke-puff.png" alt="" width={36} height={60} className="w-9 h-auto" />
            </div>
          </>
        )}

        {/* Lamp (bottom) — always visible */}
        <div className="mt-1">
          <Image src="/lamp.png" alt="Career Genie" width={88} height={56} className="w-22 h-auto" />
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden flex items-center justify-center gap-3 py-3 px-4 border-b border-stone-200">
        <Image src="/lamp.png" alt="Career Genie" width={48} height={30} className="w-12 h-auto" />
        {coaching ? (
          <div className="transition-opacity duration-700 opacity-100">
            <Image src="/genie.png" alt="" width={32} height={52} className="w-8 h-auto" />
          </div>
        ) : (
          <>
            <div className={`transition-all duration-500 ${questionsComplete ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <Image src="/smoke-puff.png" alt="" width={24} height={40} className="w-6 h-auto" />
            </div>
            <div className={`transition-all duration-500 ${rankingComplete ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <Image src="/smoke-puff.png" alt="" width={24} height={40} className="w-6 h-auto" />
            </div>
          </>
        )}
      </nav>
    </>
  );
}
