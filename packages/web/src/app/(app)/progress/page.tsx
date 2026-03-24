'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MOOD_EMOJIS, OBJECTIVE_LABELS } from '@fittracker/shared';
import type { UserObjective } from '@fittracker/shared';

type Period = '7' | '30' | '90';

interface BestDay {
  date: string;
  score: number;
  highlights: string[];
}

export default function ProgressPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>('7');
  const [data, setData] = useState<Record<string, unknown[]>>({});
  const [bestDay, setBestDay] = useState<BestDay | null>(null);
  const [objective, setObjective] = useState<UserObjective>('improve_health');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { if (authUser) loadAll(); }, [period, authUser]);

  async function loadAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const start = startDate.toISOString().split('T')[0];

    // Load profile objective
    const { data: profile } = await supabase.from('user_profiles').select('objective').eq('id', user.id).single();
    if (profile?.objective) setObjective(profile.objective as UserObjective);

    // Load all data in parallel
    const [weights, moods, waters, sleeps, exercises, foods, steps] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('water_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('sleep_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('food_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('step_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
    ]);

    setData({
      weights: weights.data || [],
      moods: moods.data || [],
      waters: waters.data || [],
      sleeps: sleeps.data || [],
    });

    // Calculate best day
    const dayMap = new Map<string, { exercise: number; sleep: number; water: number; mood: number; food: number; steps: number }>();

    const ensure = (d: string) => {
      if (!dayMap.has(d)) dayMap.set(d, { exercise: 0, sleep: 0, water: 0, mood: 0, food: 0, steps: 0 });
      return dayMap.get(d)!;
    };

    (exercises.data || []).forEach((e: any) => { const d = ensure(e.logged_date); d.exercise += e.total_duration_min || 0; });
    (sleeps.data || []).forEach((s: any) => { const d = ensure(s.logged_date); d.sleep = s.duration_min || 0; });
    (waters.data || []).forEach((w: any) => { const d = ensure(w.logged_date); d.water = w.glasses || 0; });
    (moods.data || []).forEach((m: any) => { const d = ensure(m.logged_date); d.mood = Number(m.mood) || 0; });
    (foods.data || []).forEach((f: any) => { const d = ensure(f.logged_date); d.food += f.total_calories || 0; });
    (steps.data || []).forEach((s: any) => { const d = ensure(s.logged_date); d.steps = s.steps || 0; });

    let bestScore = -1;
    let bestDate = '';
    let bestHighlights: string[] = [];

    for (const [date, d] of dayMap) {
      const exScore = Math.min((d.exercise / 60) * 100, 100);
      const sleepH = d.sleep / 60;
      const slScore = sleepH >= 7 && sleepH <= 9 ? 100 : Math.max(0, 100 - Math.abs(sleepH - 8) * 20);
      const waScore = Math.min((d.water / 8) * 100, 100);
      const moScore = (d.mood / 5) * 100;
      const obj = profile?.objective || 'improve_health';

      let score = 0;
      if (obj === 'lose_weight') score = exScore * 0.35 + slScore * 0.25 + exScore * 0.40;
      else if (obj === 'gain_muscle') score = exScore * 0.40 + slScore * 0.25 + exScore * 0.35;
      else if (obj === 'improve_health') score = exScore * 0.25 + waScore * 0.25 + slScore * 0.25 + moScore * 0.25;
      else score = ((d.exercise > 0 ? 20 : 0) + (d.sleep > 0 ? 20 : 0) + (d.water > 0 ? 20 : 0) + (d.mood > 0 ? 20 : 0) + (d.food > 0 ? 20 : 0)) * 0.50 + moScore * 0.30 + exScore * 0.20;

      if (score > bestScore) {
        bestScore = score;
        bestDate = date;
        const hl: string[] = [];
        if (d.exercise > 0) hl.push(`💪 Treinou ${d.exercise}min`);
        if (d.sleep > 0) hl.push(`😴 Dormiu ${Math.round(sleepH)}h`);
        if (d.water > 0) hl.push(`💧 ${d.water} copos`);
        if (d.mood >= 4) hl.push(`😄 Humor ótimo`);
        if (d.steps > 0) hl.push(`👟 ${d.steps.toLocaleString()} passos`);
        bestHighlights = hl;
      }
    }

    if (bestDate && bestScore > 0) {
      setBestDay({ date: bestDate, score: Math.round(bestScore), highlights: bestHighlights });
    } else {
      setBestDay(null);
    }

    setLoading(false);
  }

  const weightsList = (data.weights || []) as Array<{ logged_date: string; weight_kg: string }>;
  const moodsList = (data.moods || []) as Array<{ logged_date: string; mood: string }>;
  const watersList = (data.waters || []) as Array<{ logged_date: string; glasses: number }>;
  const sleepsList = (data.sleeps || []) as Array<{ logged_date: string; quality: number; duration_min: number }>;

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-800 mb-4">Meu Progresso</h1>

      <div className="flex gap-2 mb-6">
        {(['7', '30', '90'] as Period[]).map((p) => (
          <Button key={p} variant={period === p ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p)}>
            {p === '7' ? 'Semana' : p === '30' ? 'Mês' : '3 Meses'}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando dados...</p>
      ) : (
        <div className="space-y-4">
          {/* Best Day Card */}
          {bestDay ? (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">🏆 Seu Melhor Dia</CardTitle>
                  <span className="text-2xl font-bold text-amber-600">{bestDay.score}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-neutral-800 mb-3 capitalize">{formatDate(bestDay.date)}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {bestDay.highlights.map((h, i) => (
                    <div key={i} className="bg-white/60 rounded-lg px-3 py-2 text-sm text-neutral-700">{h}</div>
                  ))}
                </div>
                <p className="text-sm text-neutral-600 italic">
                  &ldquo;Esse foi seu dia mais alinhado com {OBJECTIVE_LABELS[objective].toLowerCase()} nesse período!&rdquo;
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-neutral-400 text-sm">Continue registrando para ver seu melhor dia! 🏆</p>
              </CardContent>
            </Card>
          )}

          {/* Weight */}
          <Card>
            <CardHeader><CardTitle className="text-lg">⚖️ Peso</CardTitle></CardHeader>
            <CardContent>
              {weightsList.length > 0 ? (
                <div className="space-y-1">
                  {weightsList.map((w) => (
                    <div key={w.logged_date} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{new Date(w.logged_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="font-medium">{w.weight_kg} kg</span>
                    </div>
                  ))}
                  {weightsList.length >= 2 && (
                    <p className="text-sm mt-2 text-primary-600">
                      Variação: {(Number(weightsList[weightsList.length - 1].weight_kg) - Number(weightsList[0].weight_kg)).toFixed(1)} kg
                    </p>
                  )}
                </div>
              ) : (<p className="text-sm text-neutral-400">Sem registros de peso neste período</p>)}
            </CardContent>
          </Card>

          {/* Mood */}
          <Card>
            <CardHeader><CardTitle className="text-lg">😊 Humor</CardTitle></CardHeader>
            <CardContent>
              {moodsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {moodsList.map((m) => (
                    <div key={m.logged_date} className="text-center">
                      <p className="text-2xl">{MOOD_EMOJIS[Number(m.mood) as keyof typeof MOOD_EMOJIS]}</p>
                      <p className="text-xs text-neutral-400">{new Date(m.logged_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-sm text-neutral-400">Sem registros de humor neste período</p>)}
            </CardContent>
          </Card>

          {/* Water */}
          <Card>
            <CardHeader><CardTitle className="text-lg">💧 Água</CardTitle></CardHeader>
            <CardContent>
              {watersList.length > 0 ? (
                <div className="space-y-1">
                  {watersList.map((w) => (
                    <div key={w.logged_date} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{new Date(w.logged_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="font-medium">{w.glasses} copos</span>
                    </div>
                  ))}
                  <p className="text-sm mt-2 text-primary-600">
                    Média: {(watersList.reduce((s, w) => s + w.glasses, 0) / watersList.length).toFixed(1)} copos/dia
                  </p>
                </div>
              ) : (<p className="text-sm text-neutral-400">Sem registros de água neste período</p>)}
            </CardContent>
          </Card>

          {/* Sleep */}
          <Card>
            <CardHeader><CardTitle className="text-lg">🛏️ Sono</CardTitle></CardHeader>
            <CardContent>
              {sleepsList.length > 0 ? (
                <div className="space-y-1">
                  {sleepsList.map((s) => (
                    <div key={s.logged_date} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{new Date(s.logged_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="font-medium">
                        {s.duration_min ? `${Math.floor(s.duration_min / 60)}h${s.duration_min % 60}min` : '—'} — {'★'.repeat(s.quality)}{'☆'.repeat(5 - s.quality)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-sm text-neutral-400">Sem registros de sono neste período</p>)}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
