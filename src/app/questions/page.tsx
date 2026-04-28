'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';


type Phase = 'answer' | 'why';

export default function QuestionsPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const firstIncomplete = state.questionResponses.findIndex((qr) => !qr.isComplete);
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  const [phase, setPhase] = useState<Phase>('answer');
  const [inputValue, setInputValue] = useState('');
  const [prevInputKey, setPrevInputKey] = useState('0-answer');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentQuestion = state.questionResponses[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === state.questionResponses.length - 1;

  const inputKey = `${currentQuestionIndex}-${phase}`;
  if (prevInputKey !== inputKey) {
    setPrevInputKey(inputKey);
    if (currentQuestion.answer && phase === 'answer') {
      setInputValue(currentQuestion.answer);
    } else if (currentQuestion.whyAnswer && phase === 'why') {
      setInputValue(currentQuestion.whyAnswer);
    } else {
      setInputValue('');
    }
  }

  useEffect(() => {
    if (state.wizardStep === 'setup') {
      router.replace('/');
    }
  }, [state.wizardStep, router]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentQuestionIndex, phase]);

  function handleSubmitAnswer() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    dispatch({ type: 'SET_QUESTION_ANSWER', questionId: currentQuestionIndex, answer: trimmed });
    setInputValue('');
    setPhase('why');
  }

  function handleSubmitWhy() {
    const trimmed = inputValue.trim();
    if (trimmed) {
      dispatch({ type: 'SET_QUESTION_WHY', questionId: currentQuestionIndex, whyAnswer: trimmed });
    }
    advanceQuestion();
  }

  function handleSkipWhy() {
    advanceQuestion();
  }

  function advanceQuestion() {
    dispatch({ type: 'SET_QUESTION_COMPLETE', questionId: currentQuestionIndex });
    if (isLastQuestion) {
      dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
      router.push('/hub');
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setPhase('answer');
      setInputValue('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (phase === 'answer') {
        handleSubmitAnswer();
      } else {
        handleSubmitWhy();
      }
    }
  }

  return (
    <main className="min-h-screen flex flex-col">

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4">
        <div className="py-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 mb-1">
            Question {currentQuestionIndex + 1} of {state.questionResponses.length}
          </p>
          <h2 className="text-lg font-semibold text-gray-900">{currentQuestion.question}</h2>
        </div>

        <div className="py-6 space-y-6">
          {phase === 'answer' && (
            <>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!inputValue.trim()}
                className={`w-full rounded-xl py-3 text-sm font-medium transition-all ${
                  inputValue.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </>
          )}

          {phase === 'why' && (
            <>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Your answer:</span> {currentQuestion.answer}
                </p>
              </div>
              <p className="text-base font-medium text-gray-900">Why?</p>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell us why... (optional)"
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSkipWhy}
                  className="flex-1 rounded-xl py-3 text-sm font-medium text-gray-600 border border-gray-300 hover:border-gray-400 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitWhy}
                  className="flex-1 rounded-xl py-3 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {isLastQuestion ? 'Finish Questions' : 'Next Question'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
