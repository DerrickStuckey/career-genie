interface ResumePanelProps {
  resumeText: string;
}

export function ResumePanel({ resumeText }: ResumePanelProps) {
  if (!resumeText.trim()) {
    return <p className="text-sm text-stone-500">No resume uploaded.</p>;
  }

  return (
    <div className="prose prose-sm prose-stone max-w-none">
      <pre className="whitespace-pre-wrap text-sm text-stone-800 font-sans">{resumeText}</pre>
    </div>
  );
}
