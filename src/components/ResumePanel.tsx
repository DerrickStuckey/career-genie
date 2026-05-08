'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { downloadTextFile } from '@/lib/export';
import { generateResumeDocx, generateResumePdf, downloadBlob } from '@/lib/resume-export';

interface ResumePanelProps {
  resumeText: string;
  updatedResumeMarkdown: string;
}

export function ResumePanel({ resumeText, updatedResumeMarkdown }: ResumePanelProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const hasUpdated = updatedResumeMarkdown.trim().length > 0;

  if (!resumeText.trim() && !hasUpdated) {
    return <p className="text-sm text-stone-500">No resume uploaded.</p>;
  }

  function handleDownloadMd() {
    const content = updatedResumeMarkdown || resumeText;
    downloadTextFile(content, 'resume.md');
  }

  async function handleDownloadDocx() {
    setGeneratingDocx(true);
    try {
      const blob = await generateResumeDocx(updatedResumeMarkdown);
      downloadBlob(blob, 'resume.docx');
    } finally {
      setGeneratingDocx(false);
    }
  }

  function handleDownloadPdf() {
    const doc = generateResumePdf(updatedResumeMarkdown);
    doc.save('resume.pdf');
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
        <div className="flex gap-1">
          <button
            onClick={handleDownloadMd}
            className="text-xs px-2.5 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-100"
          >
            .md
          </button>
          <button
            onClick={handleDownloadDocx}
            disabled={generatingDocx}
            className="text-xs px-2.5 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-100 disabled:opacity-50"
          >
            {generatingDocx ? '...' : '.docx'}
          </button>
          <button
            onClick={handleDownloadPdf}
            className="text-xs px-2.5 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-100"
          >
            PDF
          </button>
        </div>
      </div>

      {showOriginal ? (
        <pre className="whitespace-pre-wrap text-sm text-stone-800 font-sans leading-relaxed">{resumeText}</pre>
      ) : (
        <div className="prose prose-sm prose-stone max-w-none text-sm text-stone-800 leading-relaxed">
          <ReactMarkdown components={{
            h1: ({ children }) => <h1 className="text-xl font-bold text-stone-900 mt-4 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold text-stone-900 mt-4 mb-1.5 border-b border-stone-200 pb-1">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold text-stone-900 mt-3 mb-1">{children}</h3>,
            p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="my-1.5 pl-5 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="my-1.5 pl-5 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="my-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
            em: ({ children }) => <em className="text-stone-500 not-italic text-sm">{children}</em>,
            hr: () => <hr className="my-3 border-stone-200" />,
          }}>{updatedResumeMarkdown}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
