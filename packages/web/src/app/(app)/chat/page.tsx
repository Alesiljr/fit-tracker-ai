'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    const userMsg = input.trim();
    setInput('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create session if needed
    let sid = sessionId;
    if (!sid) {
      const { data } = await supabase.from('chat_sessions')
        .insert({ user_id: user.id, title: userMsg.slice(0, 50) })
        .select('id')
        .single();
      if (data) {
        sid = data.id;
        setSessionId(sid);
      }
    }
    if (!sid) { setSending(false); return; }

    // Save user message
    const { data: userMsgData } = await supabase.from('chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'user', content: userMsg })
      .select()
      .single();

    if (userMsgData) {
      setMessages(prev => [...prev, userMsgData]);
    }

    // Call Gemini AI via API route
    let aiResponse: string;
    try {
      const aiRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, userId: user.id }),
      });
      const aiData = await aiRes.json();
      aiResponse = aiData.response || 'Desculpe, não consegui responder.';
    } catch {
      aiResponse = 'Erro ao conectar com a AI. Tente novamente.';
    }

    const { data: aiMsgData } = await supabase.from('chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'assistant', content: aiResponse })
      .select()
      .single();

    if (aiMsgData) {
      setMessages(prev => [...prev, aiMsgData]);
    }

    // Update session message count
    await supabase.from('chat_sessions')
      .update({ message_count: messages.length + 2, updated_at: new Date().toISOString() })
      .eq('id', sid);

    setSending(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-neutral-800">Chat com IA</h1>
        {!sessionId && (
          <p className="text-sm text-neutral-500">Envie uma mensagem para iniciar!</p>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-neutral-400 mt-20">
            <p className="text-4xl mb-2">💬</p>
            <p>Nenhuma mensagem ainda</p>
            <p className="text-sm">Pergunte qualquer coisa sobre saúde!</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] p-3 ${
              msg.role === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-white border border-neutral-200'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </Card>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <Card className="p-3 bg-white border border-neutral-200">
              <p className="text-sm text-neutral-400">Pensando...</p>
            </Card>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex gap-2">
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !input.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
