'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, areQuestionsComplete, isRankingComplete, isStep3Available } from '@/context/SessionContext';


export default function HubPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state.wizardStep === 'setup') {
      router.replace('/');
    }
  }, [state.wizardStep, router]);

  const questionsComplete = areQuestionsComplete(state);
  const rankingComplete = isRankingComplete(state);
  const chatAvailable = isStep3Available(state);
  const questionsAnswered = state.questionResponses.filter((qr) => qr.isComplete).length;

  function goToQuestions() {
    dispatch({ type: 'SET_WIZARD_STEP', step: 'questions' });
    router.push('/questions');
  }

  function goToRanking() {
    dispatch({ type: 'SET_WIZARD_STEP', step: 'rank' });
    router.push('/rank');
  }

  function goToNextSteps() {
    dispatch({ type: 'SET_WIZARD_STEP', step: 'next-steps' });
    router.push('/next-steps');
  }

  return (
    <main className="min-h-screen flex flex-col">

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Your Career Discovery</h1>
            <p className="mt-2 text-gray-600">
              Complete both steps below in any order to unlock your personalized coaching session.
            </p>
          </div>

          <button
            onClick={goToQuestions}
            className={`w-full text-left rounded-2xl border-2 p-6 transition-colors ${
              questionsComplete
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reflection Questions</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {questionsComplete
                    ? 'All questions answered'
                    : `${questionsAnswered} of 5 questions answered`}
                </p>
              </div>
              {questionsComplete ? (
                <span className="text-green-600 text-sm font-medium">Complete</span>
              ) : (
                <span className="text-blue-600 text-sm font-medium">
                  {questionsAnswered > 0 ? 'Continue' : 'Start'} &rarr;
                </span>
              )}
            </div>
          </button>

          <button
            onClick={goToRanking}
            className={`w-full text-left rounded-2xl border-2 p-6 transition-colors ${
              rankingComplete
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Priority Ranking</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {rankingComplete
                    ? 'Rankings complete'
                    : 'Rank what matters most in your career'}
                </p>
              </div>
              {rankingComplete ? (
                <span className="text-green-600 text-sm font-medium">Complete</span>
              ) : (
                <span className="text-blue-600 text-sm font-medium">Start &rarr;</span>
              )}
            </div>
          </button>

          <button
            onClick={goToNextSteps}
            disabled={!chatAvailable}
            className={`w-full rounded-xl py-3 text-sm font-medium transition-all ${
              chatAvailable
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {chatAvailable ? 'Proceed to Coaching' : 'Complete both steps to continue'}
          </button>
        </div>
      </div>
    </main>
  );
}
