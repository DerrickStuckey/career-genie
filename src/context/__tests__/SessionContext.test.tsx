import { describe, it, expect } from 'vitest';
import { sessionReducer, initialState, areQuestionsComplete, isStep3Available } from '../SessionContext';

describe('sessionReducer', () => {
  it('sets provider', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_PROVIDER',
      provider: 'openai',
    });
    expect(state.provider).toBe('openai');
  });

  it('sets API key', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_API_KEY',
      apiKey: 'sk-test-123',
    });
    expect(state.apiKey).toBe('sk-test-123');
  });

  it('sets wizard step', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_WIZARD_STEP',
      step: 'hub',
    });
    expect(state.wizardStep).toBe('hub');
  });

  it('adds chat message', () => {
    const message = { role: 'user' as const, content: 'Hello' };
    const state = sessionReducer(initialState, {
      type: 'ADD_CHAT_MESSAGE',
      message,
    });
    expect(state.chatMessages).toHaveLength(1);
    expect(state.chatMessages[0]).toEqual(message);
  });

  it('adds a message to a specific question', () => {
    const message = { role: 'user' as const, content: 'I would travel the world' };
    const state = sessionReducer(initialState, {
      type: 'ADD_QUESTION_MESSAGE',
      questionId: 0,
      message,
    });
    expect(state.questionResponses[0].messages).toHaveLength(1);
    expect(state.questionResponses[0].messages[0]).toEqual(message);
    expect(state.questionResponses[1].messages).toHaveLength(0);
  });

  it('adds multiple messages to the same question', () => {
    let state = sessionReducer(initialState, {
      type: 'ADD_QUESTION_MESSAGE',
      questionId: 1,
      message: { role: 'user' as const, content: 'Start a business' },
    });
    state = sessionReducer(state, {
      type: 'ADD_QUESTION_MESSAGE',
      questionId: 1,
      message: { role: 'assistant' as const, content: 'That sounds exciting!' },
    });
    expect(state.questionResponses[1].messages).toHaveLength(2);
  });

  it('marks a question as complete', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_QUESTION_COMPLETE',
      questionId: 2,
    });
    expect(state.questionResponses[2].isComplete).toBe(true);
    expect(state.questionResponses[0].isComplete).toBe(false);
  });

  it('merges partial ranking state', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_RANKING_STATE',
      rankingState: { completedComparisons: 5 },
    });
    expect(state.rankingState.completedComparisons).toBe(5);
    expect(state.rankingState.items).toEqual(initialState.rankingState.items);
  });

  it('resets to initial state', () => {
    let state = sessionReducer(initialState, {
      type: 'SET_API_KEY',
      apiKey: 'sk-test',
    });
    state = sessionReducer(state, {
      type: 'ADD_QUESTION_MESSAGE',
      questionId: 0,
      message: { role: 'user' as const, content: 'test' },
    });
    state = sessionReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});

describe('derived state helpers', () => {
  it('areQuestionsComplete returns false when questions are incomplete', () => {
    expect(areQuestionsComplete(initialState)).toBe(false);
  });

  it('areQuestionsComplete returns true when all questions are complete', () => {
    let state = initialState;
    for (let i = 0; i < 5; i++) {
      state = sessionReducer(state, { type: 'SET_QUESTION_COMPLETE', questionId: i });
    }
    expect(areQuestionsComplete(state)).toBe(true);
  });

  it('isStep3Available requires both questions and ranking complete', () => {
    let state = initialState;
    for (let i = 0; i < 5; i++) {
      state = sessionReducer(state, { type: 'SET_QUESTION_COMPLETE', questionId: i });
    }
    expect(isStep3Available(state)).toBe(false);

    state = sessionReducer(state, {
      type: 'SET_RANKING_STATE',
      rankingState: { sortedResult: ['A', 'B', 'C'] },
    });
    expect(isStep3Available(state)).toBe(true);
  });
});
