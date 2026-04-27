import type { QuestionResponse } from '@/types';

export function buildExportMarkdown(
  questionResponses: QuestionResponse[],
  rankedQualities: string[] | null,
): string {
  const sections: string[] = [];

  const now = new Date().toISOString().split('T')[0];
  sections.push(`---\ngenerated: ${now}\napp: career-genie\nversion: 1\n---`);
  sections.push('# Career Genie Results');

  const answeredQuestions = questionResponses.filter((qr) => qr.answer.trim() !== '');

  if (answeredQuestions.length > 0) {
    const qaLines = answeredQuestions.map((qr) => {
      let block = `### ${qr.question}\n\n**Answer:** ${qr.answer}`;
      if (qr.whyAnswer.trim()) {
        block += `\n\n**Why:** ${qr.whyAnswer}`;
      }
      return block;
    });
    sections.push('## Reflection Questions\n\n' + qaLines.join('\n\n'));
  }

  if (rankedQualities && rankedQualities.length > 0) {
    const rankingLines = rankedQualities.map((q, i) => `${i + 1}. ${q}`);
    sections.push('## Priority Rankings (most to least important)\n\n' + rankingLines.join('\n'));
  }

  if (sections.length <= 2) return '';

  return sections.join('\n\n') + '\n';
}

export function buildCopyablePrompt(
  questionResponses: QuestionResponse[],
  rankedQualities: string[] | null,
): string {
  const parts: string[] = [];

  parts.push(
    'I completed a career self-reflection exercise. Based on my answers and priorities below, please act as a career coach and give me personalized, actionable career advice.',
  );

  const answeredQuestions = questionResponses.filter((qr) => qr.answer.trim() !== '');
  if (answeredQuestions.length > 0) {
    const qaBlock = answeredQuestions.map((qr) => {
      let entry = `Q: ${qr.question}\nA: ${qr.answer}`;
      if (qr.whyAnswer.trim()) {
        entry += `\nWhy: ${qr.whyAnswer}`;
      }
      return entry;
    }).join('\n\n');
    parts.push('## My Reflection Answers\n\n' + qaBlock);
  }

  if (rankedQualities && rankedQualities.length > 0) {
    const rankingBlock = rankedQualities.map((q, i) => `${i + 1}. ${q}`).join('\n');
    parts.push('## My Career Priorities (most to least important)\n\n' + rankingBlock);
  }

  parts.push(
    'Please suggest 2-3 concrete career paths or next steps that align with my answers and priorities. Reference specific things I shared. Acknowledge trade-offs honestly.',
  );

  return parts.join('\n\n');
}

export function buildExportText(
  questionResponses: QuestionResponse[],
  rankedQualities: string[] | null,
): string {
  const sections: string[] = [];

  const answeredQuestions = questionResponses.filter(
    (qr) => qr.answer.trim() !== '',
  );

  if (answeredQuestions.length > 0) {
    const qaLines = answeredQuestions.map((qr) => {
      let block = `Q: ${qr.question}\n  Answer: ${qr.answer}`;
      if (qr.whyAnswer.trim()) {
        block += `\n  Why: ${qr.whyAnswer}`;
      }
      return block;
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
