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
  metadata?: { image?: string };
}

interface Session {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const MAX_CONTEXT_MESSAGES = 20;

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { loadSessions(); }, []);

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  async function loadSessions() {
    const user = await getUser();
    if (!user) return;
    const { data } = await supabase.from('chat_sessions')
      .select('id, title, updated_at, message_count')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (data) setSessions(data);

    // Auto-load most recent
    if (data && data.length > 0) {
      loadSession(data[0].id);
    }
  }

  async function loadSession(sid: string) {
    setSessionId(sid);
    setShowSidebar(false);
    const { data } = await supabase.from('chat_messages')
      .select('*')
      .eq('session_id', sid)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  async function newSession() {
    setSessionId(null);
    setMessages([]);
    setShowSidebar(false);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend() {
    if ((!input.trim() && !imageFile) || sending) return;
    setSending(true);
    const userMsg = input.trim();
    setInput('');

    const user = await getUser();
    if (!user) return;

    // Create session if needed
    let sid = sessionId;
    if (!sid) {
      const title = userMsg.slice(0, 50) || 'Análise de imagem';
      const { data } = await supabase.from('chat_sessions')
        .insert({ user_id: user.id, title })
        .select('id').single();
      if (data) { sid = data.id; setSessionId(sid); loadSessions(); }
    }
    if (!sid) { setSending(false); return; }

    // Save user message
    const metadata = imagePreview ? { image: imagePreview.slice(0, 100) + '...' } : {};
    const { data: userMsgData } = await supabase.from('chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'user', content: userMsg || '📷 Imagem enviada', metadata })
      .select().single();
    if (userMsgData) setMessages(prev => [...prev, userMsgData]);

    // Load context
    const [profileRes, boundariesRes, moodRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name, objective').eq('id', user.id).single(),
      supabase.from('user_boundaries').select('item, reason').eq('user_id', user.id).eq('is_active', true),
      supabase.from('mood_logs').select('mood, note').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const boundaries = boundariesRes.data || [];
    const todayMood = moodRes.data;

    const objectiveLabels: Record<string, string> = {
      lose_weight: 'perder peso', gain_muscle: 'ganhar massa muscular',
      improve_health: 'melhorar a saúde geral', maintain: 'manter a forma atual',
    };

    const systemPrompt = `Você é o FitTracker AI, assistente de saúde pessoal. Amigável, empático, adaptativo.
USUÁRIO: ${profile?.display_name || 'Usuário'} | Objetivo: ${objectiveLabels[profile?.objective || ''] || 'melhorar saúde'}
NUNCA SUGIRA: ${boundaries.length > 0 ? boundaries.map(b => `"${b.item}"`).join(', ') : 'nenhuma restrição'}
HUMOR HOJE: ${todayMood?.mood ? `${todayMood.mood}/5` : 'não registrado'}
REGRAS: Responda em português brasileiro, conciso (max 3 parágrafos), use emojis moderadamente, nunca julgue, celebre consistência.
Se receber uma imagem de comida, identifique os alimentos e estime calorias.
Se receber uma imagem de exercício/corpo, analise e dê dicas respeitando as preferências do usuário.`;

    // Build Gemini request with context (compact: only last N messages)
    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
    const contents = [
      ...recentMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    // Add current message with optional image
    const currentParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    if (userMsg) currentParts.push({ text: userMsg });
    if (imageFile && imagePreview) {
      const base64 = imagePreview.split(',')[1];
      currentParts.push({
        inline_data: { mime_type: imageFile.type, data: base64 },
      });
    }
    contents.push({ role: 'user', parts: currentParts as Array<{ text: string }> });

    // Clear image after sending
    removeImage();

    // Call Gemini
    let aiResponse: string;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
          }),
        },
      );
      const data = await res.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui gerar uma resposta.';
    } catch {
      aiResponse = 'Desculpe, tive um problema para responder. Tente novamente! 🙏';
    }

    // Save AI message
    const { data: aiMsgData } = await supabase.from('chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'assistant', content: aiResponse })
      .select().single();
    if (aiMsgData) setMessages(prev => [...prev, aiMsgData]);

    // Update session
    await supabase.from('chat_sessions')
      .update({ message_count: messages.length + 2, updated_at: new Date().toISOString() })
      .eq('id', sid);

    setSending(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-neutral-800">Chat com IA</h1>
          {sessionId && (
            <p className="text-xs text-neutral-400">
              {sessions.find(s => s.id === sessionId)?.title || 'Conversa'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
            📂 Conversas
          </Button>
          <Button variant="outline" size="sm" onClick={newSession}>
            + Nova
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white z-50 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Minhas Conversas</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)}>✕</Button>
          </div>
          <Button className="w-full mb-4" onClick={newSession}>+ Nova conversa</Button>
          {sessions.length === 0 ? (
            <p className="text-neutral-400 text-center">Nenhuma conversa ainda</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <Card
                  key={s.id}
                  className={`p-3 cursor-pointer hover:bg-neutral-50 ${s.id === sessionId ? 'border-primary-500 bg-primary-50' : ''}`}
                  onClick={() => loadSession(s.id)}
                >
                  <p className="font-medium text-sm truncate">{s.title || 'Sem título'}</p>
                  <p className="text-xs text-neutral-400">
                    {s.message_count} msgs — {new Date(s.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !sessionId && (
          <div className="text-center text-neutral-400 mt-20">
            <p className="text-4xl mb-2">💬</p>
            <p>Pergunte qualquer coisa sobre saúde!</p>
            <p className="text-sm mt-1">Você pode anexar fotos de refeições ou exercícios 📷</p>
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

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t bg-neutral-50 flex items-center gap-2">
          <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
          <span className="text-sm text-neutral-500 flex-1">Imagem anexada</span>
          <Button variant="ghost" size="sm" onClick={removeImage}>✕</Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white flex gap-2 items-center">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar imagem"
        >
          📷
        </Button>
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={sending}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={sending || (!input.trim() && !imageFile)}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
