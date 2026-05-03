import type { ChatMessage as ChatMessageType } from '@/types';
import ReactMarkdown from 'react-markdown';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className="flex justify-center mb-4">
      <div
        className={`w-full rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-500 text-white'
            : 'bg-white text-stone-900 border border-stone-200'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-stone max-w-none
            prose-p:leading-relaxed prose-p:my-1.5
            prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:font-semibold
            prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
            prose-pre:bg-stone-100 prose-pre:rounded-lg prose-pre:text-xs
            prose-code:text-emerald-700 prose-code:font-normal
            prose-code:before:content-none prose-code:after:content-none
            prose-a:text-emerald-600 prose-a:underline
            [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
