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

    // Generate AI response (placeholder — will use Claude API when configured)
    const aiResponse = generatePlaceholderResponse(userMsg);

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

  function generatePlaceholderResponse(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes('peso') || lower.includes('emagrecer')) {
      return 'Entendi que você quer falar sobre peso! Quando a integração com Claude AI estiver ativa, vou analisar seus registros e dar dicas personalizadas baseadas nos seus dados reais. Por enquanto, continue registrando seu peso diariamente no Log! 💪';
    }
    if (lower.includes('exerc') || lower.includes('treino')) {
      return 'Ótimo que você está se exercitando! Registre seus exercícios no Log para que eu possa acompanhar seu progresso. Em breve, com a AI ativa, vou dar sugestões adaptadas ao seu estilo — respeitando sempre suas preferências! 🏋️';
    }
    if (lower.includes('sono') || lower.includes('dormir')) {
      return 'O sono é fundamental para a saúde! Continue registrando seus horários e qualidade de sono. Quando a AI estiver integrada, vou correlacionar seu sono com humor e exercício para insights personalizados. 🛏️';
    }
    if (lower.includes('água') || lower.includes('agua')) {
      return 'Hidratação é essencial! Não esquece de registrar seus copos de água no Log. A meta padrão é 8 copos por dia, mas podemos ajustar conforme seus dados. 💧';
    }
    if (lower.includes('humor') || lower.includes('triste') || lower.includes('feliz')) {
      return 'Obrigado por compartilhar como você se sente! Registrar o humor diariamente me ajuda a entender seus padrões. Quando a AI estiver ativa, vou adaptar meu tom e sugestões ao seu estado emocional. 😊';
    }
    return `Recebi sua mensagem! Estou em modo de teste — quando a API do Claude for configurada, vou poder conversar sobre seus dados de saúde de forma personalizada. Por enquanto, use o Log para registrar seu dia e o Dashboard para acompanhar o progresso! 🎯`;
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
