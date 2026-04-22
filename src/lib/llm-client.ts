import type { Provider, ChatMessage } from '@/types';

interface SendMessageParams {
  provider: Provider;
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
}

export async function* sendMessage(
  params: SendMessageParams,
): AsyncGenerator<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (!response.body) throw new Error('No response body');

  if (params.provider === 'anthropic') {
    yield* parseAnthropicStream(response.body);
  } else {
    yield* parseOpenAIStream(response.body);
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
