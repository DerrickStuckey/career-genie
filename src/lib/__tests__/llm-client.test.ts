import { describe, it, expect } from 'vitest';
import { parseAnthropicStream, parseOpenAIStream } from '../llm-client';

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
