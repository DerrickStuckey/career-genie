'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { sendMessage } from '@/lib/llm-client';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { WizardNav } from '@/components/WizardNav';

const READY_MARKER = '[READY]';

export default function ChatPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (state.wizardStep !== 'chat') {
      router.replace('/');
      return;
    }

    if (!initializedRef.current && state.chatMessages.length === 0) {
      initializedRef.current = true;
      sendInitialMessage();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages, streamingContent]);

  async function sendInitialMessage() {
    setStreaming(true);
    let content = '';

    try {
      for await (const chunk of sendMessage({
        provider: state.provider,
        apiKey: state.apiKey,
        systemPrompt: state.systemPrompt,
        messages: [{ role: 'user', content: 'Hi, I\'m ready to start my career coaching session.' }],
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      const hasReady = content.includes(READY_MARKER);
      const cleanContent = content.replace(READY_MARKER, '').trim();

      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'user', content: 'Hi, I\'m ready to start my career coaching session.' },
      });
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'assistant', content: cleanContent },
      });

      if (hasReady) dispatch({ type: 'SET_READY', isReady: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect';
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'assistant', content: `Error: ${errorMsg}. Please go back and check your API key.` },
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
        systemPrompt: state.systemPrompt,
        messages: allMessages,
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      const hasReady = content.includes(READY_MARKER);
      const cleanContent = content.replace(READY_MARKER, '').trim();

      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { role: 'assistant', content: cleanContent },
      });

      if (hasReady) dispatch({ type: 'SET_READY', isReady: true });
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

  function handleContinue() {
    dispatch({ type: 'SET_WIZARD_STEP', step: 'rank' });
    router.push('/rank');
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4">
        <div className="flex-1 overflow-y-auto py-4 space-y-1">
          {state.chatMessages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {streaming && streamingContent && (
            <ChatMessage message={{ role: 'assistant', content: streamingContent }} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4 space-y-3">
          <ChatInput onSend={handleSend} disabled={streaming} />
          <button
            onClick={handleContinue}
            className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
              state.isReady
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Continue to Rankings →
          </button>
        </div>
      </div>
    </main>
  );
}
