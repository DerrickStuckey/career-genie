import { describe, it, expect } from 'vitest';
import { buildExportMarkdown, buildExportText, buildCopyablePrompt } from '../export';

describe('buildExportMarkdown', () => {
  it('formats answered questions and rankings as markdown', () => {
    const questionResponses = [
      { questionId: 0, question: 'What would you do?', answer: 'Travel the world', whyAnswer: 'I love exploring', isComplete: true },
      { questionId: 1, question: 'Unanswered', answer: '', whyAnswer: '', isComplete: false },
    ];
    const rankings = ['Salary', 'Growth', 'Balance'];

    const md = buildExportMarkdown(questionResponses, rankings);
    expect(md).toContain('---\ngenerated:');
    expect(md).toContain('app: career-genie');
    expect(md).toContain('version: 1');
    expect(md).toContain('# Career Genie Results');
    expect(md).toContain('### What would you do?');
    expect(md).toContain('**Answer:** Travel the world');
    expect(md).toContain('**Why:** I love exploring');
    expect(md).not.toContain('Unanswered');
    expect(md).toContain('## Priority Rankings');
    expect(md).toContain('1. Salary');
    expect(md).toContain('3. Balance');
  });

  it('omits why when empty', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'Answer only', whyAnswer: '', isComplete: true },
    ];
    const md = buildExportMarkdown(questionResponses, null);
    expect(md).toContain('**Answer:** Answer only');
    expect(md).not.toContain('**Why:**');
  });

  it('returns empty string when no data', () => {
    const md = buildExportMarkdown([], null);
    expect(md).toBe('');
  });
});

describe('buildExportText', () => {
  it('formats answered questions and rankings', () => {
    const questionResponses = [
      { questionId: 0, question: 'What would you do?', answer: 'Travel the world', whyAnswer: 'I love exploring', isComplete: true },
      { questionId: 1, question: 'Unanswered', answer: '', whyAnswer: '', isComplete: false },
    ];
    const rankings = ['Salary', 'Growth', 'Balance'];

    const text = buildExportText(questionResponses, rankings);
    expect(text).toContain('REFLECTION QUESTIONS');
    expect(text).toContain('Q: What would you do?');
    expect(text).toContain('Answer: Travel the world');
    expect(text).toContain('Why: I love exploring');
    expect(text).not.toContain('Unanswered');
    expect(text).toContain('PRIORITY RANKINGS');
    expect(text).toContain('1. Salary');
  });

  it('returns empty string when no data', () => {
    expect(buildExportText([], null)).toBe('');
  });
});

describe('buildCopyablePrompt', () => {
  it('includes Q&A and rankings in a self-contained prompt', () => {
    const questionResponses = [
      { questionId: 0, question: 'What would you do?', answer: 'Travel', whyAnswer: 'Freedom', isComplete: true },
    ];
    const rankings = ['Salary', 'Growth'];

    const prompt = buildCopyablePrompt(questionResponses, rankings);
    expect(prompt).toContain('career coach');
    expect(prompt).toContain('Q: What would you do?');
    expect(prompt).toContain('A: Travel');
    expect(prompt).toContain('Why: Freedom');
    expect(prompt).toContain('1. Salary');
    expect(prompt).toContain('2. Growth');
    expect(prompt).toContain('suggest 2-3 concrete career paths');
  });

  it('works with no why answer', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'Answer', whyAnswer: '', isComplete: true },
    ];
    const prompt = buildCopyablePrompt(questionResponses, []);
    expect(prompt).toContain('A: Answer');
    expect(prompt).not.toContain('Why:');
  });
});
