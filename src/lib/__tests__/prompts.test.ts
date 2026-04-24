import { describe, it, expect } from 'vitest';
import { buildQuestionSystemPrompt, buildChatContextMessages } from '../prompts';

describe('buildQuestionSystemPrompt', () => {
  it('includes the question text in the prompt', () => {
    const prompt = buildQuestionSystemPrompt("What's play for you but work for others?");
    expect(prompt).toContain("What's play for you but work for others?");
    expect(prompt).toContain('Career Genie');
  });

  it('returns a non-empty string for any question', () => {
    const prompt = buildQuestionSystemPrompt('Any question here?');
    expect(prompt.length).toBeGreaterThan(50);
  });
});

describe('buildChatContextMessages', () => {
  it('formats question responses and rankings into a context message', () => {
    const questionResponses = [
      {
        questionId: 0,
        question: 'What would you do?',
        messages: [{ role: 'user' as const, content: 'Travel the world' }],
        isComplete: true,
      },
      {
        questionId: 1,
        question: "What if you couldn't fail?",
        messages: [{ role: 'user' as const, content: 'Start a company' }],
        isComplete: true,
      },
    ];
    const rankings = ['Salary', 'Growth', 'Balance'];

    const result = buildChatContextMessages(questionResponses, rankings);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('What would you do?');
    expect(result[0].content).toContain('Travel the world');
    expect(result[0].content).toContain('1. Salary');
    expect(result[0].content).toContain('3. Balance');
  });

  it('handles questions with no user messages', () => {
    const questionResponses = [
      { questionId: 0, question: 'Q1', messages: [], isComplete: false },
    ];
    const result = buildChatContextMessages(questionResponses, []);
    expect(result[0].content).toContain('(not answered)');
  });

  it('concatenates multiple user messages for the same question', () => {
    const questionResponses = [
      {
        questionId: 0,
        question: 'Q1',
        messages: [
          { role: 'user' as const, content: 'First thought' },
          { role: 'assistant' as const, content: 'Tell me more' },
          { role: 'user' as const, content: 'Second thought' },
        ],
        isComplete: true,
      },
    ];
    const result = buildChatContextMessages(questionResponses, []);
    expect(result[0].content).toContain('First thought');
    expect(result[0].content).toContain('Second thought');
  });
});
