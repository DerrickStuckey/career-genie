import type { ChatMessage as ChatMessageType } from '@/types';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-600 text-white'
            : 'bg-white text-stone-900 border border-stone-200'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
