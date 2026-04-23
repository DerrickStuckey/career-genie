# Career Genie

AI career coaching wizard: setup → chat → rank → results.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest. Deployed on Vercel.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run tests (vitest)
- `npm run lint` — eslint

## Architecture

- All user state in React Context (`src/context/SessionContext.tsx`, useReducer pattern)
- One API route (`src/app/api/chat/route.ts`) proxies LLM requests to Anthropic/OpenAI with streaming
- Browser-side stream parsing in `src/lib/llm-client.ts`
- Interactive merge-sort ranking in `src/lib/ranking.ts`
- System prompts in `src/lib/prompts.ts`

## Key Patterns

- User's API key is passed per-request, never stored server-side
- Chat page detects `[READY]` marker in assistant responses to signal intake completion
- Ranking uses async promise-based merge sort (yields pairs, accepts choices)

## Plan

Implementation plan: `docs/superpowers/plans/2026-04-22-career-genie-implementation.md`
