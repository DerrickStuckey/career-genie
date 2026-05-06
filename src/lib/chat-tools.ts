import type { ToolDefinition, ToolCall } from '@/types';

export const UPDATE_RANKINGS_TOOL: ToolDefinition = {
  name: 'update_rankings',
  description:
    'Update the user\'s priority rankings. Provide the complete list of qualities in the new desired order, from most important (first) to least important (last). All existing qualities must be included.',
  // TODO: Use an enum in items to restrict values to the user's actual ranking attributes.
  // This would let provider structured outputs reject invalid items at the API level.
  inputSchema: {
    type: 'object',
    properties: {
      rankings: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Complete ordered list of career qualities, most important first. Must contain all qualities.',
      },
    },
    required: ['rankings'],
  },
};

export const UPDATE_RESUME_TOOL: ToolDefinition = {
  name: 'update_resume',
  description:
    'Update the user\'s resume. Provide the complete updated resume as a single markdown string. This performs a full replacement of the resume each time.',
  inputSchema: {
    type: 'object',
    properties: {
      resume: {
        type: 'string',
        description:
          'The complete updated resume in markdown format. Must be the full resume, not a partial update.',
      },
    },
    required: ['resume'],
  },
};

export const CHAT_TOOLS: ToolDefinition[] = [UPDATE_RANKINGS_TOOL, UPDATE_RESUME_TOOL];

export function executeUpdateRankings(
  input: Record<string, unknown>,
  currentItems: string[],
): { success: boolean; resultText: string; newRankings?: string[] } {
  const rankings = input.rankings;

  if (!Array.isArray(rankings)) {
    return { success: false, resultText: 'Error: rankings must be an array.' };
  }

  if (rankings.length !== currentItems.length) {
    return {
      success: false,
      resultText: `Error: expected ${currentItems.length} items, got ${rankings.length}.`,
    };
  }

  const itemMap = new Map(currentItems.map((i) => [i.toLowerCase(), i]));
  const normalizedNew = rankings.map((r: string) => r.toLowerCase());

  for (const item of normalizedNew) {
    if (!itemMap.has(item)) {
      return { success: false, resultText: `Error: "${item}" is not a valid career quality.` };
    }
  }

  if (new Set(normalizedNew).size !== normalizedNew.length) {
    return { success: false, resultText: 'Error: duplicate items in rankings.' };
  }

  const newRankings = normalizedNew.map((n) => itemMap.get(n)!);
  const resultText =
    'Rankings updated successfully. New order:\n' +
    newRankings.map((r, i) => `${i + 1}. ${r}`).join('\n');

  return { success: true, resultText, newRankings };
}

export function executeUpdateResume(
  input: Record<string, unknown>,
): { success: boolean; resultText: string; newResume?: string } {
  const resume = input.resume;

  if (typeof resume !== 'string') {
    return { success: false, resultText: 'Error: resume must be a string.' };
  }

  if (!resume.trim()) {
    return { success: false, resultText: 'Error: resume must not be empty.' };
  }

  return {
    success: true,
    resultText: 'Resume updated successfully.',
    newResume: resume,
  };
}

export function executeToolCall(
  toolCall: ToolCall,
  currentRankings: string[],
): { resultText: string; newRankings?: string[]; newResume?: string } {
  if (toolCall.name === 'update_rankings') {
    const result = executeUpdateRankings(toolCall.input, currentRankings);
    return {
      resultText: result.resultText,
      newRankings: result.success ? result.newRankings : undefined,
    };
  }
  if (toolCall.name === 'update_resume') {
    const result = executeUpdateResume(toolCall.input);
    return {
      resultText: result.resultText,
      newResume: result.success ? result.newResume : undefined,
    };
  }
  return { resultText: `Error: unknown tool "${toolCall.name}".` };
}
