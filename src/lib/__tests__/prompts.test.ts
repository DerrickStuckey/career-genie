import { describe, it, expect } from 'vitest';
import { buildChatSystemPrompt } from '../prompts';

describe('buildChatSystemPrompt', () => {
  it('injects question responses and rankings into system prompt', () => {
    const questionResponses = [
      { questionId: 0, question: 'What would you do?', answer: 'Travel the world', whyAnswer: 'I love freedom', isComplete: true },
      { questionId: 1, question: "What if you couldn't fail?", answer: 'Start a company', whyAnswer: '', isComplete: true },
    ];
    const rankings = ['Salary', 'Growth', 'Balance'];

    const result = buildChatSystemPrompt(questionResponses, rankings);
    expect(result).toContain('What would you do?');
    expect(result).toContain('Travel the world');
    expect(result).toContain('Why: I love freedom');
    expect(result).toContain('1. Salary');
    expect(result).toContain('3. Balance');
    expect(result).toContain('Socratic method');
    expect(result).not.toContain('{{REFLECTION_ANSWERS}}');
    expect(result).not.toContain('{{RANKED_QUALITIES}}');
    expect(result).not.toContain('{{RESUME}}');
  });

  it('uses distinct XML sections for each context type', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'A1', whyAnswer: '', isComplete: true },
    ];
    const result = buildChatSystemPrompt(questionResponses, ['Salary'], 'My resume');
    expect(result).toContain('<instructions>');
    expect(result).toContain('</instructions>');
    expect(result).toContain('<reflection_answers>');
    expect(result).toContain('</reflection_answers>');
    expect(result).toContain('<ranked_qualities>');
    expect(result).toContain('</ranked_qualities>');
    expect(result).toContain('<resume>');
    expect(result).toContain('</resume>');
  });

  it('includes kickoff instruction in system prompt', () => {
    const result = buildChatSystemPrompt([], []);
    expect(result).toContain('Begin the coaching session now.');
  });

  it('handles unanswered questions', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: '', whyAnswer: '', isComplete: false },
    ];
    const result = buildChatSystemPrompt(questionResponses, []);
    expect(result).toContain('(not answered)');
  });

  it('includes resume text when provided', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'Answer', whyAnswer: '', isComplete: true },
    ];
    const result = buildChatSystemPrompt(questionResponses, ['A'], 'My resume text here');
    expect(result).toContain('<resume>');
    expect(result).toContain('My resume text here');
  });

  it('omits resume section when empty', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'Answer', whyAnswer: '', isComplete: true },
    ];
    const result = buildChatSystemPrompt(questionResponses, ['A'], '');
    expect(result).not.toContain('<resume>');
  });

  it('does not contain "Obtain Resume" step (resume is always provided)', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', answer: 'Answer', whyAnswer: '', isComplete: true },
    ];
    const result = buildChatSystemPrompt(questionResponses, ['A'], 'My resume');
    expect(result).not.toContain('Obtain Resume');
  });
});
