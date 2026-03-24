'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Msg { id: string; role: string; content: string; created_at: string; }
interface Session { id: string; title: string; updated_at: string; message_count: number; }

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { loadSessions(); }, []);

  async function uid() { return (await supabase.auth.getUser()).data.user?.id || ''; }

  async function loadSessions() {
    const id = await uid();
    const { data } = await supabase.from('chat_sessions').select('*').eq('user_id', id).order('updated_at', { ascending: false });
    if (data) setSessions(data);
  }

  async function openSession(sid: string) {
    setSessionId(sid);
    setSidebarOpen(false);
    const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sid).order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  function newChat() { setSessionId(null); setMessages([]); setSidebarOpen(false); }

  async function deleteSession(sid: string) {
    await supabase.from('chat_messages').delete().eq('session_id', sid);
    await supabase.from('chat_sessions').delete().eq('id', sid);
    if (sessionId === sid) newChat();
    loadSessions();
  }

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setImageFile(f);
    const r = new FileReader(); r.onload = () => setImagePreview(r.result as string); r.readAsDataURL(f);
  }
  function clearImage() { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }

  async function send() {
    if ((!input.trim() && !imageFile) || sending) return;
    setSending(true);
    const txt = input.trim(); setInput('');
    const userId = await uid();

    let sid = sessionId;
    if (!sid) {
      const { data } = await supabase.from('chat_sessions').insert({ user_id: userId, title: txt.slice(0, 50) || 'Análise de imagem' }).select('id').single();
      if (data) { sid = data.id; setSessionId(sid); }
    }
    if (!sid) { setSending(false); return; }

    const { data: um } = await supabase.from('chat_messages').insert({ session_id: sid, user_id: userId, role: 'user', content: txt || '📷 Imagem' }).select().single();
    if (um) setMessages(p => [...p, um]);

    const [pr, br, mr] = await Promise.all([
      supabase.from('user_profiles').select('display_name, objective').eq('id', userId).single(),
      supabase.from('user_boundaries').select('item').eq('user_id', userId).eq('is_active', true),
      supabase.from('mood_logs').select('mood').eq('user_id', userId).eq('logged_date', new Date().toISOString().split('T')[0]).maybeSingle(),
    ]);

    const obl: Record<string,string> = { lose_weight:'perder peso', gain_muscle:'ganhar massa', improve_health:'melhorar saúde', maintain:'manter forma' };
    const sys = `Você é o FitTracker AI. Amigável, empático. USUÁRIO: ${pr.data?.display_name||'Usuário'} | Objetivo: ${obl[pr.data?.objective||'']||'melhorar saúde'}. NUNCA SUGIRA: ${(br.data||[]).map((b:{item:string})=>b.item).join(', ')||'nada'}. HUMOR: ${mr.data?.mood||'?'}/5. Responda em PT-BR, conciso, emojis moderados. Se receber imagem de comida, identifique e estime calorias.`;

    const hist = messages.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const parts: Array<Record<string, unknown>> = [];
    if (txt) parts.push({ text: txt });
    if (imageFile && imagePreview) parts.push({ inline_data: { mime_type: imageFile.type, data: imagePreview.split(',')[1] } });
    hist.push({ role: 'user', parts: parts as Array<{text:string}> });
    clearImage();

    let ai = '';
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: hist }),
      });
      const d = await r.json();
      ai = d.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui responder.';
    } catch { ai = 'Erro ao responder. Tente novamente.'; }

    const { data: am } = await supabase.from('chat_messages').insert({ session_id: sid, user_id: userId, role: 'assistant', content: ai }).select().single();
    if (am) setMessages(p => [...p, am]);
    await supabase.from('chat_sessions').update({ message_count: messages.length + 2, updated_at: new Date().toISOString() }).eq('id', sid);
    loadSessions();
    setSending(false);
  }

  const isHome = !sessionId && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 border-r bg-neutral-50 flex-shrink-0 overflow-y-auto`}>
        <div className="p-3">
          <Button className="w-full mb-3" onClick={newChat}>+ Novo chat</Button>
          <p className="text-xs text-neutral-400 uppercase mb-2 px-1">Seus chats</p>
          {sessions.map(s => (
            <div key={s.id} onClick={() => openSession(s.id)}
              className={`p-2 rounded-lg cursor-pointer mb-1 flex justify-between items-center group ${s.id === sessionId ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}>
              <span className="text-sm truncate flex-1">{s.title || 'Sem título'}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs ml-1">✕</button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-neutral-400 text-center py-4">Nenhum chat</p>}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile toggle */}
        <div className="md:hidden p-2 border-b flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</Button>
          <span className="text-sm text-neutral-500 truncate">{sessions.find(s=>s.id===sessionId)?.title || 'FitTracker AI'}</span>
        </div>

        {/* Home / Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {isHome ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-3xl mb-3">🏋️</p>
              <h2 className="text-xl font-semibold text-neutral-700 mb-2">FitTracker AI</h2>
              <p className="text-neutral-400 mb-1">Seu assistente de saúde pessoal</p>
              <p className="text-sm text-neutral-400">Pergunte sobre exercícios, alimentação, sono...</p>
              <p className="text-sm text-neutral-400">ou envie uma foto de refeição para análise 📷</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <Card className={`max-w-[85%] p-3 ${m.role === 'user' ? 'bg-primary-500 text-white' : 'bg-white border'}`}>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </Card>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <Card className="p-3 bg-white border"><p className="text-sm text-neutral-400 animate-pulse">Pensando...</p></Card>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t bg-neutral-50 flex items-center gap-2 max-w-2xl mx-auto w-full">
            <img src={imagePreview} alt="" className="w-14 h-14 object-cover rounded" />
            <span className="text-sm text-neutral-500 flex-1">Imagem anexada</span>
            <Button variant="ghost" size="sm" onClick={clearImage}>✕</Button>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2 max-w-2xl mx-auto items-center">
            <input type="file" ref={fileRef} accept="image/*" onChange={onImage} className="hidden" />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>📷</Button>
            <Input placeholder="Pergunte algo..." value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()} disabled={sending} className="flex-1" />
            <Button onClick={send} disabled={sending || (!input.trim() && !imageFile)}>Enviar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
