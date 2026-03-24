'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

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
      if (data) { sid = data.id; setSessionId(sid); }
    }
    if (!sid) { setSending(false); return; }

    // Save user message
    const { data: userMsgData } = await supabase.from('chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'user', content: userMsg })
      .select().single();
    if (userMsgData) setMessages(prev => [...prev, userMsgData]);

    // Load user context
    const [profileRes, boundariesRes, moodRes, weightRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name, objective').eq('id', user.id).single(),
      supabase.from('user_boundaries').select('item, reason').eq('user_id', user.id).eq('is_active', true),
      supabase.from('mood_logs').select('mood, note').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]).single(),
      supabase.from('weight_logs').select('weight_kg, logged_date').eq('user_id', user.id).order('logged_date', { ascending: false }).limit(7),
    ]);

    const profile = profileRes.data;
    const boundaries = boundariesRes.data || [];
    const todayMood = moodRes.data;
    const weights = weightRes.data || [];

    const moodTones: Record<string, string> = {
      '1': 'Seja gentil e acolhedor. Não pressione.',
      '2': 'Seja informativo e equilibrado.',
      '3': 'Seja amigável e positivo.',
      '4': 'Seja entusiasmado! Celebre conquistas.',
      '5': 'Match a energia alta! Celebre com entusiasmo.',
    };

    const systemPrompt = `Você é um assistente de saúde pessoal chamado FitTracker AI. Amigável, empático e adaptativo.

USUÁRIO: ${profile?.display_name || 'Usuário'} | Objetivo: ${profile?.objective || 'melhorar saúde'}

NUNCA SUGIRA:
${boundaries.length > 0 ? boundaries.map(b => `- "${b.item}"${b.reason ? ` (${b.reason})` : ''}`).join('\n') : '- Nenhuma restrição'}

HUMOR HOJE: ${todayMood?.mood ? `${todayMood.mood}/5` : 'Não registrado'}
${todayMood?.mood ? moodTones[todayMood.mood] || '' : ''}

PESOS RECENTES: ${weights.length > 0 ? weights.map(w => `${w.logged_date}: ${w.weight_kg}kg`).join(', ') : 'Sem dados'}

REGRAS:
- Responda em português brasileiro, conciso (max 3 parágrafos)
- Use emojis moderadamente
- NUNCA sugira itens das restrições acima
- Baseie dicas nos dados reais, não genéricos
- Nunca julgue escolhas do usuário
- Celebre consistência`;

    // Call Gemini directly
    let aiResponse: string;
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: { parts: [{ text: systemPrompt }], role: 'user' },
      });
      const result = await model.generateContent(userMsg);
      aiResponse = result.response.text();
    } catch (err) {
      console.error('Gemini error:', err);
      aiResponse = 'Desculpe, tive um problema para responder. Tente novamente! 🙏';
    }

    // Save AI message
    const { data: aiMsgData } = await supabase.from('chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'assistant', content: aiResponse })
      .select().single();
    if (aiMsgData) setMessages(prev => [...prev, aiMsgData]);

    setSending(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-neutral-800">Chat com IA</h1>
        {!sessionId && <p className="text-sm text-neutral-500">Envie uma mensagem para iniciar!</p>}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-neutral-400 mt-20">
            <p className="text-4xl mb-2">💬</p>
            <p>Pergunte qualquer coisa sobre saúde!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] p-3 ${msg.role === 'user' ? 'bg-primary-500 text-white' : 'bg-white border border-neutral-200'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </Card>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <Card className="p-3 bg-white border border-neutral-200">
              <p className="text-sm text-neutral-400 animate-pulse">Pensando...</p>
            </Card>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-white flex gap-2">
        <Input placeholder="Digite sua mensagem..." value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={sending} />
        <Button onClick={handleSend} disabled={sending || !input.trim()}>Enviar</Button>
      </div>
    </div>
  );
}
