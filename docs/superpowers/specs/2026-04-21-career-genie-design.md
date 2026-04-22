# Career Genie — Design Spec

## Overview

A frontend-focused web app that acts as an AI career coach. Users provide their own LLM API key, go through a structured wizard flow (intake chat → preference ranking → personalized advice), and receive career guidance based on their background and ranked priorities.

## Architecture

- **Next.js App Router** deployed on Vercel
- All state lives in the browser via React Context + useReducer — no database, no server-side state
- One thin API route (`/api/chat`) that proxies LLM requests to the selected provider — exists solely to bypass CORS restrictions on Anthropic's API. The user's API key is forwarded in the request and never stored.
- Multi-provider support: Anthropic (Claude) and OpenAI (GPT) at launch
- Tailwind CSS for styling (reasonable defaults, iterate later)

## Wizard Flow

Linear four-step wizard. Navigation is forward-only with back option. Steps:

### Step 1: Setup (`/`)

- User selects LLM provider (Anthropic or OpenAI)
- Enters their API key
- Key is validated with a lightweight API call (e.g., list models or send a trivial message)
- On success, proceeds to chat

### Step 2: Intake Chat (`/chat`)

- Chat interface where the AI career coach asks questions about the user's background, experience, interests, and goals
- Driven by a customizable system prompt that instructs the AI to:
  - Ask ~8-10 questions covering career history, skills, interests, deal-breakers, and aspirations
  - Include a `[READY]` marker in its response when it has gathered enough information
- A "Continue to Rankings" button is always visible in subtle/secondary styling so the user never feels trapped
- When the app detects `[READY]` in an AI response, it strips the marker from displayed text and promotes the button to prominent/highlighted styling
- Chat history is preserved in state for use in the results step

### Step 3: A/B Ranking (`/rank`)

- Pairwise comparison exercise to rank ~15-20 job qualities by personal importance
- Uses merge-sort-based comparison: each "comparison" is a user choice between two qualities
  - Worst case ~60 comparisons for 17 items (N log N)
  - ~3-4 minutes at ~1 comparison per 3 seconds
- UI shows two cards side by side; user clicks the one that matters more to them
- Progress bar shows estimated completion percentage
- Result: a fully ordered list from most to least important

**Initial quality set (~17 items):**
1. High salary / compensation
2. Flexible hours
3. Remote work options
4. Real-world impact
5. Career growth opportunities
6. Strong team culture
7. Autonomy / independence
8. Job stability / security
9. Desirable location
10. Company prestige / brand
11. Work-life balance
12. Mentorship opportunities
13. Creative freedom
14. Leadership opportunities
15. Mission-driven organization
16. Technical challenge
17. Equity / ownership stake

### Step 4: Results (`/results`)

- Sends the full chat history + ranked preference list to the AI
- System prompt instructs the AI to synthesize everything into personalized career advice
- Displays:
  - The AI's career advice (streamed)
  - The user's ranked preference list alongside for reference
- User can continue chatting to ask follow-up questions

## LLM Client

A provider-agnostic `sendMessage()` function:

```
sendMessage({ provider, apiKey, systemPrompt, messages }) → AsyncIterable<string>
```

- Routes through `/api/chat` API route (thin proxy, no state)
- For Anthropic: maps to `POST /v1/messages` format
- For OpenAI: maps to `POST /v1/chat/completions` format
- Supports streaming responses for both providers
- The API route forwards the request headers (including API key) and streams the response back

## State Management

Single `SessionContext` with `useReducer`:

```typescript
interface SessionState {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  wizardStep: 'setup' | 'chat' | 'rank' | 'results';
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
  rankingState: {
    items: string[];
    pendingComparisons: Array<[string, string]>;
    completedComparisons: number;
    totalEstimatedComparisons: number;
    currentPair: [string, string] | null;
    sortedResult: string[] | null;
  };
  results: string;
}
```

No persistence — browser refresh loses all state. Acceptable for v1.

## Project Structure

```
career-genie/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with SessionProvider
│   │   ├── page.tsx            # Setup step (provider + API key)
│   │   ├── chat/
│   │   │   └── page.tsx        # Intake chat step
│   │   ├── rank/
│   │   │   └── page.tsx        # A/B ranking step
│   │   ├── results/
│   │   │   └── page.tsx        # Results step
│   │   └── api/
│   │       └── chat/
│   │           └── route.ts    # LLM proxy route
│   ├── components/
│   │   ├── ChatMessage.tsx     # Single chat bubble
│   │   ├── ChatInput.tsx       # Message input with send button
│   │   ├── RankingCard.tsx     # Single quality card in A/B comparison
│   │   ├── ProgressBar.tsx     # Ranking progress indicator
│   │   └── WizardNav.tsx       # Step indicator + back/next
│   ├── context/
│   │   └── SessionContext.tsx  # React Context + useReducer
│   ├── lib/
│   │   ├── llm-client.ts      # Provider-agnostic sendMessage()
│   │   ├── ranking.ts         # Merge-sort comparison algorithm
│   │   └── prompts.ts         # System prompts for each step
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

## System Prompts

Two main prompts (defined in `lib/prompts.ts`, customizable):

1. **Intake prompt**: Instructs the AI to act as a career coach, ask 8-10 structured questions, and include a `[READY]` marker when it has enough info.

2. **Results prompt**: Instructs the AI to synthesize the chat history and ranked preferences into actionable career advice, referencing specific rankings and user responses.

## Key Technical Decisions

- **No static export**: The `/api/chat` proxy route requires serverless functions, so we use standard Next.js deployment on Vercel (not `output: 'export'`).
- **No LLM SDKs**: Raw `fetch()` in the API route to keep dependencies minimal and avoid version lock-in.
- **Streaming**: Both providers support SSE-style streaming. The proxy streams responses through to the client for responsive UX.
- **Merge sort for ranking**: Optimal comparison count (N log N) and simple to implement. The algorithm drives the UI — each "comparison needed" becomes a user prompt.

## Verification Plan

1. **Setup step**: Enter an API key, verify it validates against the provider, confirm error handling for invalid keys
2. **Chat step**: Verify the AI asks questions, responds conversationally, and eventually signals readiness
3. **Ranking step**: Complete the full ranking exercise, verify the progress bar advances correctly, confirm the final sorted list is reasonable
4. **Results step**: Verify the AI references both chat context and rankings in its advice
5. **Provider switching**: Test with both Anthropic and OpenAI keys
6. **Error handling**: Test with invalid API key, network disconnection mid-chat, provider API errors
