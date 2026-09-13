'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, Bot } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import type { ChatMessage, Source } from '@/types';
import { MessageBubble } from './MessageBubble';
import { SuggestedQuestions } from './SuggestedQuestions';

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Chat state survives a page refresh by round-tripping through localStorage.
// There's no backend endpoint to fetch a conversation's message history by
// id, so the messages themselves (not just the conversationId) are persisted
// client-side. The backend still independently stores the full conversation
// server-side and replays it as LLM context on each new message.
const STORAGE_KEY = 'personalAiAgent.chat';

interface StoredChat {
  conversationId: string;
  messages: ChatMessage[];
}

function loadStoredChat(): StoredChat | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.conversationId || !Array.isArray(parsed?.messages)) return null;
    // Drop any message that was left mid-stream by a hard refresh/crash —
    // it has no way to ever complete now.
    const messages = (parsed.messages as ChatMessage[])
      .filter((m) => !m.isStreaming)
      .map((m) => ({ ...m, isStreaming: false }));
    return { conversationId: parsed.conversationId, messages };
  } catch {
    return null;
  }
}

function saveStoredChat(chat: StoredChat) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chat));
  } catch {
    // Storage can fail (quota, private browsing) — losing persistence isn't fatal.
  }
}

function clearStoredChat() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function ChatWindow({ agentName }: { agentName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string>(uid());
  const lastQuestionRef = useRef<string>('');
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage once, on mount (client-only — avoids SSR mismatch).
  useEffect(() => {
    const stored = loadStoredChat();
    if (stored) {
      conversationIdRef.current = stored.conversationId;
      setMessages(stored.messages);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change, once initial hydration has happened (so we
  // don't immediately overwrite storage with the empty initial state).
  useEffect(() => {
    if (!hydrated) return;
    if (messages.length === 0) {
      clearStoredChat();
      return;
    }
    saveStoredChat({ conversationId: conversationIdRef.current, messages });
  }, [messages, hydrated]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    lastQuestionRef.current = trimmed;
    setError(null);
    setInput('');

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed };
    const assistantId = uid();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', isStreaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId: conversationIdRef.current }),
      });

      if (!res.ok || !res.body) {
        throw new Error('The agent is unavailable right now.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const raw of events) {
          const lines = raw.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!dataLine) continue;

          const eventName = eventLine ? eventLine.replace('event:', '').trim() : 'message';
          const data = JSON.parse(dataLine.replace('data:', '').trim());

          if (eventName === 'token') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + data } : m))
            );
          } else if (eventName === 'sources') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, sources: data as Source[] } : m))
            );
          } else if (eventName === 'done') {
            if (data?.conversationId) conversationIdRef.current = data.conversationId;
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)));
          }
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)));
    } finally {
      setIsSending(false);
    }
  }

  function regenerateLast() {
    setMessages((prev) => prev.slice(0, -2));
    sendMessage(lastQuestionRef.current);
  }

  function clearChat() {
    setMessages([]);
    conversationIdRef.current = uid();
    clearStoredChat();
  }

  const hasStarted = messages.length > 0;

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto px-4">
      {!hasStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 text-brand">
            <Bot size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Ask About {agentName || 'Me'}</h1>
            <p className="text-slate-500 mt-2">
              I&apos;m {agentName || "this developer"}&apos;s personal AI agent. Ask me about skills,
              experience, projects, or development work.
            </p>
          </div>
          <SuggestedQuestions onPick={sendMessage} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onRegenerate={m.role === 'assistant' && !m.isStreaming ? regenerateLast : undefined} />
          ))}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-800 py-4">
        {hasStarted && (
          <div className="flex justify-end mb-2">
            <button onClick={clearChat} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Trash2 size={12} /> Clear chat
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about me..."
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="rounded-xl bg-brand text-white p-3 disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
