'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { sendMessage } from '@/lib/llm-client';
import { RESULTS_SYSTEM_PROMPT, buildResultsMessages } from '@/lib/prompts';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { WizardNav } from '@/components/WizardNav';

export default function ResultsPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [followUpMessages, setFollowUpMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const rankedQualities = state.rankingState.sortedResult || [];

  useEffect(() => {
    if (state.wizardStep !== 'results') {
      router.replace('/');
      return;
    }

    if (!initializedRef.current && !state.results) {
      initializedRef.current = true;
      generateAdvice();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.results, streamingContent, followUpMessages]);

  async function generateAdvice() {
    setStreaming(true);
    let content = '';

    try {
      const messages = buildResultsMessages(state.chatMessages, rankedQualities);
      for await (const chunk of sendMessage({
        provider: state.provider,
        apiKey: state.apiKey,
        systemPrompt: RESULTS_SYSTEM_PROMPT,
        messages,
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      dispatch({ type: 'SET_RESULTS', results: content });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
      dispatch({
        type: 'SET_RESULTS',
        results: `Error generating advice: ${errorMsg}`,
      });
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  async function handleFollowUp(text: string) {
    const userMsg = { role: 'user' as const, content: text };
    setFollowUpMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    let content = '';

    try {
      const allMessages = [
        ...buildResultsMessages(state.chatMessages, rankedQualities),
        { role: 'assistant' as const, content: state.results },
        ...followUpMessages,
        userMsg,
      ];

      for await (const chunk of sendMessage({
        provider: state.provider,
        apiKey: state.apiKey,
        systemPrompt: RESULTS_SYSTEM_PROMPT,
        messages: allMessages,
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      setFollowUpMessages((prev) => [
        ...prev,
        { role: 'assistant', content },
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
      setFollowUpMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${errorMsg}` },
      ]);
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex max-w-5xl mx-auto w-full px-4 gap-6 py-4">
        {/* Ranked qualities sidebar */}
        <aside className="w-64 shrink-0 hidden md:block">
          <div className="sticky top-4 bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Your Rankings</h3>
            <ol className="space-y-1.5">
              {rankedQualities.map((q, i) => (
                <li key={q} className="flex gap-2 text-sm">
                  <span className="text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                  <span className={i < 5 ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                    {q}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto space-y-1">
            {state.results && (
              <ChatMessage message={{ role: 'assistant', content: state.results }} />
            )}
            {!state.results && streaming && streamingContent && (
              <ChatMessage message={{ role: 'assistant', content: streamingContent }} />
            )}
            {followUpMessages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {state.results && streaming && streamingContent && (
              <ChatMessage message={{ role: 'assistant', content: streamingContent }} />
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4">
            <ChatInput
              onSend={handleFollowUp}
              disabled={streaming}
              placeholder="Ask a follow-up question..."
            />
          </div>
        </div>
      </div>
    </main>
  );
}
