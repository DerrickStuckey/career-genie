'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { sendMessage } from '@/lib/llm-client';
import { buildQuestionSystemPrompt } from '@/lib/prompts';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { WizardNav } from '@/components/WizardNav';

export default function QuestionsPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const firstIncomplete = state.questionResponses.findIndex((qr) => !qr.isComplete);
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentQuestion = state.questionResponses[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === state.questionResponses.length - 1;
  const hasUserMessage = currentQuestion.messages.some((m) => m.role === 'user');

  useEffect(() => {
    if (state.wizardStep === 'setup') {
      router.replace('/');
    }
  }, [state.wizardStep, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentQuestion.messages, streamingContent]);

  async function handleSend(text: string) {
    const userMessage = { role: 'user' as const, content: text };
    dispatch({
      type: 'ADD_QUESTION_MESSAGE',
      questionId: currentQuestionIndex,
      message: userMessage,
    });

    const allMessages = [...currentQuestion.messages, userMessage];
    setStreaming(true);
    let content = '';

    try {
      for await (const chunk of sendMessage({
        provider: state.provider,
        apiKey: state.apiKey,
        systemPrompt: buildQuestionSystemPrompt(currentQuestion.question),
        messages: allMessages,
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      dispatch({
        type: 'ADD_QUESTION_MESSAGE',
        questionId: currentQuestionIndex,
        message: { role: 'assistant', content },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
      dispatch({
        type: 'ADD_QUESTION_MESSAGE',
        questionId: currentQuestionIndex,
        message: { role: 'assistant', content: `Error: ${errorMsg}` },
      });
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  function handleNextQuestion() {
    dispatch({ type: 'SET_QUESTION_COMPLETE', questionId: currentQuestionIndex });
    if (isLastQuestion) {
      dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
      router.push('/hub');
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4">
        <div className="py-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 mb-1">
            Question {currentQuestionIndex + 1} of {state.questionResponses.length}
          </p>
          <h2 className="text-lg font-semibold text-gray-900">{currentQuestion.question}</h2>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1">
          {currentQuestion.messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {streaming && streamingContent && (
            <ChatMessage message={{ role: 'assistant', content: streamingContent }} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4 space-y-3">
          <ChatInput onSend={handleSend} disabled={streaming} placeholder="Type your answer..." />
          <button
            onClick={handleNextQuestion}
            disabled={!hasUserMessage || streaming}
            className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
              hasUserMessage && !streaming
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLastQuestion ? 'Finish Questions' : 'Next Question →'}
          </button>
        </div>
      </div>
    </main>
  );
}
