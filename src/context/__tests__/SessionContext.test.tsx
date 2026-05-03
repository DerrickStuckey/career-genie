import { describe, it, expect } from 'vitest';
import { sessionReducer, initialState, areQuestionsComplete, isResumeComplete, areAllStepsComplete } from '../SessionContext';

describe('sessionReducer', () => {
  it('sets provider', () => {
    const state = sessionReducer(initialState, { type: 'SET_PROVIDER', provider: 'openai' });
    expect(state.provider).toBe('openai');
  });

  it('sets API key', () => {
    const state = sessionReducer(initialState, { type: 'SET_API_KEY', apiKey: 'sk-test-123' });
    expect(state.apiKey).toBe('sk-test-123');
  });

  it('sets wizard step', () => {
    const state = sessionReducer(initialState, { type: 'SET_WIZARD_STEP', step: 'hub' });
    expect(state.wizardStep).toBe('hub');
  });

  it('adds chat message', () => {
    const message = { role: 'user' as const, content: 'Hello' };
    const state = sessionReducer(initialState, { type: 'ADD_CHAT_MESSAGE', message });
    expect(state.chatMessages).toHaveLength(1);
    expect(state.chatMessages[0]).toEqual(message);
  });

  it('sets a question answer', () => {
    const state = sessionReducer(initialState, { type: 'SET_QUESTION_ANSWER', questionId: 0, answer: 'Travel the world' });
    expect(state.questionResponses[0].answer).toBe('Travel the world');
    expect(state.questionResponses[1].answer).toBe('');
  });

  it('sets a question why answer', () => {
    const state = sessionReducer(initialState, { type: 'SET_QUESTION_WHY', questionId: 2, whyAnswer: 'Because I love exploring' });
    expect(state.questionResponses[2].whyAnswer).toBe('Because I love exploring');
    expect(state.questionResponses[0].whyAnswer).toBe('');
  });

  it('marks a question as complete', () => {
    const state = sessionReducer(initialState, { type: 'SET_QUESTION_COMPLETE', questionId: 2 });
    expect(state.questionResponses[2].isComplete).toBe(true);
    expect(state.questionResponses[0].isComplete).toBe(false);
  });

  it('sets resume text', () => {
    const state = sessionReducer(initialState, { type: 'SET_RESUME_TEXT', resumeText: 'My resume content...' });
    expect(state.resumeText).toBe('My resume content...');
  });

  it('merges partial ranking state', () => {
    const state = sessionReducer(initialState, { type: 'SET_RANKING_STATE', rankingState: { completedComparisons: 5 } });
    expect(state.rankingState.completedComparisons).toBe(5);
    expect(state.rankingState.items).toEqual(initialState.rankingState.items);
  });

  it('resets to initial state', () => {
    let state = sessionReducer(initialState, { type: 'SET_API_KEY', apiKey: 'sk-test' });
    state = sessionReducer(state, { type: 'SET_QUESTION_ANSWER', questionId: 0, answer: 'test answer' });
    state = sessionReducer(state, { type: 'SET_RESUME_TEXT', resumeText: 'resume' });
    state = sessionReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });

  it('restores session with questions and rankings', () => {
    const questionResponses = initialState.questionResponses.map((qr, i) =>
      i === 0 ? { ...qr, answer: 'Travel', whyAnswer: 'Freedom', isComplete: true } : qr
    );
    const sortedResult = ['Salary', 'Growth', 'Balance'];

    const state = sessionReducer(initialState, {
      type: 'RESTORE_SESSION',
      questionResponses,
      sortedResult,
    });

    expect(state.wizardStep).toBe('hub');
    expect(state.questionResponses[0].answer).toBe('Travel');
    expect(state.questionResponses[0].isComplete).toBe(true);
    expect(state.questionResponses[1].isComplete).toBe(false);
    expect(state.rankingState.sortedResult).toEqual(sortedResult);
    expect(state.apiKey).toBe('');
    expect(state.chatMessages).toEqual([]);
  });

  it('restores session with null rankings', () => {
    const questionResponses = initialState.questionResponses.map((qr, i) =>
      i === 0 ? { ...qr, answer: 'Travel', isComplete: true } : qr
    );

    const state = sessionReducer(initialState, {
      type: 'RESTORE_SESSION',
      questionResponses,
      sortedResult: null,
    });

    expect(state.wizardStep).toBe('hub');
    expect(state.questionResponses[0].answer).toBe('Travel');
    expect(state.rankingState.sortedResult).toBeNull();
    expect(state.rankingState.items).toEqual(initialState.rankingState.items);
  });

  it('restores session with resume text', () => {
    const state = sessionReducer(initialState, {
      type: 'RESTORE_SESSION',
      questionResponses: initialState.questionResponses,
      sortedResult: null,
      resumeText: 'Imported resume',
    });
    expect(state.resumeText).toBe('Imported resume');
  });

  it('restores session without resume text (backward compat)', () => {
    const state = sessionReducer(initialState, {
      type: 'RESTORE_SESSION',
      questionResponses: initialState.questionResponses,
      sortedResult: null,
    });
    expect(state.resumeText).toBe('');
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

  it('isResumeComplete returns false when resume is empty', () => {
    expect(isResumeComplete(initialState)).toBe(false);
  });

  it('isResumeComplete returns true when resume has content', () => {
    const state = sessionReducer(initialState, { type: 'SET_RESUME_TEXT', resumeText: 'My resume' });
    expect(isResumeComplete(state)).toBe(true);
  });

  it('areAllStepsComplete requires questions, ranking, and resume complete', () => {
    let state = initialState;
    for (let i = 0; i < 5; i++) {
      state = sessionReducer(state, { type: 'SET_QUESTION_COMPLETE', questionId: i });
    }
    expect(areAllStepsComplete(state)).toBe(false);
    state = sessionReducer(state, { type: 'SET_RANKING_STATE', rankingState: { sortedResult: ['A', 'B', 'C'] } });
    expect(areAllStepsComplete(state)).toBe(false);
    state = sessionReducer(state, { type: 'SET_RESUME_TEXT', resumeText: 'My resume' });
    expect(areAllStepsComplete(state)).toBe(true);
  });
});
