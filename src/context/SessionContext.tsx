'use client';

import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { SessionState, SessionAction, RankingState } from '@/types';
import { INTAKE_SYSTEM_PROMPT } from '@/lib/prompts';

const DEFAULT_ITEMS = [
  'High base compensation',
  'Flexible hours',
  'Remote work options',
  'Tangible real-world impact',
  'Career growth opportunities',
  'Great co-workers',
  'Autonomy / creative freedom',
  'Job stability / security',
  'Prestige (impresses people)',
  'Work-life balance',
  'Learning valuable skills',
  'Leadership opportunities',
  'A mission which is important to you',
  'Intellectually challenging',
  'Equity / financial upside',
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
  chatMessages: [],
  systemPrompt: INTAKE_SYSTEM_PROMPT,
  rankingState: defaultRankingState,
  results: '',
  isReady: false,
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
    case 'SET_READY':
      return { ...state, isReady: action.isReady };
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
