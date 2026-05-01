import type { QuestionResponse } from '@/types';
import { buildChatSystemPrompt } from '@/lib/prompts';

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
  resumeText?: string,
): string {
  return buildChatSystemPrompt(questionResponses, rankedQualities || [], resumeText)
    + '\n\nPlease begin the coaching session.';
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
