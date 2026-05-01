export type Provider = 'anthropic' | 'openai';

export type WizardStep = 'setup' | 'hub' | 'questions' | 'rank' | 'resume' | 'next-steps' | 'chat';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface QuestionResponse {
  questionId: number;
  question: string;
  answer: string;
  whyAnswer: string;
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
  resumeText: string;
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
  | { type: 'SET_QUESTION_ANSWER'; questionId: number; answer: string }
  | { type: 'SET_QUESTION_WHY'; questionId: number; whyAnswer: string }
  | { type: 'SET_QUESTION_COMPLETE'; questionId: number }
  | { type: 'SET_RANKING_STATE'; rankingState: Partial<RankingState> }
  | { type: 'SET_RESUME_TEXT'; resumeText: string }
  | { type: 'SET_RESULTS'; results: string }
  | { type: 'RESTORE_SESSION'; questionResponses: QuestionResponse[]; sortedResult: string[] | null; resumeText?: string }
  | { type: 'RESET' };
