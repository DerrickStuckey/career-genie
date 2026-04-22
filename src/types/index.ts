export type Provider = 'anthropic' | 'openai';

export type WizardStep = 'setup' | 'chat' | 'rank' | 'results';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RankingState {
  items: string[];
  completedComparisons: number;
  totalEstimatedComparisons: number;
  currentPair: [string, string] | null;
  sortedResult: string[] | null;
}

export interface SessionState {
  provider: Provider;
  apiKey: string;
  wizardStep: WizardStep;
  chatMessages: ChatMessage[];
  systemPrompt: string;
  rankingState: RankingState;
  results: string;
  isReady: boolean;
}

export type SessionAction =
  | { type: 'SET_PROVIDER'; provider: Provider }
  | { type: 'SET_API_KEY'; apiKey: string }
  | { type: 'SET_WIZARD_STEP'; step: WizardStep }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'SET_READY'; isReady: boolean }
  | { type: 'SET_RANKING_STATE'; rankingState: Partial<RankingState> }
  | { type: 'SET_RESULTS'; results: string }
  | { type: 'RESET' };
