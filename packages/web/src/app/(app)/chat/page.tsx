'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: { feedback?: string; rejectionType?: string };
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  messageCount: number;
  updatedAt: string;
}

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Não autenticado');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }

  return res.json();
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 max-w-[80%]">
      <Card className="px-4 py-3 bg-white border-neutral-200">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [rejectionSheet, setRejectionSheet] = useState<{
    open: boolean;
    messageId: string;
  }>({ open: false, messageId: '' });
  const [feedbackGiven, setFeedbackGiven] = useState<
    Record<string, 'liked' | 'rejected'>
  >({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setIsLoading(true);
      const data = await apiFetch<ChatSession[]>('/api/chat/history');
      setSessions(data);
    } catch {
      // silently fail — sessions list is non-critical
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSession(sessionId: string) {
    try {
      setIsLoading(true);
      const data = await apiFetch<{ session: ChatSession; messages: ChatMessage[] }>(
        `/api/chat/history/${sessionId}`,
      );
      setMessages(data.messages);
      setActiveSessionId(sessionId);

      // Restore feedback state from metadata
      const fb: Record<string, 'liked' | 'rejected'> = {};
      for (const msg of data.messages) {
        if (msg.metadata?.feedback) {
          fb[msg.id] = msg.metadata.feedback as 'liked' | 'rejected';
        }
      }
      setFeedbackGiven(fb);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    setIsSending(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const data = await apiFetch<{
        messageId: string;
        sessionId: string;
        response: string;
      }>('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          sessionId: activeSessionId ?? undefined,
        }),
      });

      if (!activeSessionId) {
        setActiveSessionId(data.sessionId);
        loadSessions(); // refresh sidebar
      }

      // Replace temp message and add AI response
      const aiMsg: ChatMessage = {
        id: data.messageId,
        role: 'assistant',
        content: data.response,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...withoutTemp,
          { ...tempUserMsg, id: `user-${Date.now()}` },
          aiMsg,
        ];
      });
    } catch {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  async function submitFeedback(
    messageId: string,
    feedback: 'liked' | 'rejected',
    rejectionType?: 'hard' | 'deferred',
  ) {
    try {
      await apiFetch('/api/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({ messageId, feedback, rejectionType }),
      });
      setFeedbackGiven((prev) => ({ ...prev, [messageId]: feedback }));
    } catch {
      // silently fail
    }
  }

  function handleLike(messageId: string) {
    submitFeedback(messageId, 'liked');
  }

  function handleDislike(messageId: string) {
    setRejectionSheet({ open: true, messageId });
  }

  function handleRejection(type: 'hard' | 'deferred') {
    submitFeedback(rejectionSheet.messageId, 'rejected', type);
    setRejectionSheet({ open: false, messageId: '' });
  }

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setFeedbackGiven({});
    inputRef.current?.focus();
  }

  const showSessionList = !activeSessionId && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
        <h1 className="text-lg font-semibold text-neutral-800">
          Chat com IA
        </h1>
        <Button variant="outline" size="sm" onClick={startNewChat}>
          Nova conversa
        </Button>
      </div>

      {/* Session list or messages */}
      {showSessionList ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <p className="text-center text-neutral-400 mt-8">Carregando...</p>
          ) : sessions.length === 0 ? (
            <div className="text-center mt-12">
              <p className="text-neutral-500 text-lg mb-2">
                Nenhuma conversa ainda
              </p>
              <p className="text-neutral-400 text-sm">
                Envie uma mensagem para iniciar!
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => loadSession(session.id)}
              >
                <p className="font-medium text-neutral-800 truncate">
                  {session.title || 'Conversa sem titulo'}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {session.messageCount} mensagens &middot;{' '}
                  {new Date(session.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                <Card
                  className={`px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </Card>

                {/* Feedback buttons for AI messages */}
                {msg.role === 'assistant' && !msg.id.startsWith('temp-') && (
                  <div className="flex gap-1 mt-1 ml-1">
                    {feedbackGiven[msg.id] ? (
                      <span className="text-xs text-neutral-400">
                        {feedbackGiven[msg.id] === 'liked'
                          ? 'Gostei!'
                          : 'Feedback registrado'}
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-neutral-500 hover:text-green-600"
                          onClick={() => handleLike(msg.id)}
                        >
                          Gostei
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-neutral-500 hover:text-red-600"
                          onClick={() => handleDislike(msg.id)}
                        >
                          Nao quero
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-neutral-200 bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2 max-w-2xl mx-auto"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={isSending}
            className="flex-1"
            maxLength={2000}
          />
          <Button type="submit" disabled={!input.trim() || isSending}>
            Enviar
          </Button>
        </form>
      </div>

      {/* Rejection Sheet */}
      <Sheet
        open={rejectionSheet.open}
        onOpenChange={(open) =>
          setRejectionSheet((prev) => ({ ...prev, open }))
        }
      >
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>O que deseja fazer?</SheetTitle>
            <SheetDescription>
              Escolha como lidar com esta sugestao
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3 mt-4">
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={() => handleRejection('hard')}
            >
              Nunca mais me sugira isso
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleRejection('deferred')}
            >
              Me pergunte de novo depois
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                setRejectionSheet({ open: false, messageId: '' })
              }
            >
              Cancelar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
