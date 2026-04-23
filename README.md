# Career Genie

AI-powered career coaching app that helps you discover what matters most in your career through a structured conversation, pairwise preference ranking, and personalized advice.

Inspired by [Graham Weaver](https://www.youtube.com/@grahamweaver)'s ideas on career decision-making and identifying what you truly value in work.

## How It Works

1. **Setup** — Choose your LLM provider (Anthropic or OpenAI) and enter your API key
2. **Chat** — Have a guided conversation with an AI career coach about your experience, goals, and values
3. **Rank** — Compare job qualities head-to-head (Swiss-style tournament) to surface your true priorities
4. **Results** — Get personalized career advice based on your conversation and ranked preferences

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Vitest · Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll need an Anthropic or OpenAI API key to use the app — it's passed directly to the provider and never stored server-side.

## Built With

Built with [Claude Code](https://claude.ai/claude-code) using [superpowers](https://github.com/obra/superpowers).
