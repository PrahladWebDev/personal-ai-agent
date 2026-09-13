import ReactMarkdown from 'react-markdown';
import { Copy, RefreshCcw } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { SourceCard } from './SourceCard';

export function MessageBubble({
  message,
  onRegenerate,
}: {
  message: ChatMessage;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-brand text-white rounded-br-sm'
              : 'bg-slate-100 dark:bg-slate-900 rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown>{message.content || (message.isStreaming ? '…' : '')}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && !message.isStreaming && message.content && (
          <div className="mt-1 flex gap-3 px-1 text-xs text-slate-400">
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Copy size={12} /> Copy
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200">
                <RefreshCcw size={12} /> Regenerate
              </button>
            )}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {message.sources.map((s, i) => (
              <SourceCard key={`${s.sourceType}-${s.sourceId}-${i}`} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
