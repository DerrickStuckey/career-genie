'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { downloadTextFile } from '@/lib/export';

interface ResumePanelProps {
  resumeText: string;
  updatedResumeMarkdown: string;
}

export function ResumePanel({ resumeText, updatedResumeMarkdown }: ResumePanelProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const hasUpdated = updatedResumeMarkdown.trim().length > 0;

  if (!resumeText.trim() && !hasUpdated) {
    return <p className="text-sm text-stone-500">No resume uploaded.</p>;
  }

  function handleDownloadResume() {
    const content = updatedResumeMarkdown || resumeText;
    downloadTextFile(content, 'resume.md');
  }

  if (!hasUpdated) {
    return (
      <pre className="whitespace-pre-wrap text-sm text-stone-800 font-sans leading-relaxed">{resumeText}</pre>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
        >
          {showOriginal ? 'Show updated' : 'Show original'}
        </button>
        <button
          onClick={handleDownloadResume}
          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Download Resume (.md)
        </button>
      </div>

      {showOriginal ? (
        <pre className="whitespace-pre-wrap text-sm text-stone-800 font-sans leading-relaxed">{resumeText}</pre>
      ) : (
        <div className="prose prose-sm prose-stone max-w-none">
          <ReactMarkdown>{updatedResumeMarkdown}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
