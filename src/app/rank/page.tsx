'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { RankingEngine } from '@/lib/ranking';
import { RankingCard } from '@/components/RankingCard';
import { ProgressBar } from '@/components/ProgressBar';
import { WizardNav } from '@/components/WizardNav';

export default function RankPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();

  const [engineState] = useState(() => {
    const engine = new RankingEngine(state.rankingState.items);
    return {
      engine,
      total: engine.getTotalEstimate(),
      initialPair: engine.isComplete() ? null : engine.getCurrentPair(),
    };
  });

  const engineRef = useRef(engineState.engine);
  const [currentPair, setCurrentPair] = useState(engineState.initialPair);
  const [completed, setCompleted] = useState(0);
  const total = engineState.total;

  function finishRanking(engine: RankingEngine) {
    const result = engine.getResult();
    if (result) {
      dispatch({
        type: 'SET_RANKING_STATE',
        rankingState: {
          sortedResult: result,
          completedComparisons: engine.getCompletedCount(),
        },
      });
      dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
      router.push('/hub');
    }
  }

  useEffect(() => {
    if (state.wizardStep !== 'rank') {
      router.replace('/');
      return;
    }

    if (engineRef.current.isComplete()) {
      finishRanking(engineRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChoice(winner: string) {
    const engine = engineRef.current;
    if (!engine) return;

    engine.recordChoice(winner);
    setCompleted(engine.getCompletedCount());

    if (engine.isComplete()) {
      finishRanking(engine);
    } else {
      setCurrentPair(engine.getCurrentPair());
    }
  }

  if (!currentPair) {
    return (
      <main className="min-h-screen flex flex-col">
        <WizardNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading rankings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full">
        <div className="w-full mb-8">
          <ProgressBar current={completed} total={total} />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Which matters more to you?
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Click the one that&apos;s more important in your ideal job
        </p>

        <div className="flex gap-4 w-full">
          <RankingCard
            quality={currentPair[0]}
            onClick={() => handleChoice(currentPair[0])}
            side="left"
          />
          <RankingCard
            quality={currentPair[1]}
            onClick={() => handleChoice(currentPair[1])}
            side="right"
          />
        </div>
      </div>
    </main>
  );
}
