'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { extractTextFromPDF, extractTextFromDOCX } from '@/lib/resume-parser';

type InputMethod = 'pdf' | 'docx' | 'paste';

export default function ResumePage() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<InputMethod>('paste');
  const [text, setText] = useState(state.resumeText);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state.wizardStep === 'setup') {
      router.replace('/');
    }
  }, [state.wizardStep, router]);

  function switchMethod(m: InputMethod) {
    setMethod(m);
    setError('');
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError('');

    try {
      const extracted = method === 'pdf'
        ? await extractTextFromPDF(file)
        : await extractTextFromDOCX(file);
      setText(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file.');
      setText('');
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  }

  function handleSave() {
    if (!text.trim()) return;
    dispatch({ type: 'SET_RESUME_TEXT', resumeText: text.trim() });
    dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
    router.push('/hub');
  }

  const tabs: { key: InputMethod; label: string }[] = [
    { key: 'paste', label: 'Paste Text' },
    { key: 'pdf', label: 'Upload PDF' },
    { key: 'docx', label: 'Upload DOCX' },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900">Your Resume</h1>
            <p className="mt-2 text-stone-600">
              Upload or paste your resume so the genie can tailor advice to your background.
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchMethod(tab.key)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium border transition-colors ${
                  method === tab.key
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Upload area for PDF / DOCX */}
          {method !== 'paste' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="w-full rounded-xl border-2 border-dashed border-stone-300 py-8 text-sm text-stone-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
              >
                {parsing
                  ? 'Extracting text…'
                  : `Click to select a .${method} file`}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={method === 'pdf' ? '.pdf' : '.docx'}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Text area — editable for paste, readonly for uploads */}
          <textarea
            value={text}
            onChange={method === 'paste' ? (e) => setText(e.target.value) : undefined}
            readOnly={method !== 'paste'}
            placeholder={
              method === 'paste'
                ? 'Paste your resume text here…'
                : 'Extracted text will appear here…'
            }
            rows={12}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => {
                dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
                router.push('/hub');
              }}
              className="flex-1 rounded-xl py-3 text-sm font-medium text-stone-700 border border-stone-300 hover:border-stone-400 transition-colors"
            >
              Back to Hub
            </button>
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              Save Resume
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
