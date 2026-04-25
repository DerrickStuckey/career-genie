import { describe, it, expect } from 'vitest';
import { buildExportText } from '../export';

describe('buildExportText', () => {
  it('formats answered questions and rankings', () => {
    const questionResponses = [
      {
        questionId: 0,
        question: 'What would you do?',
        messages: [
          { role: 'user' as const, content: 'Travel the world' },
          { role: 'assistant' as const, content: 'Why is that?' },
          { role: 'user' as const, content: 'I love exploring' },
        ],
        isComplete: true,
      },
      {
        questionId: 1,
        question: 'Unanswered question',
        messages: [],
        isComplete: false,
      },
    ];
    const rankings = ['Salary', 'Growth', 'Balance'];

    const text = buildExportText(questionResponses, rankings);
    expect(text).toContain('REFLECTION QUESTIONS');
    expect(text).toContain('Q: What would you do?');
    expect(text).toContain('You: Travel the world');
    expect(text).toContain('Coach: Why is that?');
    expect(text).toContain('You: I love exploring');
    expect(text).not.toContain('Unanswered question');
    expect(text).toContain('PRIORITY RANKINGS');
    expect(text).toContain('1. Salary');
    expect(text).toContain('3. Balance');
  });

  it('returns empty string when no data', () => {
    const text = buildExportText([], null);
    expect(text).toBe('');
  });

  it('works with only questions completed', () => {
    const questionResponses = [
      {
        questionId: 0,
        question: 'Q1',
        messages: [{ role: 'user' as const, content: 'Answer' }],
        isComplete: true,
      },
    ];
    const text = buildExportText(questionResponses, null);
    expect(text).toContain('REFLECTION QUESTIONS');
    expect(text).not.toContain('PRIORITY RANKINGS');
  });

  it('works with only rankings completed', () => {
    const text = buildExportText([], ['A', 'B']);
    expect(text).toContain('PRIORITY RANKINGS');
    expect(text).not.toContain('REFLECTION QUESTIONS');
  });
});
