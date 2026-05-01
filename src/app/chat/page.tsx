'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, areAllStepsComplete } from '@/context/SessionContext';
import { sendMessage } from '@/lib/llm-client';
import { buildChatSystemPrompt, CHAT_KICKOFF_MESSAGE } from '@/lib/prompts';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';


export default function ChatPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const systemPrompt = buildChatSystemPrompt(state.questionResponses, state.rankingState.sortedResult || [], state.resumeText);

  async function generateInitialAdvice() {
    setStreaming(true);
    let content = '';

    try {
      for await (const chunk of sendMessage({
        provider: state.provider,
        apiKey: state.apiKey,
        systemPrompt,
        messages: [CHAT_KICKOFF_MESSAGE],
      })) {
        content += chunk;
        setStreamingContent(content);
      }

      dispatch({ type: 'ADD_CHAT_MESSAGE', message: CHAT_KICKOFF_MESSAGE });
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

  useEffect(() => {
    if (!areAllStepsComplete(state) || !state.apiKey) {
      router.replace(state.wizardStep === 'setup' ? '/' : '/next-steps');
      return;
    }

    if (!initializedRef.current && state.chatMessages.length === 0) {
      initializedRef.current = true;
      generateInitialAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages, streamingContent]);

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
        systemPrompt,
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

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-4">
        <div className="flex-1 overflow-y-auto space-y-1">
          {state.chatMessages
            .filter((msg) => !(msg.role === 'user' && msg.content === CHAT_KICKOFF_MESSAGE.content))
            .map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
          {streaming && streamingContent && (
            <ChatMessage message={{ role: 'assistant', content: streamingContent }} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-stone-50 pt-2 pb-4">
          <ChatInput
            onSend={handleSend}
            disabled={streaming}
            placeholder="Ask a follow-up question..."
          />
        </div>
      </div>
    </main>
  );
}
