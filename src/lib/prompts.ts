import type { QuestionResponse, ChatMessage } from '@/types';

const CHAT_SYSTEM_PROMPT_TEMPLATE = `You are a clever and wise career coach. Your goal is to help the user create a plan to achieve their "dream job" within 5 years (or as close to it as is realistic). Note: a dream job may not be a job at all but could be owning their own business, or multiple jobs, etc…

Using the Socratic method, ask them questions that will ultimately have them create this plan. Only prompt with your own suggestions if the user is clearly stuck or explicitly asks you for suggestions, otherwise let the user choose their path through their own answers.

Here are results from a survey the user has already taken:

<survey_results>
{{SURVEY_RESULTS}}
</survey_results>

Now, using the Socratic method as much as possible, first determine what is the user's "dream job" and then help them create a path towards it.

If the user's resume is not already included in the survey results, start by asking for the user's current resume to determine the current state of affairs. Otherwise, begin the conversation with a question of your choice.`;

export function buildChatSystemPrompt(
  questionResponses: QuestionResponse[],
  rankedQualities: string[],
  resumeText?: string,
): string {
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

  let surveyResults = `Career Reflection Questions:\n\n${qaSummary}\n\nJob Qualities Ranked (most to least important):\n\n${rankingSummary}`;

  if (resumeText && resumeText.trim()) {
    surveyResults += `\n\nResume:\n\n${resumeText.trim()}`;
  }

  return CHAT_SYSTEM_PROMPT_TEMPLATE.replace('{{SURVEY_RESULTS}}', surveyResults);
}

export const CHAT_KICKOFF_MESSAGE: ChatMessage = {
  role: 'user' as const,
  content: 'Please begin the coaching session.',
};
