# Career Genie

AI career coaching wizard: welcome → hub → [questions + ranking + resume] → next steps → (optionally) career chat.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest. Deployed on Vercel.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run tests (vitest)
- `npm run lint` — eslint

## Architecture

- All user state in React Context (`src/context/SessionContext.tsx`, useReducer pattern)
- Hub-and-spoke workflow: Welcome → Hub → [Questions + Ranking + Resume] → Next Steps → (optionally) Career Chat
- 5 deterministic reflection questions with optional "Why?" follow-up (`src/app/questions/page.tsx`)
- Resume upload/paste page with PDF and DOCX parsing via pdfjs-dist/mammoth (`src/app/resume/page.tsx`)
- One API route (`src/app/api/chat/route.ts`) proxies LLM requests to Anthropic/OpenAI with streaming
- Browser-side stream parsing in `src/lib/llm-client.ts`
- Swiss-style tournament ranking in `src/lib/ranking.ts`
- System prompts in `src/lib/prompts.ts`
- Export to .md with YAML frontmatter and copyable prompt in `src/lib/export.ts`

## Key Patterns

- API key is only needed for in-app career chat (deferred to next-steps page)
- Reflection questions are deterministic (no LLM) — answer + optional "Why?"
- Steps 1 (Questions), 2 (Ranking), and 3 (Resume) can be completed in any order via the hub page
- After all three steps, user chooses: in-app chat (with API key) or download/copy results
- Career Chat receives all Q&A answers, rankings, and resume as context
- Resume parsing (PDF/DOCX) is done client-side to avoid backend costs (`src/lib/resume-parser.ts`)
- Ranking uses Swiss-style tournament (yields pairs, accepts choices)

## Plan

Implementation plan: `docs/superpowers/plans/2026-04-22-career-genie-implementation.md`
