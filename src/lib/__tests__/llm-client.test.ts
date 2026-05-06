import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StreamEvent } from '@/types';
import { parseAnthropicStream, parseOpenAIStream, sendMessage, validateApiKey, toAnthropicMessages, toOpenAIMessages } from '../llm-client';

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

    const events: StreamEvent[] = [];
    for await (const event of parseAnthropicStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' },
    ]);
  });
});

describe('parseAnthropicStream — tool calls', () => {
  it('yields tool_call event from streamed tool_use blocks', async () => {
    const stream = makeStream([
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Updating..."}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_123","name":"update_rankings","input":{}}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"rankings\\""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":": [\\"A\\", \\"B\\"]}"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]);

    const events: StreamEvent[] = [];
    for await (const event of parseAnthropicStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'text', text: 'Updating...' },
      { type: 'tool_call', id: 'toolu_123', name: 'update_rankings', input: { rankings: ['A', 'B'] } },
    ]);
  });
});

describe('parseOpenAIStream', () => {
  it('extracts content deltas from SSE events', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const events: StreamEvent[] = [];
    for await (const event of parseOpenAIStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' },
    ]);
  });
});

describe('parseOpenAIStream — tool calls', () => {
  it('yields tool_call event from streamed tool_calls', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"Updating..."}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_abc","type":"function","function":{"name":"update_rankings","arguments":""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"rankings\\""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":": [\\"A\\", \\"B\\"]}"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const events: StreamEvent[] = [];
    for await (const event of parseOpenAIStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'text', text: 'Updating...' },
      { type: 'tool_call', id: 'call_abc', name: 'update_rankings', input: { rankings: ['A', 'B'] } },
    ]);
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

    const events: StreamEvent[] = [];
    for await (const event of sendMessage({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      systemPrompt: 'Be helpful',
      messages: [{ role: 'user', content: 'Hello' }],
    })) {
      events.push(event);
    }

    expect(events).toEqual([{ type: 'text', text: 'Hi' }]);
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

    const events: StreamEvent[] = [];
    for await (const event of sendMessage({
      provider: 'openai',
      apiKey: 'sk-test',
      systemPrompt: 'Be helpful',
      messages: [{ role: 'user', content: 'Hello' }],
    })) {
      events.push(event);
    }

    expect(events).toEqual([{ type: 'text', text: 'Hi' }]);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(true);
  });

  it('uses custom maxTokens for Anthropic when provided', async () => {
    const stream = makeStream([
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]);
    fetchSpy.mockResolvedValue(new Response(stream, { status: 200 }));

    for await (const _ of sendMessage({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      systemPrompt: 'test',
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 4096,
    })) { /* consume */ }

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.max_tokens).toBe(4096);
  });

  it('uses custom maxTokens for OpenAI when provided', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);
    fetchSpy.mockResolvedValue(new Response(stream, { status: 200 }));

    for await (const _ of sendMessage({
      provider: 'openai',
      apiKey: 'sk-test',
      systemPrompt: 'test',
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 2048,
    })) { /* consume */ }

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.max_tokens).toBe(2048);
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

describe('toAnthropicMessages', () => {
  it('passes plain text messages through', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
    ];
    expect(toAnthropicMessages(messages)).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]);
  });

  it('converts assistant message with toolCalls to content blocks', () => {
    const messages = [{
      role: 'assistant' as const,
      content: 'Updating rankings...',
      toolCalls: [{ id: 'toolu_123', name: 'update_rankings', input: { rankings: ['A', 'B'] } }],
    }];
    const result = toAnthropicMessages(messages);
    expect(result).toEqual([{
      role: 'assistant',
      content: [
        { type: 'text', text: 'Updating rankings...' },
        { type: 'tool_use', id: 'toolu_123', name: 'update_rankings', input: { rankings: ['A', 'B'] } },
      ],
    }]);
  });

  it('converts toolResult message to tool_result content block', () => {
    const messages = [{
      role: 'user' as const,
      content: 'Rankings updated successfully.',
      toolResult: { toolUseId: 'toolu_123' },
    }];
    const result = toAnthropicMessages(messages);
    expect(result).toEqual([{
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_123', content: 'Rankings updated successfully.' }],
    }]);
  });
});

describe('toOpenAIMessages', () => {
  it('includes system prompt and passes plain messages through', () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const result = toOpenAIMessages(messages, 'Be helpful');
    expect(result).toEqual([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('converts assistant message with toolCalls to OpenAI format', () => {
    const messages = [{
      role: 'assistant' as const,
      content: 'Updating...',
      toolCalls: [{ id: 'call_abc', name: 'update_rankings', input: { rankings: ['A'] } }],
    }];
    const result = toOpenAIMessages(messages, 'sys');
    expect(result[1]).toEqual({
      role: 'assistant',
      content: 'Updating...',
      tool_calls: [{
        id: 'call_abc',
        type: 'function',
        function: { name: 'update_rankings', arguments: '{"rankings":["A"]}' },
      }],
    });
  });

  it('converts toolResult message to OpenAI tool role', () => {
    const messages = [{
      role: 'user' as const,
      content: 'Done.',
      toolResult: { toolUseId: 'call_abc' },
    }];
    const result = toOpenAIMessages(messages, 'sys');
    expect(result[1]).toEqual({
      role: 'tool',
      tool_call_id: 'call_abc',
      content: 'Done.',
    });
  });
});
