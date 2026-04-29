'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, PREDEFINED_QUESTIONS } from '@/context/SessionContext';
import { parseExportMarkdown } from '@/lib/import';


export default function WelcomePage() {
  const { dispatch } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleStart() {
    dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
    router.push('/hub');
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);

      if ('error' in result) {
        setImportError(result.error);
        return;
      }

      const hasData =
        result.questionResponses.some((qr) => qr.isComplete) ||
        result.rankedQualities !== null;

      if (!hasData) {
        setImportError('No questions or rankings were found in this file.');
        return;
      }

      setImportError(null);
      dispatch({
        type: 'RESTORE_SESSION',
        questionResponses: result.questionResponses,
        sortedResult: result.rankedQualities,
      });
      router.push('/hub');
    };
    reader.readAsText(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <main className="min-h-screen flex flex-col">

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-3xl font-bold text-stone-900">Career Genie</h1>
          <p className="text-stone-600">
            Discover what matters most in your career through guided reflection
            and personalized coaching.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-stone-500">
              You&apos;ll answer 5 reflection questions and rank your career
              priorities. Then start an open-ended coaching session in
              this app or in your AI Chat app of choice.
            </p>
            <button
              onClick={handleStart}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              Get Started
            </button>
            <div className="flex items-center gap-3 text-stone-400 text-xs">
              <div className="flex-1 border-t border-stone-200" />
              <span>or</span>
              <div className="flex-1 border-t border-stone-200" />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
            >
              Resume a previous session
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              onChange={handleFileSelect}
              className="hidden"
            />
            {importError && (
              <p className="text-sm text-red-600">{importError}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
