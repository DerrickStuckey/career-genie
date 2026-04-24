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

      dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
      router.push('/hub');
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
