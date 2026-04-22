import { describe, it, expect } from 'vitest';
import { sessionReducer, initialState } from '../SessionContext';

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
      step: 'chat',
    });
    expect(state.wizardStep).toBe('chat');
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

  it('sets ready flag', () => {
    const state = sessionReducer(initialState, {
      type: 'SET_READY',
      isReady: true,
    });
    expect(state.isReady).toBe(true);
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
    state = sessionReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});
