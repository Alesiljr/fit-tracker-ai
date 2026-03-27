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

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export default function ChatPage() {
  const { user: authUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState<MessageTopic | 'all'>('all');
  const cachedPromptRef = useRef<string | null>(null);
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
    cachedPromptRef.current = null;
    const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sid).order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  function newChat() { setSessionId(null); setMessages([]); setSidebarOpen(false); cachedPromptRef.current = null; }

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

  async function buildSystemPrompt(userId: string): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    // Parallel: profile + health (static) and dynamic data
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const [profileRes, healthRes, boundariesRes, prefsRes, goalsRes, moodRes, weightsRes, exercisesRes, waterRes, sleepRes, stepsRes, activeEventsRes, recentEventsRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name,date_of_birth,gender,height_cm,initial_weight,blood_type,objective').eq('id', userId).single(),
      supabase.from('user_health_info').select('health_conditions,allergies,intolerances,medications,supplements').eq('user_id', userId).maybeSingle(),
      supabase.from('user_boundaries').select('item,category,boundary_type').eq('user_id', userId).eq('is_active', true),
      supabase.from('user_preferences').select('item,category').eq('user_id', userId).eq('is_active', true),
      supabase.from('user_goals').select('title,target_value,unit,direction').eq('user_id', userId).eq('status', 'active'),
      supabase.from('mood_logs').select('mood').eq('user_id', userId).eq('logged_date', today).maybeSingle(),
      supabase.from('weight_logs').select('logged_date,weight_kg').eq('user_id', userId).gte('logged_date', weekAgo).order('logged_date', { ascending: false }).limit(3),
      supabase.from('exercise_logs').select('logged_date,raw_input,total_duration_min').eq('user_id', userId).gte('logged_date', weekAgo).order('logged_date', { ascending: false }).limit(3),
      supabase.from('water_logs').select('logged_date,glasses').eq('user_id', userId).gte('logged_date', weekAgo).order('logged_date', { ascending: false }).limit(3),
      supabase.from('sleep_logs').select('logged_date,duration_min,quality').eq('user_id', userId).gte('logged_date', weekAgo).order('logged_date', { ascending: false }).limit(3),
      supabase.from('step_logs').select('logged_date,steps').eq('user_id', userId).gte('logged_date', weekAgo).order('logged_date', { ascending: false }).limit(3),
      supabase.from('health_events').select('event_type,description,details,body_area,severity,expires_at').eq('user_id', userId).eq('is_active', true),
      supabase.from('health_events').select('description,event_type,recurrence_count,last_occurrence').eq('user_id', userId).gte('last_occurrence', monthAgo).order('last_occurrence', { ascending: false }).limit(10),
    ]);

    const p = profileRes.data;
    const h = healthRes.data;
    const name = p?.display_name || 'Usuario';
    const obj: Record<string,string> = { lose_weight:'perder peso', gain_muscle:'ganhar massa', improve_health:'melhorar saude', maintain:'manter forma' };

    // Build compact profile line
    const profile: string[] = [name];
    if (p?.date_of_birth) profile.push(`${Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000)}a`);
    if (p?.gender) profile.push(p.gender);
    if (p?.height_cm) profile.push(`${p.height_cm}cm`);
    if (p?.initial_weight) profile.push(`${p.initial_weight}kg`);
    if (p?.blood_type) profile.push(p.blood_type);

    // Compact health
    const hp: string[] = [];
    const conds = (h?.health_conditions as Array<{name:string;severity?:string}> || []);
    if (conds.length) hp.push(`Condicoes: ${conds.map(c => `${c.name}${c.severity ? `(${c.severity})` : ''}`).join(', ')}`);
    if (h?.allergies?.length) hp.push(`Alergias: ${h.allergies.join(', ')}`);
    if (h?.intolerances?.length) hp.push(`Intolerancias: ${h.intolerances.join(', ')}`);
    const meds = (h?.medications as Array<{name:string;dosage?:string;frequency?:string}> || []);
    if (meds.length) hp.push(`Meds: ${meds.map(m => `${m.name}${m.dosage ? ' '+m.dosage : ''}${m.frequency ? ' '+m.frequency : ''}`).join(', ')}`);
    const supps = (h?.supplements as Array<{name:string;dosage?:string;frequency?:string}> || []);
    if (supps.length) hp.push(`Suplem: ${supps.map(s => `${s.name}${s.frequency ? ' '+s.frequency : ''}`).join(', ')}`);

    // Compact boundaries/prefs
    const bounds = (boundariesRes.data || []).map((b: any) => b.item).join(', ');
    const prefs = (prefsRes.data || []).map((p: any) => p.item).join(', ');
    const goals = (goalsRes.data || []).map((g: any) => `${g.title}:${g.target_value}${g.unit}`).join(', ');

    // Compact recent data (last 3 entries max)
    const recent: string[] = [];
    if (weightsRes.data?.length) recent.push(`Peso: ${weightsRes.data.map((w: any) => `${w.logged_date}=${w.weight_kg}kg`).join(', ')}`);
    if (exercisesRes.data?.length) recent.push(`Exerc: ${exercisesRes.data.map((e: any) => `${e.logged_date}=${e.total_duration_min||'?'}min`).join(', ')}`);
    if (waterRes.data?.length) recent.push(`Agua: ${waterRes.data.map((w: any) => `${w.logged_date}=${w.glasses}copos`).join(', ')}`);
    if (sleepRes.data?.length) recent.push(`Sono: ${sleepRes.data.map((s: any) => `${s.logged_date}=${s.duration_min||'?'}min q${s.quality}`).join(', ')}`);
    if (stepsRes.data?.length) recent.push(`Passos: ${stepsRes.data.map((s: any) => `${s.logged_date}=${s.steps}`).join(', ')}`);

    // Active health events
    const activeEvents = (activeEventsRes.data || []).map((e: any) => {
      const parts = [`${e.event_type}:${e.description}`];
      if (e.severity) parts.push(e.severity);
      if (e.body_area) parts.push(e.body_area);
      if (e.expires_at) parts.push(`ate ${e.expires_at}`);
      const det = e.details as Record<string, string> | null;
      if (det?.frequency) parts.push(det.frequency);
      return parts.join(' ');
    }).join(' | ');

    // Recurrence history (last 30 days)
    const recurrent = (recentEventsRes.data || []).filter((e: any) => e.recurrence_count >= 2)
      .map((e: any) => `${e.description} ${e.recurrence_count}x`).join(', ');

    return `FitTracker AI — assistente de saude pessoal. PT-BR. Sem emojis.
REGRA: Chame SEMPRE pelo nome "${name}". Nunca use "voce". Ex: "${name}, sua TMB e..."
PERFIL: ${profile.join(' | ')} | Obj: ${obj[p?.objective || ''] || 'melhorar saude'}
${hp.length ? 'SAUDE: ' + hp.join(' | ') : ''}
${bounds ? 'NUNCA SUGIRA: ' + bounds : ''}
${prefs ? 'PREFERENCIAS: ' + prefs : ''}
${goals ? 'METAS: ' + goals : ''}
HUMOR: ${moodRes.data?.mood || '?'}/5
${recent.length ? 'DADOS 7D: ' + recent.join(' | ') : ''}
${activeEvents ? 'EVENTOS ATIVOS: ' + activeEvents : ''}
${recurrent ? 'RECORRENCIAS 30D: ' + recurrent + ' — Se 3+x alertar para procurar especialista.' : ''}
ESCOPO: So responder sobre saude/fitness/nutricao/sono/bem-estar/exercicio/suplementos/metas. Fora disso: "Desculpe ${name}, so posso ajudar com saude e fitness."
${hp.some(l => l.toLowerCase().includes('hipertens')) ? 'ATENCAO: Hipertensao — cuidado com exercicios intensos, sodio e suplementos que interfiram.' : ''}
MEDICAMENTOS: Quando ${name} relatar dor, sintoma ou desconforto, pode sugerir medicamentos de VENDA LIVRE (sem receita) vendidos em farmacias brasileiras como opcao informativa. OBRIGATORIO: antes de sugerir, cruzar com condicoes de saude, medicamentos fixos, alergias e intolerancias de ${name}. Se houver contraindicacao, NAO sugerir e explicar o motivo. Sempre recomendar confirmar com farmaceutico ou medico. Ex: hipertenso — preferir paracetamol em vez de ibuprofeno. Alergico a dipirona — nunca sugerir dipirona.
Nunca diagnosticar. Recomendar profissional quando relevante. Respostas concisas.
CALORIAS — REGRAS OBRIGATORIAS:
1. Use a Tabela TACO (Tabela Brasileira de Composicao de Alimentos) como referencia principal. Se nao encontrar na TACO, use USDA.
2. SEMPRE calcule por peso/volume: identifique a porcao em gramas, aplique kcal/100g da tabela, multiplique. Mostre a conta.
3. Formato: "[alimento] ([peso]g): [kcal/100g] x [peso/100] = [resultado] kcal"
4. NUNCA mude o valor de um alimento ja calculado na mesma conversa. Se o usuario nao corrigiu a porcao, o valor permanece igual.
5. Para somas, liste cada item com o valor EXATO ja calculado e some. Confira a aritmetica.
6. Porcoes de referencia brasileiras: 1 colher de sopa = 25g, 1 colher de cha = 5g, 1 copo = 250ml, 1 prato fundo sopa = 300-400ml, ovo medio = 50g, banana media = 100g, maca media = 130g.
7. Para itens industrializados (Polenguinho, iogurte marca X), use o valor da embalagem padrao.
8. Quando o usuario der medida vaga (um pouco, umas), pergunte a quantidade antes de estimar.
9. Imagem de comida = identificar alimentos, estimar porcao em gramas, calcular com tabela.`;
  }

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

    if (!cachedPromptRef.current) {
      cachedPromptRef.current = await buildSystemPrompt(userId);
    }
    const sys = cachedPromptRef.current;

    const hist = messages.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const parts: Array<Record<string, unknown>> = [];
    if (txt) parts.push({ text: txt });
    if (imageFile && imagePreview) parts.push({ inline_data: { mime_type: imageFile.type, data: imagePreview.split(',')[1] } });
    hist.push({ role: 'user', parts: parts as Array<{text:string}> });
    clearImage();

    let ai = '';
    const geminiBody = JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: hist });
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
        const r = await fetch(geminiUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: geminiBody,
          signal: AbortSignal.timeout(30000),
        });
        const d = await r.json();
        if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
          ai = d.candidates[0].content.parts[0].text;
          break;
        }
        if (d.error?.message) {
          if (attempt < 2 && (d.error.message.includes('high demand') || d.error.message.includes('rate') || d.error.code === 429)) continue;
          ai = 'Desculpe, o servico esta temporariamente sobrecarregado. Tente novamente em alguns segundos.';
          break;
        }
        if (attempt < 2) continue;
        ai = 'Desculpe, nao consegui processar sua mensagem. Tente enviar novamente.';
      } catch {
        if (attempt < 2) continue;
        ai = 'Desculpe, a conexao com a AI falhou. Tente novamente em alguns segundos.';
      }
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

    // Detect medication
    const foundMed = medKeywords.find(k => lower.includes(k));
    if (foundMed) {
      eventType = 'medication';
      description = foundMed.charAt(0).toUpperCase() + foundMed.slice(1);
      // Try to extract actual med name (first keyword that's a real name, not a verb)
      const medNames = ['ibuprofeno','paracetamol','dipirona','dorflex','buscopan','tylenol','advil','nimesulida','diclofenaco','loratadina','amoxicilina','azitromicina','omeprazol'];
      const realMed = medNames.find(m => lower.includes(m));
      if (realMed) description = realMed.charAt(0).toUpperCase() + realMed.slice(1);
    }

    // Detect pain
    if (!eventType) {
      const foundPain = painKeywords.find(k => lower.includes(k));
      if (foundPain) { eventType = 'pain'; description = 'Dor'; }
    }

    // Detect symptom
    if (!eventType) {
      const foundSymptom = symptomKeywords.find(k => lower.includes(k));
      if (foundSymptom) { eventType = 'symptom'; description = foundSymptom.charAt(0).toUpperCase() + foundSymptom.slice(1); }
    }

    if (!eventType) return;

    // Detect body area
    let bodyArea: string | null = null;
    for (const [keyword, area] of Object.entries(bodyAreas)) {
      if (lower.includes(keyword)) { bodyArea = area; break; }
    }
    if (bodyArea && eventType === 'pain') description = `Dor ${bodyArea}`;

    // Detect duration (e.g. "5 dias", "por 3 dias")
    let expiresAt: string | null = null;
    const durationMatch = lower.match(/(\d+)\s*dias?/);
    if (durationMatch) {
      const days = parseInt(durationMatch[1]);
      const exp = new Date(Date.now() + days * 86400000);
      expiresAt = exp.toISOString().split('T')[0];
    }

    // Detect frequency
    let frequency: string | null = null;
    const freqMatch = lower.match(/(\d+)\s*(?:em|\/)\s*(\d+)\s*(?:h|hora)/);
    if (freqMatch) frequency = `${freqMatch[1]}/${freqMatch[2]}h`;

    // Check for existing similar event (recurrence)
    const { data: existing } = await supabase.from('health_events')
      .select('id,recurrence_count')
      .eq('user_id', userId)
      .ilike('description', `%${description}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.length && existing[0]) {
      // Update recurrence
      await supabase.from('health_events').update({
        recurrence_count: (existing[0].recurrence_count || 1) + 1,
        last_occurrence: today,
        is_active: true,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }).eq('id', existing[0].id);
    } else {
      // Insert new event
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
