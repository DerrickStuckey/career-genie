'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, isStep3Available } from '@/context/SessionContext';
import { buildExportMarkdown, buildCopyablePrompt, downloadTextFile } from '@/lib/export';
import { WizardNav } from '@/components/WizardNav';
import type { Provider } from '@/types';

export default function NextStepsPage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  const rankedQualities = state.rankingState.sortedResult || [];

  useEffect(() => {
    if (!isStep3Available(state)) {
      router.replace(state.wizardStep === 'setup' ? '/' : '/hub');
    }
  }, [state, router]);

  async function validateAndStartChat() {
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

  function handleDownloadMarkdown() {
    const md = buildExportMarkdown(state.questionResponses, rankedQualities);
    if (md) {
      downloadTextFile(md, 'career-genie-results.md');
    }
  }

  async function handleCopyPrompt() {
    const prompt = buildCopyablePrompt(state.questionResponses, rankedQualities);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Your Results Are Ready</h1>
            <p className="mt-2 text-gray-600">
              Choose how you&apos;d like to continue with your career insights.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Option A: Continue In-App */}
            <div className="rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Continue In-App</h2>
              <p className="text-sm text-gray-500">
                Get personalized AI coaching based on your answers and priorities.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Provider
                </label>
                <div className="flex gap-2">
                  {(['anthropic', 'openai'] as Provider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => dispatch({ type: 'SET_PROVIDER', provider: p })}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium border transition-colors ${
                        state.provider === p
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {p === 'anthropic' ? 'Anthropic' : 'OpenAI'}
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-2">
                  Resume <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="resume"
                  value={state.resumeText}
                  onChange={(e) => dispatch({ type: 'SET_RESUME_TEXT', resumeText: e.target.value })}
                  placeholder="Paste your resume text here for more personalized advice..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={validateAndStartChat}
                disabled={validating}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {validating ? 'Validating...' : 'Start Career Chat'}
              </button>

              <p className="text-xs text-gray-400">
                Your API key is used directly in your browser and never stored on any server.
              </p>
            </div>

            {/* Option B: Take Your Results */}
            <div className="flex flex-col gap-6">
              <div className="flex-1 rounded-2xl border-2 border-gray-200 p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Copy Prompt</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Continue your coaching session in ChatGPT, Claude, Gemini, or any other AI chat tool. This prompt includes all your answers and rankings as context.
                  </p>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="w-full rounded-xl py-3 text-sm font-medium text-gray-700 border border-gray-300 hover:border-gray-400 hover:text-gray-900 transition-colors mt-4"
                >
                  {copied ? 'Copied!' : 'Copy Prompt to Clipboard'}
                </button>
              </div>

              <div className="flex-1 rounded-2xl border-2 border-gray-200 p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Download Results</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Download your answers and rankings in Markdown format.
                  </p>
                </div>
                <button
                  onClick={handleDownloadMarkdown}
                  className="w-full rounded-xl py-3 text-sm font-medium text-gray-700 border border-gray-300 hover:border-gray-400 hover:text-gray-900 transition-colors mt-4"
                >
                  Download as Markdown (.md)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
