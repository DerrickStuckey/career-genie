'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, areAllStepsComplete } from '@/context/SessionContext';
import { sendMessage } from '@/lib/llm-client';
import { buildChatSystemPrompt, RESUME_FORMATTING_SYSTEM_PROMPT } from '@/lib/prompts';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { ChatToolbar } from '@/components/ChatToolbar';
import { ChatPanel } from '@/components/ChatPanel';
import { AnswersPanel } from '@/components/AnswersPanel';
import { RankingsPanel } from '@/components/RankingsPanel';
import { ResumePanel } from '@/components/ResumePanel';
import { CHAT_TOOLS, executeToolCall } from '@/lib/chat-tools';
import { buildExportMarkdown, downloadTextFile } from '@/lib/export';
import type { ChatMessage as ChatMessageType, ToolCall } from '@/types';

export default function ChatPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activePanel, setActivePanel] = useState<'answers' | 'rankings' | 'resume' | null>(null);
  const [resumeJustUpdated, setResumeJustUpdated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const systemPrompt = buildChatSystemPrompt(
    state.questionResponses,
    state.rankingState.sortedResult || [],
    state.resumeText,
    state.updatedResumeMarkdown,
  );

  const MAX_TOOL_ROUNDS = 3;

  async function runChatTurn(messages: ChatMessageType[]) {
    setStreaming(true);
    let currentRankings = state.rankingState.sortedResult || [];
    let currentUpdatedResume = state.updatedResumeMarkdown;
    let currentSystemPrompt = systemPrompt;
    let currentMessages = messages;

    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        let content = '';
        const toolCalls: ToolCall[] = [];

        for await (const event of sendMessage({
          provider: state.provider,
          apiKey: state.apiKey,
          systemPrompt: currentSystemPrompt,
          messages: currentMessages,
          tools: CHAT_TOOLS,
          maxTokens: 2048,
        })) {
          if (event.type === 'text') {
            content += event.text;
            setStreamingContent(content);
          } else if (event.type === 'tool_call') {
            toolCalls.push(event);
          }
        }

        if (toolCalls.length === 0) {
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: { role: 'assistant', content } });
          break;
        }

        const assistantMsg: ChatMessageType = { role: 'assistant', content, toolCalls };
        dispatch({ type: 'ADD_CHAT_MESSAGE', message: assistantMsg });

        const toolResultMessages: ChatMessageType[] = [];
        for (const tc of toolCalls) {
          const result = executeToolCall(tc, currentRankings);
          if (result.newRankings) {
            dispatch({
              type: 'SET_RANKING_STATE',
              rankingState: { sortedResult: result.newRankings },
            });
            currentRankings = result.newRankings;
          }
          if (result.newResume) {
            dispatch({
              type: 'SET_UPDATED_RESUME_MARKDOWN',
              updatedResumeMarkdown: result.newResume,
            });
            currentUpdatedResume = result.newResume;
            setResumeJustUpdated(true);
          }
          toolResultMessages.push({
            role: 'user',
            content: result.resultText,
            toolResult: { toolUseId: tc.id },
          });
        }

        for (const trm of toolResultMessages) {
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: trm });
        }

        currentSystemPrompt = buildChatSystemPrompt(
          state.questionResponses,
          currentRankings,
          state.resumeText,
          currentUpdatedResume,
        );
        currentMessages = [...currentMessages, assistantMsg, ...toolResultMessages];
        setStreamingContent('');
      }
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

  async function initializeChat() {
    if (state.resumeText.trim() && !state.updatedResumeMarkdown) {
      try {
        let formatted = '';
        for await (const event of sendMessage({
          provider: state.provider,
          apiKey: state.apiKey,
          systemPrompt: RESUME_FORMATTING_SYSTEM_PROMPT,
          messages: [{ role: 'user' as const, content: state.resumeText }],
          maxTokens: 4096,
        })) {
          if (event.type === 'text') {
            formatted += event.text;
          }
        }
        if (formatted.trim()) {
          dispatch({ type: 'SET_UPDATED_RESUME_MARKDOWN', updatedResumeMarkdown: formatted });
        }
      } catch (error) {
        console.warn('Resume formatting failed:', error);
      }
    }
    runChatTurn([]);
  }

  useEffect(() => {
    if (!areAllStepsComplete(state) || !state.apiKey) {
      router.replace(state.wizardStep === 'setup' ? '/' : '/next-steps');
      return;
    }

    if (!initializedRef.current && state.chatMessages.length === 0) {
      initializedRef.current = true;
      initializeChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages, streamingContent]);

  useEffect(() => {
    if (resumeJustUpdated) {
      const timer = setTimeout(() => setResumeJustUpdated(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [resumeJustUpdated]);

  async function handleSend(text: string) {
    const userMessage: ChatMessageType = { role: 'user', content: text };
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: userMessage });
    runChatTurn([...state.chatMessages, userMessage]);
  }

  function handleDownload() {
    const md = buildExportMarkdown(
      state.questionResponses,
      state.rankingState.sortedResult,
      state.resumeText,
      state.updatedResumeMarkdown,
    );
    if (md) downloadTextFile(md, 'career-genie-results.md');
  }

  function handleReorderRankings(newRankings: string[]) {
    dispatch({ type: 'SET_RANKING_STATE', rankingState: { sortedResult: newRankings } });
    const rankingsList = newRankings.map((r, i) => `${i + 1}. ${r}`).join('\n');
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      message: { role: 'user', content: `I've updated my rankings. New order:\n${rankingsList}` },
    });
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4">
        <ChatToolbar onOpenPanel={setActivePanel} onDownload={handleDownload} />

        <div className="flex-1 overflow-y-auto space-y-1">
          {state.chatMessages
            .filter((msg) => !msg.toolResult)
            .map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
          {streaming && streamingContent && (
            <ChatMessage message={{ role: 'assistant', content: streamingContent }} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-stone-50 pt-2 pb-4">
          {resumeJustUpdated && (
            <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg mb-2">
              <span>Resume updated</span>
              <button
                onClick={() => setActivePanel('resume')}
                className="underline font-medium hover:text-emerald-900"
              >
                View
              </button>
            </div>
          )}
          <ChatInput
            onSend={handleSend}
            disabled={streaming}
            placeholder="Ask a follow-up question..."
          />
        </div>
      </div>

      <ChatPanel
        title="Survey Answers"
        open={activePanel === 'answers'}
        onClose={() => setActivePanel(null)}
      >
        <AnswersPanel questionResponses={state.questionResponses} />
      </ChatPanel>

      <ChatPanel
        title="Rankings"
        open={activePanel === 'rankings'}
        onClose={() => setActivePanel(null)}
      >
        <RankingsPanel
          rankings={state.rankingState.sortedResult || []}
          onSave={handleReorderRankings}
        />
      </ChatPanel>

      <ChatPanel
        title="Resume"
        open={activePanel === 'resume'}
        onClose={() => setActivePanel(null)}
      >
        <ResumePanel resumeText={state.resumeText} updatedResumeMarkdown={state.updatedResumeMarkdown} />
      </ChatPanel>
    </main>
  );
}
