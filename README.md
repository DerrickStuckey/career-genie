# Career Genie

AI-powered career coaching app that helps you discover what matters most in your career through reflection questions, pairwise preference ranking, resume analysis, and personalized advice.

Very loosely based on [Graham Weaver](https://www.grahamweaver.com/blog/the-common-question?rq=genie)'s ideas on career decision-making and identifying what you truly value in work.

## How It Works

1. **Welcome** — Start fresh or resume a previous session by uploading an exported `.md` file
2. **Hub** — Complete three steps in any order:
   - **Reflection Questions** — Answer 5 deterministic questions about your career values, with optional "Why?" follow-ups
   - **Priority Ranking** — Compare career qualities head-to-head (Swiss-style tournament) to surface your true priorities
   - **Resume** — Upload (PDF/DOCX) or paste your resume for context
3. **Next Steps** — Once all three steps are complete, choose how to get coaching:
   - **In-app chat** — Enter an Anthropic or OpenAI API key to start a live career coaching session
   - **Export** — Download your results as Markdown or copy a ready-made prompt to use in any AI chat app

No API key is needed until you opt into the in-app chat. When you do, your key is sent directly from the browser to the AI provider and never touches our servers. All resume parsing also happens client-side.

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Vitest · Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Built With

Built with [Claude Code](https://claude.ai/claude-code) using [superpowers](https://github.com/obra/superpowers).
