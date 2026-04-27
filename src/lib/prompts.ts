import type { QuestionResponse, ChatMessage } from '@/types';

export const CHAT_SYSTEM_PROMPT = `You are Career Genie, providing personalized career coaching based on the user's self-reflection answers and their ranked job preferences.

You will receive:
1. The user's answers to 5 career reflection questions (each with the question, their answer, and optionally why)
2. The user's ranked list of job qualities (from most to least important)
3. Optionally, the user's resume text

Provide actionable, specific career advice that:
- References specific things the user shared in their answers
- Aligns recommendations with their top-ranked preferences
- If a resume is provided, connect their experience to potential directions
- Suggests 2-3 concrete career paths or next steps
- Acknowledges trade-offs honestly (e.g., "Your top priority is salary, but you also value mission-driven work — here's how to balance that")
- Keeps advice grounded and realistic

Format your response with clear sections. Be direct but supportive. After your initial analysis, engage in open-ended conversation to explore further.`;

export function buildChatContextMessages(
  questionResponses: QuestionResponse[],
  rankedQualities: string[],
  resumeText?: string,
): ChatMessage[] {
  const qaSummary = questionResponses
    .map((qr) => {
      if (!qr.answer.trim()) return `Question: "${qr.question}"\nAnswer: (not answered)`;
      let entry = `Question: "${qr.question}"\nAnswer: ${qr.answer}`;
      if (qr.whyAnswer.trim()) {
        entry += `\nWhy: ${qr.whyAnswer}`;
      }
      return entry;
    })
    .join('\n\n');

  const rankingSummary = rankedQualities
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

  let content = `Here are my answers to the career reflection questions:\n\n${qaSummary}\n\nAnd here are my job qualities ranked from most to least important:\n\n${rankingSummary}`;

  if (resumeText && resumeText.trim()) {
    content += `\n\nHere is my resume:\n\n${resumeText.trim()}`;
  }

  content += '\n\nBased on all of this, what career advice do you have for me?';

  return [{ role: 'user' as const, content }];
}
