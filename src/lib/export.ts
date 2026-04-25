import type { QuestionResponse } from '@/types';

export function buildExportText(
  questionResponses: QuestionResponse[],
  rankedQualities: string[] | null,
): string {
  const sections: string[] = [];

  const answeredQuestions = questionResponses.filter(
    (qr) => qr.isComplete && qr.messages.some((m) => m.role === 'user'),
  );

  if (answeredQuestions.length > 0) {
    const qaLines = answeredQuestions.map((qr) => {
      const conversation = qr.messages
        .map((m) => (m.role === 'user' ? `  You: ${m.content}` : `  Coach: ${m.content}`))
        .join('\n');
      return `Q: ${qr.question}\n${conversation}`;
    });
    sections.push('REFLECTION QUESTIONS\n\n' + qaLines.join('\n\n'));
  }

  if (rankedQualities && rankedQualities.length > 0) {
    const rankingLines = rankedQualities.map((q, i) => `  ${i + 1}. ${q}`);
    sections.push('PRIORITY RANKINGS (most to least important)\n\n' + rankingLines.join('\n'));
  }

  if (sections.length === 0) return '';

  return 'Career Genie — Your Results\n' + '='.repeat(30) + '\n\n' + sections.join('\n\n\n');
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
