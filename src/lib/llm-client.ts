import type { Provider, ChatMessage } from '@/types';

interface SendMessageParams {
  provider: Provider;
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
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

export async function* sendMessage(
  params: SendMessageParams,
): AsyncGenerator<string> {
  const { provider, apiKey, systemPrompt, messages } = params;

  const body =
    provider === 'anthropic'
      ? { model: 'claude-sonnet-4-6', max_tokens: 1024, system: systemPrompt, messages, stream: true }
      : { model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 1024, stream: true };

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
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta'
          ) {
            yield parsed.delta.text;
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
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
          if (content) yield content;
        } catch {
          // skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
