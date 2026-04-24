'use client';

import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { SessionState, SessionAction, RankingState } from '@/types';
const DEFAULT_ITEMS = [
  'High base compensation',
  'Work-life balance / flexible hours',
  'Remote work options',
  'Tangible real-world impact',
  'Career growth opportunities',
  'Great co-workers',
  'Autonomy / creative freedom',
  'Job stability / security',
  'Prestige (impresses people)',
  'Learning valuable skills',
  'Leadership opportunities',
  'A mission which is important to you',
  'Intellectually challenging',
  'Equity / financial upside',
];

export const PREDEFINED_QUESTIONS = [
  "What would you do if you didn't have to work for a living?",
  "What would you do career-wise if you knew you wouldn't fail?",
  "What's play for you but work for others?",
  "What was the most fun you ever had while working? Follow-up: Why?",
  "What could you stay excited about for a decade?",
];

const defaultRankingState: RankingState = {
  items: DEFAULT_ITEMS,
  completedComparisons: 0,
  totalEstimatedComparisons: 3 * Math.floor(DEFAULT_ITEMS.length / 2),
  currentPair: null,
  sortedResult: null,
};

export const initialState: SessionState = {
  provider: 'anthropic',
  apiKey: '',
  wizardStep: 'setup',
  questionResponses: PREDEFINED_QUESTIONS.map((q, i) => ({
    questionId: i,
    question: q,
    messages: [],
    isComplete: false,
  })),
  chatMessages: [],
  systemPrompt: '',
  rankingState: defaultRankingState,
  results: '',
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_PROVIDER':
      return { ...state, provider: action.provider };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.apiKey };
    case 'SET_WIZARD_STEP':
      return { ...state, wizardStep: action.step };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'ADD_QUESTION_MESSAGE':
      return {
        ...state,
        questionResponses: state.questionResponses.map((qr) =>
          qr.questionId === action.questionId
            ? { ...qr, messages: [...qr.messages, action.message] }
            : qr
        ),
      };
    case 'SET_QUESTION_COMPLETE':
      return {
        ...state,
        questionResponses: state.questionResponses.map((qr) =>
          qr.questionId === action.questionId
            ? { ...qr, isComplete: true }
            : qr
        ),
      };
    case 'SET_RANKING_STATE':
      return {
        ...state,
        rankingState: { ...state.rankingState, ...action.rankingState },
      };
    case 'SET_RESULTS':
      return { ...state, results: action.results };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const SessionContext = createContext<{
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
} | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}

export function areQuestionsComplete(state: SessionState): boolean {
  return state.questionResponses.every((qr) => qr.isComplete);
}

export function isRankingComplete(state: SessionState): boolean {
  return state.rankingState.sortedResult !== null;
}

export function isStep3Available(state: SessionState): boolean {
  return areQuestionsComplete(state) && isRankingComplete(state);
}
