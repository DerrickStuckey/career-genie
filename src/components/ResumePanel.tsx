interface ResumePanelProps {
  resumeText: string;
}

export function ResumePanel({ resumeText }: ResumePanelProps) {
  if (!resumeText.trim()) {
    return <p className="text-sm text-stone-500">No resume uploaded.</p>;
  }

  return (
    <pre className="whitespace-pre-wrap text-sm text-stone-800 font-sans leading-relaxed">{resumeText}</pre>
  );
}
