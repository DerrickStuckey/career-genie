import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseAnthropicStream, parseOpenAIStream, sendMessage, validateApiKey } from '../llm-client';

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe('parseAnthropicStream', () => {
  it('extracts text deltas from SSE events', async () => {
    const stream = makeStream([
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]);

    const chunks: string[] = [];
    for await (const chunk of parseAnthropicStream(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });
});

describe('parseOpenAIStream', () => {
  it('extracts content deltas from SSE events', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const chunks: string[] = [];
    for await (const chunk of parseOpenAIStream(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });
});

describe('sendMessage', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('calls Anthropic directly with correct URL and headers', async () => {
    const stream = makeStream([
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]);
    fetchSpy.mockResolvedValue(new Response(stream, { status: 200 }));

    const chunks: string[] = [];
    for await (const chunk of sendMessage({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      systemPrompt: 'Be helpful',
      messages: [{ role: 'user', content: 'Hello' }],
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hi']);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        }),
      }),
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(true);
  });

  it('calls OpenAI directly with correct URL and max_tokens', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);
    fetchSpy.mockResolvedValue(new Response(stream, { status: 200 }));

    const chunks: string[] = [];
    for await (const chunk of sendMessage({
      provider: 'openai',
      apiKey: 'sk-test',
      systemPrompt: 'Be helpful',
      messages: [{ role: 'user', content: 'Hello' }],
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hi']);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(true);
  });

  it('throws generic error on failure without leaking upstream body', async () => {
    fetchSpy.mockResolvedValue(new Response('{"error":"secret details"}', { status: 401 }));

    await expect(async () => {
      for await (const _ of sendMessage({
        provider: 'anthropic',
        apiKey: 'bad-key',
        systemPrompt: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        // consume
      }
    }).rejects.toThrow('Chat request failed. Please check your API key and try again.');
  });
});

describe('validateApiKey', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('resolves on successful Anthropic validation', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(validateApiKey('anthropic', 'sk-ant-test')).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.anything(),
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.max_tokens).toBe(16);
  });

  it('resolves on successful OpenAI validation', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(validateApiKey('openai', 'sk-test')).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.anything(),
    );
  });

  it('throws generic error on failed validation', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(validateApiKey('anthropic', 'bad-key')).rejects.toThrow(
      'Invalid API key. Please check your key and try again.',
    );
  });
});
