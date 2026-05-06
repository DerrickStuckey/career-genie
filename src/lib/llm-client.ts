import type { Provider, ChatMessage, ToolDefinition, StreamEvent } from '@/types';

interface SendMessageParams {
  provider: Provider;
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
  model?: string;
}

function buildProviderRequest(
  provider: Provider,
  apiKey: string,
  body: Record<string, unknown>,
): { url: string; init: RequestInit } {
  if (provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      },
    };
  }
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
  };
}

export function toAnthropicMessages(messages: ChatMessage[]): unknown[] {
  return messages.map((m) => {
    if (m.toolCalls && m.toolCalls.length > 0) {
      const content: unknown[] = [];
      if (m.content) content.push({ type: 'text', text: m.content });
      for (const tc of m.toolCalls) {
        content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
      }
      return { role: 'assistant', content };
    }
    if (m.toolResult) {
      return {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: m.toolResult.toolUseId, content: m.content }],
      };
    }
    return { role: m.role, content: m.content };
  });
}

export function toOpenAIMessages(messages: ChatMessage[], systemPrompt: string): unknown[] {
  const result: unknown[] = [{ role: 'system', content: systemPrompt }];
  for (const m of messages) {
    if (m.toolCalls && m.toolCalls.length > 0) {
      result.push({
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.input) },
        })),
      });
    } else if (m.toolResult) {
      result.push({
        role: 'tool',
        tool_call_id: m.toolResult.toolUseId,
        content: m.content,
      });
    } else {
      result.push({ role: m.role, content: m.content });
    }
  }
  return result;
}

export async function* sendMessage(
  params: SendMessageParams,
): AsyncGenerator<StreamEvent> {
  const { provider, apiKey, systemPrompt, messages, tools, maxTokens = 1024, model } = params;

  const effectiveMessages: ChatMessage[] = messages.length === 0
    ? [{ role: 'user' as const, content: 'Begin the coaching session' }]
    : messages[0].role !== 'user'
      ? [{ role: 'user' as const, content: 'Begin the coaching session' }, ...messages]
      : messages;

  const anthropicTools = tools?.length
    ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }))
    : undefined;

  const openaiTools = tools?.length
    ? tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } }))
    : undefined;

  const body =
    provider === 'anthropic'
      ? {
          model: model || 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: toAnthropicMessages(effectiveMessages),
          stream: true,
          ...(anthropicTools ? { tools: anthropicTools } : {}),
        }
      : {
          model: model || 'gpt-4o',
          messages: toOpenAIMessages(effectiveMessages, systemPrompt),
          max_tokens: maxTokens,
          stream: true,
          ...(openaiTools ? { tools: openaiTools } : {}),
        };

  const { url, init } = buildProviderRequest(provider, apiKey, body);
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error('Chat request failed. Please check your API key and try again.');
  }

  if (!response.body) throw new Error('No response body');

  if (provider === 'anthropic') {
    yield* parseAnthropicStream(response.body);
  } else {
    yield* parseOpenAIStream(response.body);
  }
}

export async function validateApiKey(provider: Provider, apiKey: string): Promise<void> {
  const body =
    provider === 'anthropic'
      ? { model: 'claude-sonnet-4-6', max_tokens: 16, system: 'Reply with exactly: ok', messages: [{ role: 'user', content: 'Hello' }] }
      : { model: 'gpt-4o', messages: [{ role: 'system', content: 'Reply with exactly: ok' }, { role: 'user', content: 'Hello' }], max_tokens: 16 };

  const { url, init } = buildProviderRequest(provider, apiKey, body);
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error('Invalid API key. Please check your key and try again.');
  }
}

export async function* parseAnthropicStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let pendingToolCall: { id: string; name: string; jsonChunks: string[] } | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
            pendingToolCall = {
              id: parsed.content_block.id,
              name: parsed.content_block.name,
              jsonChunks: [],
            };
          } else if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'text_delta') {
              yield { type: 'text', text: parsed.delta.text };
            } else if (parsed.delta?.type === 'input_json_delta' && pendingToolCall) {
              pendingToolCall.jsonChunks.push(parsed.delta.partial_json);
            }
          } else if (parsed.type === 'content_block_stop' && pendingToolCall) {
            const input = JSON.parse(pendingToolCall.jsonChunks.join(''));
            yield {
              type: 'tool_call',
              id: pendingToolCall.id,
              name: pendingToolCall.name,
              input,
            };
            pendingToolCall = null;
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* parseOpenAIStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const pendingToolCalls = new Map<number, { id: string; name: string; argChunks: string[] }>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield { type: 'text', text: content };

          const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
          if (toolCalls) {
            for (const tc of toolCalls) {
              const idx = tc.index ?? 0;
              if (!pendingToolCalls.has(idx)) {
                pendingToolCalls.set(idx, { id: '', name: '', argChunks: [] });
              }
              const pending = pendingToolCalls.get(idx)!;
              if (tc.id) pending.id = tc.id;
              if (tc.function?.name) pending.name = tc.function.name;
              if (tc.function?.arguments) pending.argChunks.push(tc.function.arguments);
            }
          }

          const finishReason = parsed.choices?.[0]?.finish_reason;
          if (finishReason === 'tool_calls') {
            for (const tc of pendingToolCalls.values()) {
              const input = JSON.parse(tc.argChunks.join(''));
              yield { type: 'tool_call', id: tc.id, name: tc.name, input };
            }
            pendingToolCalls.clear();
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
