'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, isStep3Available } from '@/context/SessionContext';
import { sendMessage } from '@/lib/llm-client';
import { CHAT_SYSTEM_PROMPT, buildChatContextMessages } from '@/lib/prompts';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { WizardNav } from '@/components/WizardNav';

export default function ChatPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const rankedQualities = state.rankingState.sortedResult || [];

  useEffect(() => {
    if (!isStep3Available(state)) {
      router.replace(state.wizardStep === 'setup' ? '/' : '/hub');
      return;
    }

    if (!initializedRef.current && state.chatMessages.length === 0) {
      initializedRef.current = true;
      generateInitialAdvice();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages, streamingContent]);

  async function generateInitialAdvice() {
    setStreaming(true);
    let content = '';

    try {
      const contextMessages = buildChatContextMessages(state.questionResponses, rankedQualities);
      for await (const chunk of sendMessage({
        provider: state.provider,
        apiKey: state.apiKey,
        systemPrompt: CHAT_SYSTEM_PROMPT,
        messages: contextMessages,
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      for (const msg of contextMessages) {
        dispatch({ type: 'ADD_CHAT_MESSAGE', message: msg });
      }
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'assistant', content },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'assistant', content: `Error generating advice: ${errorMsg}` },
      });
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  async function handleSend(text: string) {
    const userMessage = { role: 'user' as const, content: text };
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: userMessage });

    const allMessages = [...state.chatMessages, userMessage];
    setStreaming(true);
    let content = '';

    try {
      for await (const chunk of sendMessage({
        provider: state.provider,
        apiKey: state.apiKey,
        systemPrompt: CHAT_SYSTEM_PROMPT,
        messages: allMessages,
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'assistant', content },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'assistant', content: `Error: ${errorMsg}` },
      });
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex max-w-5xl mx-auto w-full px-4 gap-6 py-4">
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

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto space-y-1">
            {state.chatMessages
              .filter((msg) => !(msg.role === 'user' && msg.content.startsWith('Here are my answers')))
              .map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
            {streaming && streamingContent && (
              <ChatMessage message={{ role: 'assistant', content: streamingContent }} />
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4">
            <ChatInput
              onSend={handleSend}
              disabled={streaming}
              placeholder="Ask a follow-up question..."
            />
          </div>
        </div>
      </div>
    </main>
  );
}
