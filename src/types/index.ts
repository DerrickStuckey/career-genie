export type Provider = 'anthropic' | 'openai';

export type WizardStep = 'setup' | 'hub' | 'questions' | 'rank' | 'chat';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface QuestionResponse {
  questionId: number;
  question: string;
  messages: ChatMessage[];
  isComplete: boolean;
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
  questionResponses: QuestionResponse[];
  chatMessages: ChatMessage[];
  systemPrompt: string;
  rankingState: RankingState;
  results: string;
}

export type SessionAction =
  | { type: 'SET_PROVIDER'; provider: Provider }
  | { type: 'SET_API_KEY'; apiKey: string }
  | { type: 'SET_WIZARD_STEP'; step: WizardStep }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'ADD_QUESTION_MESSAGE'; questionId: number; message: ChatMessage }
  | { type: 'SET_QUESTION_COMPLETE'; questionId: number }
  | { type: 'SET_RANKING_STATE'; rankingState: Partial<RankingState> }
  | { type: 'SET_RESULTS'; results: string }
  | { type: 'RESET' };
