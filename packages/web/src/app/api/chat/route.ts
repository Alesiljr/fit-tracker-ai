import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing message or userId' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Load user context from Supabase
    const [profileRes, boundariesRes, preferencesRes, moodRes, weightRes, waterRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase.from('user_boundaries').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('user_preferences').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('mood_logs').select('mood, note').eq('user_id', userId).eq('logged_date', new Date().toISOString().split('T')[0]).single(),
      supabase.from('weight_logs').select('weight_kg, logged_date').eq('user_id', userId).order('logged_date', { ascending: false }).limit(7),
      supabase.from('water_logs').select('glasses, logged_date').eq('user_id', userId).order('logged_date', { ascending: false }).limit(7),
    ]);

    const profile = profileRes.data;
    const boundaries = boundariesRes.data || [];
    const preferences = preferencesRes.data || [];
    const todayMood = moodRes.data;
    const recentWeights = weightRes.data || [];
    const recentWater = waterRes.data || [];

    // Build tone based on mood
    const moodTones: Record<string, string> = {
      '1': 'Seja gentil e acolhedor. Não pressione. Celebre pequenas vitórias.',
      '2': 'Seja informativo e equilibrado. Tom neutro.',
      '3': 'Seja amigável e positivo. Sugira melhorias gentilmente.',
      '4': 'Seja entusiasmado! Celebre conquistas e proponha desafios.',
      '5': 'Match a energia alta! Celebre com entusiasmo, motive a continuar.',
    };
    const toneInstruction = todayMood?.mood ? moodTones[todayMood.mood] || moodTones['3'] : moodTones['3'];

    // Build system prompt
    const systemPrompt = `Você é um assistente de saúde pessoal chamado FitTracker AI. Você é amigável, empático e se adapta a cada pessoa.

## SOBRE O USUÁRIO
Nome: ${profile?.display_name || 'Usuário'}
Objetivo: ${profile?.objective || 'melhorar saúde'}

## REGRAS ABSOLUTAS (NUNCA viole):
${boundaries.length > 0 ? boundaries.map((b: { item: string; reason: string | null }) => `- NUNCA sugira "${b.item}"${b.reason ? ` (motivo: ${b.reason})` : ''}`).join('\n') : '- Nenhuma restrição cadastrada ainda'}

## PREFERÊNCIAS DO USUÁRIO:
${preferences.length > 0 ? preferences.map((p: { item: string; description: string | null }) => `- ${p.item}${p.description ? `: ${p.description}` : ''}`).join('\n') : '- Ainda aprendendo preferências'}

## HUMOR HOJE: ${todayMood?.mood ? `Nível ${todayMood.mood}/5${todayMood.note ? ` — "${todayMood.note}"` : ''}` : 'Não registrado ainda'}
${toneInstruction}

## DADOS RECENTES:
Pesos (últimos 7 dias): ${recentWeights.length > 0 ? recentWeights.map((w: { logged_date: string; weight_kg: string }) => `${w.logged_date}: ${w.weight_kg}kg`).join(', ') : 'Sem registros'}
Água (últimos 7 dias): ${recentWater.length > 0 ? recentWater.map((w: { logged_date: string; glasses: number }) => `${w.logged_date}: ${w.glasses} copos`).join(', ') : 'Sem registros'}

## COMO SE COMPORTAR:
- Responda SEMPRE em português brasileiro
- Seja conciso (máximo 3 parágrafos)
- Use emojis moderadamente
- NUNCA sugira algo que está nas REGRAS ABSOLUTAS acima
- Se o usuário rejeitar algo, respeite imediatamente
- Baseie dicas nos DADOS REAIS do usuário, não em conselhos genéricos
- Se não tem dados suficientes, incentive o usuário a registrar no Log
- Nunca julgue o usuário por escolhas alimentares ou falta de exercício
- Celebre consistência de registro, não perfeição`;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const chat = model.startChat({
      history: [{ role: 'user', parts: [{ text: 'Olá' }] }, { role: 'model', parts: [{ text: `Olá ${profile?.display_name || ''}! Sou seu assistente de saúde pessoal. Como posso te ajudar hoje? 😊` }] }],
      systemInstruction: systemPrompt,
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Gemini error:', error);
    return NextResponse.json(
      { response: 'Desculpe, tive um problema para responder. Tente novamente! 🙏' },
      { status: 200 },
    );
  }
}
