'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  missingFields?: string[];
}

const FIELD_LABELS: Record<string, string> = {
  peso: '⚖️ Peso',
  humor: '😊 Humor',
  exercicio: '🏋️ Exercício',
  agua: '💧 Água',
  passos: '👟 Passos',
  sono: '🛏️ Sono',
  cafe_da_manha: '☀️ Café da manhã',
  almoco: '🌤️ Almoço',
  jantar: '🌙 Jantar',
  lanche: '🍎 Lanche',
};

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export default function LogChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const focusField = searchParams.get('focus');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Initial greeting
    const greeting = focusField
      ? `Olá! Vamos registrar ${FIELD_LABELS[focusField] || focusField}. Me conta!`
      : 'Olá! Me conta como foi seu dia. Pode falar tudo de uma vez: peso, exercício, alimentação, água, sono, humor... ou o que preferir!';

    setMessages([{ role: 'assistant', content: greeting }]);
    inputRef.current?.focus();
  }, []);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/log/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          missingFields: data.missing_fields,
        },
      ]);
    } catch {
      // Fallback: use Gemini directly from frontend
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const [profileRes, weightRes, moodRes, waterRes, stepsRes, exerciseRes, sleepRes] = await Promise.all([
          supabase.from('user_profiles').select('display_name').eq('id', user.id).single(),
          supabase.from('weight_logs').select('weight_kg').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]).maybeSingle(),
          supabase.from('mood_logs').select('mood').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]).maybeSingle(),
          supabase.from('water_logs').select('glasses').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]).maybeSingle(),
          supabase.from('step_logs').select('steps').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]).maybeSingle(),
          supabase.from('exercise_logs').select('raw_input').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]),
          supabase.from('sleep_logs').select('duration_min').eq('user_id', user.id).eq('logged_date', new Date().toISOString().split('T')[0]).maybeSingle(),
        ]);

        const existingData = [
          weightRes.data ? `Peso: ${weightRes.data.weight_kg}kg` : null,
          moodRes.data ? `Humor: ${moodRes.data.mood}/5` : null,
          waterRes.data ? `Água: ${waterRes.data.glasses} copos` : null,
          stepsRes.data ? `Passos: ${stepsRes.data.steps}` : null,
          exerciseRes.data?.length ? `Exercício: registrado` : null,
          sleepRes.data ? `Sono: registrado` : null,
        ].filter(Boolean).join(' | ') || 'Nenhum dado registrado hoje';

        const systemPrompt = `Você é o assistente de registro diário do FitTracker AI.
O usuário quer registrar dados de saúde. Interprete o texto e extraia os dados.
Nome: ${profileRes.data?.display_name || 'Usuário'}
Dados já registrados hoje: ${existingData}

Responda APENAS com JSON válido:
{
  "extracted_data": {
    "weight_kg": null, "mood": null, "mood_note": null,
    "exercises": [], "water_glasses": null, "steps": null,
    "sleep": null, "meals": []
  },
  "confirmation_message": "mensagem amigável",
  "missing_fields": []
}

Regras: mood 1-5, água em copos, sono com horários HH:MM, exercício com duração em min.
Estime calorias das refeições. missing_fields = campos não preenchidos hoje.
Campos: peso, humor, exercicio, agua, passos, sono, cafe_da_manha, almoco, jantar, lanche`;

        const chatHistory = messages
          .filter(m => m.role === 'user')
          .map(m => ({ role: 'user', parts: [{ text: m.content }] }));
        chatHistory.push({ role: 'user', parts: [{ text }] });

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: chatHistory,
              generationConfig: { responseMimeType: 'application/json' },
            }),
          },
        );

        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(rawText);
        const data = parsed.extracted_data;
        const today = new Date().toISOString().split('T')[0];
        const uid = user.id;

        // Save data directly to Supabase
        const saves: Promise<unknown>[] = [];
        if (data.weight_kg != null) {
          saves.push(supabase.from('weight_logs').upsert(
            { user_id: uid, logged_date: today, weight_kg: data.weight_kg },
            { onConflict: 'user_id,logged_date' },
          ));
        }
        if (data.mood != null) {
          saves.push(supabase.from('mood_logs').upsert(
            { user_id: uid, logged_date: today, mood: String(data.mood), note: data.mood_note },
            { onConflict: 'user_id,logged_date' },
          ));
        }
        if (data.water_glasses != null) {
          saves.push(supabase.from('water_logs').upsert(
            { user_id: uid, logged_date: today, glasses: data.water_glasses },
            { onConflict: 'user_id,logged_date' },
          ));
        }
        if (data.steps != null) {
          saves.push(supabase.from('step_logs').upsert(
            { user_id: uid, logged_date: today, steps: data.steps },
            { onConflict: 'user_id,logged_date' },
          ));
        }
        if (data.exercises?.length > 0) {
          for (const ex of data.exercises) {
            saves.push(supabase.from('exercise_logs').insert({
              user_id: uid, logged_date: today, raw_input: ex.description,
              exercises: [ex], total_duration_min: ex.duration_min,
            }));
          }
        }
        if (data.sleep) {
          const sleptAt = new Date(`${today}T${data.sleep.slept_at}:00`);
          const wokeAt = new Date(`${today}T${data.sleep.woke_at}:00`);
          const durMin = Math.abs(Math.round((wokeAt.getTime() - sleptAt.getTime()) / 60000));
          saves.push(supabase.from('sleep_logs').upsert(
            { user_id: uid, logged_date: today, slept_at: sleptAt.toISOString(), woke_at: wokeAt.toISOString(), quality: data.sleep.quality || 3, duration_min: durMin },
            { onConflict: 'user_id,logged_date' },
          ));
        }
        if (data.meals?.length > 0) {
          for (const meal of data.meals) {
            saves.push(supabase.from('food_logs').upsert(
              { user_id: uid, logged_date: today, meal_type: meal.meal_type, description: meal.description, total_calories: meal.estimated_calories, ai_estimated: true },
              { onConflict: 'user_id,logged_date,meal_type' },
            ));
          }
        }

        await Promise.allSettled(saves);

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: parsed.confirmation_message,
            missingFields: parsed.missing_fields,
          },
        ]);
      } catch {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Desculpa, tive um problema ao processar. Pode tentar de novo?' },
        ]);
      }
    }

    setSending(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-800">Registro do Dia</h1>
          <p className="text-xs text-neutral-400">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link href="/log" className="text-xs text-primary-500 hover:underline">
          Formulário manual
        </Link>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 max-w-lg mx-auto">
          {messages.map((m, i) => (
            <div key={i}>
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <Card className={`max-w-[85%] p-3 ${m.role === 'user' ? 'bg-primary-500 text-white' : 'bg-white border'}`}>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                </Card>
              </div>
              {m.missingFields && m.missingFields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.missingFields.map(field => (
                    <button
                      key={field}
                      onClick={() => setInput(`Registrar ${FIELD_LABELS[field] || field}: `)}
                      className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-500 hover:bg-primary-50 hover:text-primary-600 transition-colors border border-dashed border-neutral-300"
                    >
                      {FIELD_LABELS[field] || field}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <Card className="p-3 bg-white border">
                <p className="text-sm text-neutral-400 animate-pulse">Interpretando...</p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2 max-w-lg mx-auto items-center">
          <Input
            ref={inputRef}
            placeholder="Ex: pesei 72kg, fiz 30min de academia, almocei frango com salada..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={send} disabled={sending || !input.trim()}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
