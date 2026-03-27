'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TOPIC_LABELS, MESSAGE_TOPICS } from '@fittracker/shared';
import type { MessageTopic } from '@fittracker/shared';
import { Plus, X, Menu, Send, Camera, Activity } from 'lucide-react';

interface Msg { id: string; role: string; content: string; created_at: string; topic?: string; }
interface Session { id: string; title: string; updated_at: string; message_count: number; }

export default function ChatPage() {
  const { user: authUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState<MessageTopic | 'all'>('all');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { if (authUser) loadSessions(); }, [authUser]);

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
      const { data } = await supabase.from('chat_sessions').insert({ user_id: userId, title: txt.slice(0, 50) || 'Analise de imagem' }).select('id').single();
      if (data) { sid = data.id; setSessionId(sid); }
    }
    if (!sid) { setSending(false); return; }

    const { data: um } = await supabase.from('chat_messages').insert({ session_id: sid, user_id: userId, role: 'user', content: txt || 'Imagem enviada' }).select().single();
    if (um) setMessages(p => [...p, um]);

    // Build history (last 20 messages)
    const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    // Prepare image data if present
    let imageData: { mimeType: string; base64: string } | undefined;
    if (imageFile && imagePreview) {
      imageData = { mimeType: imageFile.type, base64: imagePreview.split(',')[1] };
    }
    clearImage();

    // Call server-side API route (Gemini key stays on server)
    let ai = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ message: txt, history, imageData }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await res.json();
      ai = data.response || data.error || 'Desculpe, nao consegui processar sua mensagem.';
    } catch {
      ai = 'Desculpe, a conexao falhou. Tente novamente em alguns segundos.';
    }

    const { data: am } = await supabase.from('chat_messages').insert({ session_id: sid, user_id: userId, role: 'assistant', content: ai }).select().single();
    if (am) setMessages(p => [...p, am]);
    await supabase.from('chat_sessions').update({ message_count: messages.length + 2, updated_at: new Date().toISOString() }).eq('id', sid);

    // Extract health events from user message (fire-and-forget)
    extractHealthEvents(txt, userId).catch(() => {});

    loadSessions();
    setSending(false);
  }

  async function extractHealthEvents(userMsg: string, userId: string) {
    if (!userMsg) return;
    const lower = userMsg.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    const medKeywords = ['ibuprofeno','paracetamol','dipirona','dorflex','buscopan','tylenol','advil','nimesulida','diclofenaco','antialergico','loratadina','amoxicilina','azitromicina','omeprazol','antiinflamatorio','anti-inflamatorio','remedio','comprimido','tomei','vou tomar','estou tomando'];
    const painKeywords = ['dor ','doendo','doeu','inflamacao','inchado','pontada','fisgada','caimbra','torcao','torceu'];
    const symptomKeywords = ['febre','nausea','tontura','enjoo','mal estar','cansaco','insonia','gripe','resfriado','alergia','coceira'];
    const bodyAreas: Record<string, string> = { cabeca:'cabeca', costas:'costas', lombar:'lombar', joelho:'joelho', ombro:'ombro', pescoco:'pescoco', braco:'braco', perna:'perna', pe:'pe', mao:'mao', barriga:'abdomen', abdomen:'abdomen', peito:'peito', garganta:'garganta', ouvido:'ouvido', olho:'olho', dente:'dente', articulacao:'articulacao', junta:'articulacao', coluna:'coluna', quadril:'quadril', tornozelo:'tornozelo', punho:'punho', cotovelo:'cotovelo' };

    let eventType: string | null = null;
    let description = '';

    const foundMed = medKeywords.find(k => lower.includes(k));
    if (foundMed) {
      eventType = 'medication';
      description = foundMed.charAt(0).toUpperCase() + foundMed.slice(1);
      const medNames = ['ibuprofeno','paracetamol','dipirona','dorflex','buscopan','tylenol','advil','nimesulida','diclofenaco','loratadina','amoxicilina','azitromicina','omeprazol'];
      const realMed = medNames.find(m => lower.includes(m));
      if (realMed) description = realMed.charAt(0).toUpperCase() + realMed.slice(1);
    }

    if (!eventType) {
      const foundPain = painKeywords.find(k => lower.includes(k));
      if (foundPain) { eventType = 'pain'; description = 'Dor'; }
    }

    if (!eventType) {
      const foundSymptom = symptomKeywords.find(k => lower.includes(k));
      if (foundSymptom) { eventType = 'symptom'; description = foundSymptom.charAt(0).toUpperCase() + foundSymptom.slice(1); }
    }

    if (!eventType) return;

    let bodyArea: string | null = null;
    for (const [keyword, area] of Object.entries(bodyAreas)) {
      if (lower.includes(keyword)) { bodyArea = area; break; }
    }
    if (bodyArea && eventType === 'pain') description = `Dor ${bodyArea}`;

    let expiresAt: string | null = null;
    const durationMatch = lower.match(/(\d+)\s*dias?/);
    if (durationMatch) {
      const days = parseInt(durationMatch[1]);
      expiresAt = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    }

    let frequency: string | null = null;
    const freqMatch = lower.match(/(\d+)\s*(?:em|\/)\s*(\d+)\s*(?:h|hora)/);
    if (freqMatch) frequency = `${freqMatch[1]}/${freqMatch[2]}h`;

    const { data: existing } = await supabase.from('health_events')
      .select('id,recurrence_count')
      .eq('user_id', userId)
      .ilike('description', `%${description}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.length && existing[0]) {
      await supabase.from('health_events').update({
        recurrence_count: (existing[0].recurrence_count || 1) + 1,
        last_occurrence: today,
        is_active: true,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }).eq('id', existing[0].id);
    } else {
      await supabase.from('health_events').insert({
        user_id: userId,
        event_type: eventType,
        description,
        details: { frequency, original_message: userMsg.substring(0, 200) },
        body_area: bodyArea,
        started_at: today,
        expires_at: expiresAt,
        last_occurrence: today,
      });
    }
  }

  const isHome = !sessionId && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 border-r border-border bg-muted/30 flex-shrink-0 overflow-y-auto`}>
        <div className="p-3">
          <Button className="w-full mb-3" onClick={newChat}><Plus size={14} /> Novo chat</Button>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide-custom mb-2 px-1 font-medium">Seus chats</p>
          {sessions.map(s => (
            <div key={s.id} onClick={() => openSession(s.id)}
              className={`p-2 rounded-lg cursor-pointer mb-1 flex justify-between items-center group transition-colors ${s.id === sessionId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
              <span className="text-sm truncate flex-1">{s.title || 'Sem titulo'}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all ml-1"><X size={12} /></button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum chat</p>}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile toggle */}
        <div className="md:hidden p-2 border-b border-border flex gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={16} /></Button>
          <span className="text-sm text-muted-foreground truncate">{sessions.find(s=>s.id===sessionId)?.title || 'FitTracker AI'}</span>
        </div>

        {/* Topic Filters */}
        {!isHome && (
          <div className="px-3 pt-2 pb-1 border-b border-border flex gap-1.5 overflow-x-auto">
            <button onClick={() => setTopicFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${topicFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              Tudo
            </button>
            {MESSAGE_TOPICS.map(t => (
              <button key={t} onClick={() => setTopicFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${topicFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {TOPIC_LABELS[t]}
              </button>
            ))}
          </div>
        )}

        {/* Home / Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {isHome ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Activity size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">FitTracker AI</h2>
              <p className="text-muted-foreground mb-1">Seu assistente de saude pessoal</p>
              <p className="text-sm text-muted-foreground">Pergunte sobre exercicios, alimentacao, sono...</p>
              <p className="text-sm text-muted-foreground">ou envie uma foto de refeicao para analise</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {messages.filter(m => topicFilter === 'all' || m.topic === topicFilter).map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <Card className={`max-w-[85%] p-3 ${m.role === 'user' ? 'bg-primary text-primary-foreground border-0' : ''}`}>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </Card>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <Card className="p-3"><p className="text-sm text-muted-foreground animate-pulse">Pensando...</p></Card>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2 max-w-2xl mx-auto w-full">
            <img src={imagePreview} alt="" className="w-14 h-14 object-cover rounded-lg" />
            <span className="text-sm text-muted-foreground flex-1">Imagem anexada</span>
            <Button variant="ghost" size="sm" onClick={clearImage}><X size={14} /></Button>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex gap-2 max-w-2xl mx-auto items-center">
            <input type="file" ref={fileRef} accept="image/*" onChange={onImage} className="hidden" />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><Camera size={16} /></Button>
            <Input placeholder="Pergunte algo..." value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()} disabled={sending} className="flex-1" />
            <Button onClick={send} disabled={sending || (!input.trim() && !imageFile)}><Send size={14} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
