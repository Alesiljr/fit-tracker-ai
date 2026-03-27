import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function buildSystemPrompt(userId: string) {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
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

  const profile: string[] = [name];
  if (p?.date_of_birth) profile.push(`${Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000)}a`);
  if (p?.gender) profile.push(p.gender);
  if (p?.height_cm) profile.push(`${p.height_cm}cm`);
  if (p?.initial_weight) profile.push(`${p.initial_weight}kg`);
  if (p?.blood_type) profile.push(p.blood_type);

  const hp: string[] = [];
  const conds = (h?.health_conditions as Array<{name:string;severity?:string}> || []);
  if (conds.length) hp.push(`Condicoes: ${conds.map(c => `${c.name}${c.severity ? `(${c.severity})` : ''}`).join(', ')}`);
  if (h?.allergies?.length) hp.push(`Alergias: ${(h.allergies as string[]).join(', ')}`);
  if (h?.intolerances?.length) hp.push(`Intolerancias: ${(h.intolerances as string[]).join(', ')}`);
  const meds = (h?.medications as Array<{name:string;dosage?:string;frequency?:string}> || []);
  if (meds.length) hp.push(`Meds: ${meds.map(m => `${m.name}${m.dosage ? ' '+m.dosage : ''}${m.frequency ? ' '+m.frequency : ''}`).join(', ')}`);
  const supps = (h?.supplements as Array<{name:string;dosage?:string;frequency?:string}> || []);
  if (supps.length) hp.push(`Suplem: ${supps.map(s => `${s.name}${s.frequency ? ' '+s.frequency : ''}`).join(', ')}`);

  const bounds = (boundariesRes.data || []).map((b: { item: string }) => b.item).join(', ');
  const prefs = (prefsRes.data || []).map((p: { item: string }) => p.item).join(', ');
  const goals = (goalsRes.data || []).map((g: { title: string; target_value: string; unit: string }) => `${g.title}:${g.target_value}${g.unit}`).join(', ');

  const recent: string[] = [];
  if (weightsRes.data?.length) recent.push(`Peso: ${weightsRes.data.map((w: { logged_date: string; weight_kg: string }) => `${w.logged_date}=${w.weight_kg}kg`).join(', ')}`);
  if (exercisesRes.data?.length) recent.push(`Exerc: ${exercisesRes.data.map((e: { logged_date: string; total_duration_min: number | null }) => `${e.logged_date}=${e.total_duration_min||'?'}min`).join(', ')}`);
  if (waterRes.data?.length) recent.push(`Agua: ${waterRes.data.map((w: { logged_date: string; glasses: number }) => `${w.logged_date}=${w.glasses}copos`).join(', ')}`);
  if (sleepRes.data?.length) recent.push(`Sono: ${sleepRes.data.map((s: { logged_date: string; duration_min: number | null; quality: number }) => `${s.logged_date}=${s.duration_min||'?'}min q${s.quality}`).join(', ')}`);
  if (stepsRes.data?.length) recent.push(`Passos: ${stepsRes.data.map((s: { logged_date: string; steps: number }) => `${s.logged_date}=${s.steps}`).join(', ')}`);

  const activeEvents = (activeEventsRes.data || []).map((e: { event_type: string; description: string; severity: string | null; body_area: string | null; expires_at: string | null; details: Record<string, string> | null }) => {
    const parts = [`${e.event_type}:${e.description}`];
    if (e.severity) parts.push(e.severity);
    if (e.body_area) parts.push(e.body_area);
    if (e.expires_at) parts.push(`ate ${e.expires_at}`);
    if (e.details?.frequency) parts.push(e.details.frequency);
    return parts.join(' ');
  }).join(' | ');

  const recurrent = (recentEventsRes.data || []).filter((e: { recurrence_count: number }) => e.recurrence_count >= 2)
    .map((e: { description: string; recurrence_count: number }) => `${e.description} ${e.recurrence_count}x`).join(', ');

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
MEDICAMENTOS: Quando ${name} relatar dor, sintoma ou desconforto, pode sugerir medicamentos de VENDA LIVRE vendidos em farmacias brasileiras. OBRIGATORIO: cruzar com condicoes de saude, medicamentos fixos, alergias e intolerancias. Se houver contraindicacao, NAO sugerir e explicar o motivo. Sempre recomendar confirmar com farmaceutico.
Nunca diagnosticar. Recomendar profissional quando relevante. Respostas concisas.
CALORIAS — REGRAS OBRIGATORIAS:
1. Use Tabela TACO como referencia. Se nao encontrar, use USDA.
2. Calcule por peso: identifique porcao em gramas, aplique kcal/100g, multiplique. Mostre a conta.
3. Formato: "[alimento] ([peso]g): [kcal/100g] x [peso/100] = [resultado] kcal"
4. NUNCA mude o valor de um alimento ja calculado na mesma conversa.
5. Para somas, liste cada item com valor EXATO ja calculado e some. Confira aritmetica.
6. Porcoes BR: 1 colher sopa=25g, 1 colher cha=5g, 1 copo=250ml, prato fundo sopa=350ml, ovo medio=50g, banana media=100g, maca media=130g.
7. Industrializados: use valor da embalagem padrao.
8. Medida vaga: pergunte a quantidade antes de estimar.
9. Imagem de comida: identificar, estimar gramas, calcular com tabela.`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const { message, history, imageData } = await request.json();
    if (!message && !imageData) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }

    const systemPrompt = await buildSystemPrompt(user.id);

    // Build Gemini request
    const hist = (history || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const parts: Array<Record<string, unknown>> = [];
    if (message) parts.push({ text: message });
    if (imageData) parts.push({ inline_data: { mime_type: imageData.mimeType, data: imageData.base64 } });
    hist.push({ role: 'user', parts });

    const geminiBody = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: hist,
    });

    let aiResponse = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
        const r = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: geminiBody,
          signal: AbortSignal.timeout(30000),
        });
        const d = await r.json();
        if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
          aiResponse = d.candidates[0].content.parts[0].text;
          break;
        }
        if (d.error?.message) {
          if (attempt < 2 && (d.error.message.includes('high demand') || d.error.code === 429)) continue;
          aiResponse = 'Desculpe, o servico esta temporariamente sobrecarregado. Tente novamente em alguns segundos.';
          break;
        }
        if (attempt < 2) continue;
        aiResponse = 'Desculpe, nao consegui processar sua mensagem. Tente enviar novamente.';
      } catch {
        if (attempt < 2) continue;
        aiResponse = 'Desculpe, a conexao com a AI falhou. Tente novamente em alguns segundos.';
      }
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { response: 'Desculpe, ocorreu um erro interno. Tente novamente.' },
      { status: 200 },
    );
  }
}
