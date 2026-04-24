import type { QuestionResponse, ChatMessage } from '@/types';

export function buildQuestionSystemPrompt(question: string): string {
  return `You are Career Genie, a warm and insightful career coach. The user was asked the following reflection question:

"${question}"

Guidelines:
- Acknowledge their response warmly and specifically (reference what they said).
- If their answer is vague or very brief, ask one brief follow-up question to draw out more detail.
- If their answer is detailed and thoughtful, affirm what they shared and offer a brief reflection.
- Keep your responses to 2-3 sentences.
- Do NOT ask unrelated questions or change the topic.
- Do NOT provide career advice yet — that comes later.`;
}

export const CHAT_SYSTEM_PROMPT = `You are Career Genie, providing personalized career coaching based on the user's self-reflection answers and their ranked job preferences.

You will receive:
1. The user's answers to 5 career reflection questions (each with the question and their response)
2. The user's ranked list of job qualities (from most to least important)

Provide actionable, specific career advice that:
- References specific things the user shared in their answers
- Aligns recommendations with their top-ranked preferences
- Suggests 2-3 concrete career paths or next steps
- Acknowledges trade-offs honestly (e.g., "Your top priority is salary, but you also value mission-driven work — here's how to balance that")
- Keeps advice grounded and realistic

Format your response with clear sections. Be direct but supportive. After your initial analysis, engage in open-ended conversation to explore further.`;

export function buildChatContextMessages(
  questionResponses: QuestionResponse[],
  rankedQualities: string[],
): ChatMessage[] {
  const qaSummary = questionResponses
    .map((qr) => {
      const userMessages = qr.messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n');
      return `Question: "${qr.question}"\nAnswer: ${userMessages || '(not answered)'}`;
    })
    .join('\n\n');

  const rankingSummary = rankedQualities
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

  return [
    {
      role: 'user' as const,
      content: `Here are my answers to the career reflection questions:\n\n${qaSummary}\n\nAnd here are my job qualities ranked from most to least important:\n\n${rankingSummary}\n\nBased on all of this, what career advice do you have for me?`,
    },
  ];
}
