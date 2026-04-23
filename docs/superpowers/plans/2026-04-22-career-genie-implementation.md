# Career Genie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a frontend-focused AI career coaching app with a structured wizard flow (setup → chat → ranking → results), multi-provider LLM support, and pairwise preference ranking.

**Architecture:** Next.js App Router on Vercel. All user state lives in React Context (useReducer). One thin API route proxies LLM requests to bypass CORS. Browser-side streaming for responsive chat UX.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest (unit tests)

**Spec:** `docs/superpowers/specs/2026-04-21-career-genie-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              — Root layout, wraps app in SessionProvider, global styles
│   ├── page.tsx                — Setup page: provider select + API key input + validation
│   ├── chat/page.tsx           — Intake chat: AI asks questions, [READY] detection
│   ├── rank/page.tsx           — A/B ranking: pairwise comparison UI + progress bar
│   ├── results/page.tsx        — Results: AI advice + ranked list display
│   └── api/chat/route.ts       — LLM proxy: forwards requests to Anthropic/OpenAI, streams response
├── components/
│   ├── ChatMessage.tsx         — Single chat bubble (user vs assistant styling)
│   ├── ChatInput.tsx           — Text input + send button, handles enter-to-send
│   ├── RankingCard.tsx         — One side of the A/B comparison (quality name + description)
│   ├── ProgressBar.tsx         — Simple progress bar with percentage
│   └── WizardNav.tsx           — Step indicator (setup/chat/rank/results) + back button
├── context/
│   └── SessionContext.tsx      — React Context + useReducer for all wizard state
├── lib/
│   ├── llm-client.ts           — Browser-side sendMessage() that calls /api/chat, returns async iterable
│   ├── ranking.ts              — Interactive merge sort: yields comparison requests, accepts user choices
│   └── prompts.ts              — System prompts for intake chat and results steps
└── types/
    └── index.ts                — Shared TypeScript types (SessionState, Provider, ChatMessage, etc.)
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `postcss.config.mjs`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

Run from the repo root:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted about Turbopack, say yes. Accept defaults for everything else. This will scaffold into the existing directory.

- [ ] **Step 2: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: Dev server starts on localhost:3000, default Next.js page loads.

- [ ] **Step 6: Clean up default page content**

Replace `src/app/page.tsx` with a minimal placeholder:
```tsx
export default function SetupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">Career Genie</h1>
    </main>
  );
}
```

Remove any default CSS from `src/app/globals.css` except the Tailwind directives (`@import "tailwindcss"` or `@tailwind` lines).

- [ ] **Step 7: Verify clean state**

```bash
npm run dev
```

Expected: Page shows "Career Genie" centered. No default Next.js content.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "scaffold: Next.js 15 + Tailwind + Vitest"
```

---

### Task 2: Types & State Management

**Files:**
- Create: `src/types/index.ts`, `src/context/SessionContext.tsx`
- Test: `src/context/__tests__/SessionContext.test.tsx`

- [ ] **Step 1: Create shared types**

Create `src/types/index.ts`:
```typescript
export type Provider = 'anthropic' | 'openai';

export type WizardStep = 'setup' | 'chat' | 'rank' | 'results';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RankingState {
  items: string[];
  completedComparisons: number;
  totalEstimatedComparisons: number;
  currentPair: [string, string] | null;
  sortedResult: string[] | null;
}

export interface SessionState {
  provider: Provider;
  apiKey: string;
  wizardStep: WizardStep;
  chatMessages: ChatMessage[];
  systemPrompt: string;
  rankingState: RankingState;
  results: string;
  isReady: boolean;
}

export type SessionAction =
  | { type: 'SET_PROVIDER'; provider: Provider }
  | { type: 'SET_API_KEY'; apiKey: string }
  | { type: 'SET_WIZARD_STEP'; step: WizardStep }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'SET_READY'; isReady: boolean }
  | { type: 'SET_RANKING_STATE'; rankingState: Partial<RankingState> }
  | { type: 'SET_RESULTS'; results: string }
  | { type: 'RESET' };
```

- [ ] **Step 2: Write failing test for session reducer**

Create `src/context/__tests__/SessionContext.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { sessionReducer, initialState } from '../SessionContext';

describe('sessionReducer', () => {
  it('sets provider', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_PROVIDER',
      provider: 'openai',
    });
    expect(state.provider).toBe('openai');
  });

  it('sets API key', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_API_KEY',
      apiKey: 'sk-test-123',
    });
    expect(state.apiKey).toBe('sk-test-123');
  });

  it('sets wizard step', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_WIZARD_STEP',
      step: 'chat',
    });
    expect(state.wizardStep).toBe('chat');
  });

  it('adds chat message', () => {
    const message = { role: 'user' as const, content: 'Hello' };
    const state = sessionReducer(initialState, {
      type: 'ADD_CHAT_MESSAGE',
      message,
    });
    expect(state.chatMessages).toHaveLength(1);
    expect(state.chatMessages[0]).toEqual(message);
  });

  it('sets ready flag', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_READY',
      isReady: true,
    });
    expect(state.isReady).toBe(true);
  });

  it('merges partial ranking state', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_RANKING_STATE',
      rankingState: { completedComparisons: 5 },
    });
    expect(state.rankingState.completedComparisons).toBe(5);
    expect(state.rankingState.items).toEqual(initialState.rankingState.items);
  });

  it('resets to initial state', () => {
    let state = sessionReducer(initialState, {
      type: 'SET_API_KEY',
      apiKey: 'sk-test',
    });
    state = sessionReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- src/context/__tests__/SessionContext.test.tsx
```

Expected: FAIL — `sessionReducer` and `initialState` not found.

- [ ] **Step 4: Implement SessionContext**

Create `src/context/SessionContext.tsx`:
```tsx
'use client';

import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { SessionState, SessionAction, RankingState } from '@/types';
import { INTAKE_SYSTEM_PROMPT } from '@/lib/prompts';

const DEFAULT_ITEMS = [
  'High salary / compensation',
  'Flexible hours',
  'Remote work options',
  'Real-world impact',
  'Career growth opportunities',
  'Strong team culture',
  'Autonomy / independence',
  'Job stability / security',
  'Desirable location',
  'Company prestige / brand',
  'Work-life balance',
  'Mentorship opportunities',
  'Creative freedom',
  'Leadership opportunities',
  'Mission-driven organization',
  'Technical challenge',
  'Equity / ownership stake',
];

const defaultRankingState: RankingState = {
  items: DEFAULT_ITEMS,
  completedComparisons: 0,
  totalEstimatedComparisons: Math.ceil(DEFAULT_ITEMS.length * Math.log2(DEFAULT_ITEMS.length)),
  currentPair: null,
  sortedResult: null,
};

export const initialState: SessionState = {
  provider: 'anthropic',
  apiKey: '',
  wizardStep: 'setup',
  chatMessages: [],
  systemPrompt: INTAKE_SYSTEM_PROMPT,
  rankingState: defaultRankingState,
  results: '',
  isReady: false,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_PROVIDER':
      return { ...state, provider: action.provider };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.apiKey };
    case 'SET_WIZARD_STEP':
      return { ...state, wizardStep: action.step };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'SET_READY':
      return { ...state, isReady: action.isReady };
    case 'SET_RANKING_STATE':
      return {
        ...state,
        rankingState: { ...state.rankingState, ...action.rankingState },
      };
    case 'SET_RESULTS':
      return { ...state, results: action.results };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const SessionContext = createContext<{
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
} | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
```

Note: this depends on `INTAKE_SYSTEM_PROMPT` from `@/lib/prompts` — create a stub first:

Create `src/lib/prompts.ts`:
```typescript
export const INTAKE_SYSTEM_PROMPT = 'You are a career coach.';
export const RESULTS_SYSTEM_PROMPT = 'You are a career advisor.';
```

(Full prompts written in Task 4.)

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- src/context/__tests__/SessionContext.test.tsx
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Wire SessionProvider into root layout**

Edit `src/app/layout.tsx` — wrap `{children}` in `<SessionProvider>`:
```tsx
import type { Metadata } from 'next';
import { SessionProvider } from '@/context/SessionContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Career Genie',
  description: 'AI-powered career coaching',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify dev server still works**

```bash
npm run dev
```

Expected: Page loads without errors, "Career Genie" still visible.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/context/ src/lib/prompts.ts src/app/layout.tsx
git commit -m "feat: add session state management with types and context"
```

---

### Task 3: System Prompts

**Files:**
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Write full system prompts**

Replace `src/lib/prompts.ts` with:
```typescript
export const INTAKE_SYSTEM_PROMPT = `You are Career Genie, a warm and insightful career coach. Your job is to learn about the user through a structured conversation.

Ask questions one at a time. Cover these areas across 8-10 questions:
1. Current role and responsibilities
2. Career history and trajectory so far
3. Education and key skills
4. What they enjoy most about their current/past work
5. What frustrates or drains them
6. Industries or roles they're curious about
7. Non-negotiable requirements (salary range, location, remote, etc.)
8. Long-term career aspirations (5-10 year vision)
9. What "success" means to them personally
10. Anything else they think is important

Guidelines:
- Be conversational and encouraging, not clinical
- Ask follow-up questions when answers are vague
- Acknowledge what the user shares before moving on
- After you have asked 8-10 questions and feel you have a good understanding, include the exact marker [READY] at the very end of your message (after your visible text). Do not explain the marker to the user.

Start by introducing yourself briefly and asking your first question.`;

export const RESULTS_SYSTEM_PROMPT = `You are Career Genie, providing personalized career advice based on a detailed conversation and the user's ranked job preferences.

You will receive:
1. The full conversation history from the intake chat
2. The user's ranked list of job qualities (from most to least important)

Provide actionable, specific career advice that:
- References specific things the user told you during the conversation
- Aligns recommendations with their top-ranked preferences
- Suggests 2-3 concrete career paths or next steps
- Acknowledges trade-offs honestly (e.g., "Your top priority is salary, but you also value mission-driven work — here's how to balance that")
- Keeps advice grounded and realistic

Format your response with clear sections. Be direct but supportive.`;

export function buildResultsMessages(
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  rankedQualities: string[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const rankingSummary = rankedQualities
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

  return [
    ...chatHistory,
    {
      role: 'user' as const,
      content: `I've completed the preference ranking exercise. Here are my job qualities ranked from most to least important to me:\n\n${rankingSummary}\n\nBased on everything we've discussed and these rankings, what career advice do you have for me?`,
    },
  ];
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat: add intake and results system prompts"
```

---

### Task 4: LLM Proxy API Route

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Create the proxy route**

Create `src/app/api/chat/route.ts`:
```typescript
import { NextRequest } from 'next/server';

interface ChatRequestBody {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(request: NextRequest) {
  const body: ChatRequestBody = await request.json();
  const { provider, apiKey, systemPrompt, messages } = body;

  if (!apiKey || !messages || !provider) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (provider === 'anthropic') {
      return await proxyAnthropic(apiKey, systemPrompt, messages);
    } else {
      return await proxyOpenAI(apiKey, systemPrompt, messages);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function proxyAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function proxyOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: openaiMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: add LLM proxy API route for Anthropic and OpenAI"
```

---

### Task 5: Browser-Side LLM Client

**Files:**
- Create: `src/lib/llm-client.ts`
- Test: `src/lib/__tests__/llm-client.test.ts`

- [ ] **Step 1: Write failing test for stream parsing**

Create `src/lib/__tests__/llm-client.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseAnthropicStream, parseOpenAIStream } from '../llm-client';

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe('parseAnthropicStream', () => {
  it('extracts text deltas from SSE events', async () => {
    const stream = makeStream([
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]);

    const chunks: string[] = [];
    for await (const chunk of parseAnthropicStream(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });
});

describe('parseOpenAIStream', () => {
  it('extracts content deltas from SSE events', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const chunks: string[] = [];
    for await (const chunk of parseOpenAIStream(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/llm-client.test.ts
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Implement the LLM client**

Create `src/lib/llm-client.ts`:
```typescript
import type { Provider, ChatMessage } from '@/types';

interface SendMessageParams {
  provider: Provider;
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
}

export async function* sendMessage(
  params: SendMessageParams,
): AsyncGenerator<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (!response.body) throw new Error('No response body');

  if (params.provider === 'anthropic') {
    yield* parseAnthropicStream(response.body);
  } else {
    yield* parseOpenAIStream(response.body);
  }
}

export async function* parseAnthropicStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta'
          ) {
            yield parsed.delta.text;
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* parseOpenAIStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/llm-client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm-client.ts src/lib/__tests__/
git commit -m "feat: add browser-side LLM client with streaming parsers"
```

---

### Task 6: Shared Components

**Files:**
- Create: `src/components/ChatMessage.tsx`, `src/components/ChatInput.tsx`, `src/components/ProgressBar.tsx`, `src/components/WizardNav.tsx`

- [ ] **Step 1: Create ChatMessage component**

Create `src/components/ChatMessage.tsx`:
```tsx
import type { ChatMessage as ChatMessageType } from '@/types';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatInput component**

Create `src/components/ChatInput.tsx`:
```tsx
'use client';

import { useState, type FormEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Type a message...' }: ChatInputProps) {
  const [text, setText] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
      >
        Send
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create ProgressBar component**

Create `src/components/ProgressBar.tsx`:
```tsx
interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{current} of {total} comparisons</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create WizardNav component**

Create `src/components/WizardNav.tsx`:
```tsx
'use client';

import { useSession } from '@/context/SessionContext';
import type { WizardStep } from '@/types';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'setup', label: 'Setup' },
  { key: 'chat', label: 'Chat' },
  { key: 'rank', label: 'Rankings' },
  { key: 'results', label: 'Results' },
];

export function WizardNav() {
  const { state } = useSession();
  const currentIndex = STEPS.findIndex((s) => s.key === state.wizardStep);

  return (
    <nav className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              i === currentIndex
                ? 'bg-blue-600 text-white'
                : i < currentIndex
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-white/20">
              {i + 1}
            </span>
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${i < currentIndex ? 'bg-blue-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add shared UI components (chat, progress bar, wizard nav)"
```

---

### Task 7: Setup Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement the setup page**

Replace `src/app/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { WizardNav } from '@/components/WizardNav';
import type { Provider } from '@/types';

export default function SetupPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  async function validateAndProceed() {
    if (!state.apiKey.trim()) {
      setError('Please enter an API key.');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: state.provider,
          apiKey: state.apiKey,
          systemPrompt: 'Reply with exactly: ok',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Validation failed (${response.status})`);
      }

      dispatch({ type: 'SET_WIZARD_STEP', step: 'chat' });
      router.push('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key.');
    } finally {
      setValidating(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Career Genie</h1>
            <p className="mt-2 text-gray-600">
              AI-powered career coaching. Bring your own API key.
            </p>
          </div>

          <div className="space-y-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Provider
              </label>
              <div className="flex gap-2">
                {(['anthropic', 'openai'] as Provider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => dispatch({ type: 'SET_PROVIDER', provider: p })}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition-colors ${
                      state.provider === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {p === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={state.apiKey}
                onChange={(e) => dispatch({ type: 'SET_API_KEY', apiKey: e.target.value })}
                placeholder={state.provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={validateAndProceed}
              disabled={validating}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {validating ? 'Validating...' : 'Start Coaching Session'}
            </button>
          </div>

          <p className="text-xs text-center text-gray-400">
            Your API key is used directly in your browser and never stored on any server.
          </p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Open http://localhost:3000. Expected: Setup page with provider toggle, API key input, and Start button.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add setup page with provider selection and API key input"
```

---

### Task 8: Chat Page

**Files:**
- Create: `src/app/chat/page.tsx`

- [ ] **Step 1: Create the chat page**

Create `src/app/chat/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate manually by entering an API key on setup, clicking Start. Expected: Chat page loads, AI sends an introductory message, user can type responses. "Continue to Rankings" button is subtle until AI signals [READY].

- [ ] **Step 3: Commit**

```bash
git add src/app/chat/
git commit -m "feat: add intake chat page with streaming and [READY] detection"
```

---

### Task 9: Ranking Algorithm

**Files:**
- Create: `src/lib/ranking.ts`
- Test: `src/lib/__tests__/ranking.test.ts`

- [ ] **Step 1: Write failing tests for the ranking engine**

Create `src/lib/__tests__/ranking.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { RankingEngine } from '../ranking';

describe('RankingEngine', () => {
  it('returns a sorted result for 3 items', () => {
    const engine = new RankingEngine(['C', 'A', 'B']);

    const comparisons: [string, string][] = [];
    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair();
      expect(pair).not.toBeNull();
      if (!pair) break;

      comparisons.push(pair);
      // Always pick alphabetically earlier (A > B > C in "importance")
      // So 'A' wins over 'B', 'A' wins over 'C', 'B' wins over 'C'
      const winner = pair[0] < pair[1] ? pair[0] : pair[1];
      engine.recordChoice(winner);
    }

    const result = engine.getResult();
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('returns correct comparison count estimate', () => {
    const engine = new RankingEngine(['A', 'B', 'C', 'D', 'E']);
    expect(engine.getTotalEstimate()).toBeGreaterThanOrEqual(5);
    expect(engine.getTotalEstimate()).toBeLessThanOrEqual(15);
  });

  it('tracks completed comparisons', () => {
    const engine = new RankingEngine(['A', 'B', 'C']);
    expect(engine.getCompletedCount()).toBe(0);

    const pair = engine.getCurrentPair()!;
    engine.recordChoice(pair[0]);
    expect(engine.getCompletedCount()).toBe(1);
  });

  it('handles single item', () => {
    const engine = new RankingEngine(['A']);
    expect(engine.isComplete()).toBe(true);
    expect(engine.getResult()).toEqual(['A']);
  });

  it('handles two items', () => {
    const engine = new RankingEngine(['B', 'A']);
    expect(engine.isComplete()).toBe(false);

    const pair = engine.getCurrentPair()!;
    engine.recordChoice('A');

    expect(engine.isComplete()).toBe(true);
    expect(engine.getResult()).toEqual(['A', 'B']);
  });

  it('sorts 10 items correctly', () => {
    const items = ['J', 'E', 'A', 'H', 'C', 'F', 'B', 'G', 'D', 'I'];
    const engine = new RankingEngine(items);

    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      const winner = pair[0] < pair[1] ? pair[0] : pair[1];
      engine.recordChoice(winner);
    }

    expect(engine.getResult()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/ranking.test.ts
```

Expected: FAIL — `RankingEngine` not found.

- [ ] **Step 3: Implement the ranking engine**

Create `src/lib/ranking.ts`:
```typescript
type CompareResult = -1 | 1;

export class RankingEngine {
  private items: string[];
  private completedCount = 0;
  private totalEstimate: number;
  private result: string[] | null = null;
  private pendingResolve: ((value: CompareResult) => void) | null = null;
  private currentPair: [string, string] | null = null;
  private sortPromise: Promise<void>;
  private done = false;

  constructor(items: string[]) {
    this.items = [...items];
    this.totalEstimate = items.length <= 1 ? 0 : Math.ceil(items.length * Math.log2(items.length));

    if (items.length <= 1) {
      this.result = [...items];
      this.done = true;
      this.sortPromise = Promise.resolve();
    } else {
      this.sortPromise = this.runMergeSort();
    }
  }

  private async compare(a: string, b: string): Promise<CompareResult> {
    this.currentPair = [a, b];
    return new Promise<CompareResult>((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  private async merge(arr: string[], left: number, mid: number, right: number): Promise<void> {
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);

    let i = 0, j = 0, k = left;

    while (i < leftArr.length && j < rightArr.length) {
      const result = await this.compare(leftArr[i], rightArr[j]);
      this.completedCount++;
      if (result === -1) {
        arr[k++] = leftArr[i++];
      } else {
        arr[k++] = rightArr[j++];
      }
    }

    while (i < leftArr.length) arr[k++] = leftArr[i++];
    while (j < rightArr.length) arr[k++] = rightArr[j++];
  }

  private async mergeSort(arr: string[], left: number, right: number): Promise<void> {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    await this.mergeSort(arr, left, mid);
    await this.mergeSort(arr, mid + 1, right);
    await this.merge(arr, left, mid, right);
  }

  private async runMergeSort(): Promise<void> {
    const arr = [...this.items];
    await this.mergeSort(arr, 0, arr.length - 1);
    this.result = arr;
    this.done = true;
    this.currentPair = null;
  }

  getCurrentPair(): [string, string] | null {
    return this.currentPair;
  }

  recordChoice(winner: string): void {
    if (!this.pendingResolve || !this.currentPair) return;

    const resolve = this.pendingResolve;
    this.pendingResolve = null;

    resolve(winner === this.currentPair[0] ? -1 : 1);
  }

  isComplete(): boolean {
    return this.done;
  }

  getResult(): string[] | null {
    return this.result;
  }

  getCompletedCount(): number {
    return this.completedCount;
  }

  getTotalEstimate(): number {
    return this.totalEstimate;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/ranking.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ranking.ts src/lib/__tests__/ranking.test.ts
git commit -m "feat: add interactive merge-sort ranking engine"
```

---

### Task 10: Ranking Page

**Files:**
- Create: `src/app/rank/page.tsx`, `src/components/RankingCard.tsx`

- [ ] **Step 1: Create RankingCard component**

Create `src/components/RankingCard.tsx`:
```tsx
interface RankingCardProps {
  quality: string;
  onClick: () => void;
  side: 'left' | 'right';
}

export function RankingCard({ quality, onClick, side }: RankingCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] ${
        side === 'left' ? 'hover:-rotate-1' : 'hover:rotate-1'
      }`}
    >
      <p className="text-lg font-semibold text-gray-900">{quality}</p>
      <p className="mt-2 text-sm text-gray-500">Click to choose</p>
    </button>
  );
}
```

- [ ] **Step 2: Create the ranking page**

Create `src/app/rank/page.tsx`:
```tsx
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
  const engineRef = useRef<RankingEngine | null>(null);
  const [currentPair, setCurrentPair] = useState<[string, string] | null>(null);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (state.wizardStep !== 'rank') {
      router.replace('/');
      return;
    }

    const engine = new RankingEngine(state.rankingState.items);
    engineRef.current = engine;
    setTotal(engine.getTotalEstimate());

    if (engine.isComplete()) {
      finishRanking(engine);
    } else {
      setCurrentPair(engine.getCurrentPair());
    }
  }, []);

  function handleChoice(winner: string) {
    const engine = engineRef.current;
    if (!engine) return;

    engine.recordChoice(winner);
    setCompleted(engine.getCompletedCount());

    // Allow microtask to resolve the promise, then check state
    setTimeout(() => {
      if (engine.isComplete()) {
        finishRanking(engine);
      } else {
        setCurrentPair(engine.getCurrentPair());
      }
    }, 0);
  }

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
      dispatch({ type: 'SET_WIZARD_STEP', step: 'results' });
      router.push('/results');
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
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Navigate through setup → chat → ranking. Expected: Two cards appear side by side, progress bar increments on each choice, transitions to results when complete.

- [ ] **Step 4: Commit**

```bash
git add src/app/rank/ src/components/RankingCard.tsx
git commit -m "feat: add A/B ranking page with merge-sort comparisons"
```

---

### Task 11: Results Page

**Files:**
- Create: `src/app/results/page.tsx`

- [ ] **Step 1: Create the results page**

Create `src/app/results/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Run through the full wizard: setup → chat → rank → results. Expected: AI generates career advice referencing the conversation and rankings. Rankings shown in sidebar. Follow-up questions work.

- [ ] **Step 3: Commit**

```bash
git add src/app/results/
git commit -m "feat: add results page with AI advice and follow-up chat"
```

---

### Task 12: End-to-End Verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (session reducer, stream parsers, ranking engine).

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Full walkthrough with Anthropic key**

1. Open http://localhost:3000
2. Select Anthropic, enter a valid API key, click Start
3. Chat with the AI coach through 8-10 questions
4. Observe the "Continue to Rankings" button becoming prominent when AI signals readiness
5. Complete the A/B ranking exercise
6. Review the career advice and ranked preference list
7. Ask a follow-up question

- [ ] **Step 4: Full walkthrough with OpenAI key**

Repeat step 3 with OpenAI provider and an OpenAI API key.

- [ ] **Step 5: Error handling check**

1. Enter an invalid API key → expect clear error message on setup page
2. Disconnect network mid-chat → expect error message in chat

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "chore: verify full wizard flow end-to-end"
```
