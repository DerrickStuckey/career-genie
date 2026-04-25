# Career Genie

AI career coaching wizard: setup → hub → [questions + ranking] → career chat.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest. Deployed on Vercel.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run tests (vitest)
- `npm run lint` — eslint

## Architecture

- All user state in React Context (`src/context/SessionContext.tsx`, useReducer pattern)
- Hub-and-spoke workflow: Setup → Hub → [Questions + Ranking] → Career Chat
- 5 independent LLM sessions for reflection questions (`src/app/questions/page.tsx`)
- One API route (`src/app/api/chat/route.ts`) proxies LLM requests to Anthropic/OpenAI with streaming
- Browser-side stream parsing in `src/lib/llm-client.ts`
- Swiss-style tournament ranking in `src/lib/ranking.ts`
- System prompts in `src/lib/prompts.ts`

## Key Patterns

- User's API key is passed per-request, never stored server-side
- Each reflection question is an independent LLM session (fresh conversation per question)
- Steps 1 (Questions) and 2 (Ranking) can be completed in any order via the hub page
- Step 3 (Career Chat) receives all Q&A answers and rankings as context
- Ranking uses Swiss-style tournament (yields pairs, accepts choices)

## Plan

Implementation plan: `docs/superpowers/plans/2026-04-22-career-genie-implementation.md`
