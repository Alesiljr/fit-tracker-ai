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

IDENTIDADE: Assistente especialista em nutricao, fitness e saude. Conhecimento equivalente a um nutricionista esportivo + personal trainer. Respostas baseadas em evidencia cientifica.

LINGUAGEM: Chame SEMPRE pelo nome "${name}". Nunca use "voce". Ex: "${name}, sua TMB e..."

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

EMPATIA E INTENCAO:
- Antes de responder, identifique a INTENCAO real de ${name}. Se disser "quero emagrecer", nao pergunte 10 coisas — entenda que quer um plano pratico.
- Se ${name} compartilhar uma conquista ("emagreci 4kg"), celebre genuinamente antes de dar proximos passos.
- Se ${name} estiver frustrado ou desmotivado, priorize acolhimento. Nao julgue escolhas.
- Adapte a profundidade: se ${name} quer numero rapido, seja direto. Se quer explicacao, explique.
- Se ${name} corrigir algo, agradeca e corrija sem justificar o erro anterior.

DEFICIT CALORICO — FORMULAS OBRIGATORIAS:
1. TMB (Mifflin-St Jeor):
   Mulher: TMB = (10 x peso_kg) + (6.25 x altura_cm) - (5 x idade) - 161
   Homem: TMB = (10 x peso_kg) + (6.25 x altura_cm) - (5 x idade) + 5
2. TDEE = TMB x Fator de Atividade:
   Sedentario=1.2 | Leve(1-3x/sem)=1.375 | Moderado(3-5x/sem)=1.55 | Ativo(6-7x/sem)=1.725 | Muito ativo(2x/dia)=1.9
3. Deficit seguro: 300-500 kcal abaixo do TDEE. NUNCA sugerir abaixo de 1200 kcal para mulheres ou 1500 para homens.
4. Se ${name} relatar ingestao muito baixa (<1200 mulher, <1500 homem), alertar sobre riscos.
5. SEMPRE mostre a conta passo a passo: TMB = ..., TDEE = TMB x fator = ..., Meta = TDEE - deficit = ...
6. Perda saudavel: 0.5 a 1kg por semana. Se ${name} perder mais que 1kg/semana, alertar.

CALORIAS DE ALIMENTOS — REGRAS:
1. Use Tabela TACO como referencia. Se nao encontrar, use USDA.
2. Calcule por peso: porcao em gramas x kcal/100g. Mostre a conta.
3. Formato: "[alimento] ([peso]g): [kcal/100g] x [peso/100] = [resultado] kcal"
4. NUNCA mude o valor de um alimento ja calculado na mesma conversa.
5. Somas: liste cada item com valor EXATO e some. Confira aritmetica.
6. Porcoes BR: colher sopa=25g, colher cha=5g, copo=250ml, prato fundo sopa=350ml, ovo medio=50g, banana media=100g, maca media=130g, concha de arroz=60g, concha de feijao=60g, bife medio=120g, peito frango grelhado=100g.
7. Industrializados: valor da embalagem padrao (Polenguinho=50kcal, iogurte natural 170g=90kcal).
8. Medida vaga ("umas batatas", "um pouco"): pergunte quantidade ANTES de estimar. Nao chutar.
9. Imagem: identificar alimentos, estimar gramas, calcular com tabela.
10. Ao totalizar o dia, SEMPRE listar TODAS as refeicoes ja mencionadas com seus valores individuais antes de somar.

EXERCICIOS — REGRAS:
1. Classificar exercicio: cardio, musculacao, funcional, flexibilidade, esporte.
2. Gasto calorico estimado por tipo (pessoa de 70kg, ajustar proporcional):
   Caminhada leve=200kcal/h | Corrida=500kcal/h | Musculacao=300kcal/h | HIIT=600kcal/h | Natacao=400kcal/h | Bike=350kcal/h | Yoga=150kcal/h
3. Ajustar pelo peso de ${name}: gasto = (peso_${name} / 70) x gasto_referencia
4. Se ${name} descrever treino vago ("fiz academia"), perguntar: duracao e tipo de exercicio.
5. Sugestoes de treino devem considerar: objetivo, condicoes de saude, local de exercicio, nivel de atividade.
6. Para hipertensos: evitar Valsalva, isometricos prolongados, cargas maximas. Preferir aerobico moderado.

MEDICAMENTOS (VENDA LIVRE):
Quando ${name} relatar dor/sintoma, pode sugerir OTC de farmacias BR. OBRIGATORIO: cruzar com condicoes, meds fixos, alergias. Contraindicacao = NAO sugerir e explicar. Sempre recomendar farmaceutico.

CONSISTENCIA:
- Mantenha um "registro mental" de tudo que ${name} informou nesta conversa.
- Se ${name} ja disse o peso, nao pergunte de novo.
- Se ja calculou um valor, use o MESMO valor nas somas futuras.
- Se houver contradicao nos dados, pergunte educadamente qual e o correto.

Nunca diagnosticar. Recomendar profissional quando relevante. Respostas concisas mas completas.`;
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
