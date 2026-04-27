import { describe, it, expect } from 'vitest';
import { buildChatContextMessages } from '../prompts';

describe('buildChatContextMessages', () => {
  it('formats question responses and rankings into a context message', () => {
    const questionResponses = [
      { questionId: 0, question: 'What would you do?', answer: 'Travel the world', whyAnswer: 'I love freedom', isComplete: true },
      { questionId: 1, question: "What if you couldn't fail?", answer: 'Start a company', whyAnswer: '', isComplete: true },
    ];
    const rankings = ['Salary', 'Growth', 'Balance'];

    const result = buildChatContextMessages(questionResponses, rankings);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('What would you do?');
    expect(result[0].content).toContain('Travel the world');
    expect(result[0].content).toContain('Why: I love freedom');
    expect(result[0].content).toContain('1. Salary');
    expect(result[0].content).toContain('3. Balance');
  });

  it('handles unanswered questions', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: '', whyAnswer: '', isComplete: false },
    ];
    const result = buildChatContextMessages(questionResponses, []);
    expect(result[0].content).toContain('(not answered)');
  });

  it('includes resume text when provided', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'Answer', whyAnswer: '', isComplete: true },
    ];
    const result = buildChatContextMessages(questionResponses, ['A'], 'My resume text here');
    expect(result[0].content).toContain('Here is my resume:');
    expect(result[0].content).toContain('My resume text here');
  });

  it('omits resume section when empty', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'Answer', whyAnswer: '', isComplete: true },
    ];
    const result = buildChatContextMessages(questionResponses, ['A'], '');
    expect(result[0].content).not.toContain('resume');
  });
});
