'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OBJECTIVE_LABELS } from '@fittracker/shared';
import type { UserObjective } from '@fittracker/shared';
import { Trophy, Scale, Smile, Droplets, Moon, Dumbbell, Footprints, type LucideIcon } from 'lucide-react';

const MOOD_LABELS: Record<number, string> = { 1: 'Muito mal', 2: 'Mal', 3: 'Normal', 4: 'Bem', 5: 'Excelente' };

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

    const { data: profile } = await supabase.from('user_profiles').select('objective').eq('id', user.id).single();
    if (profile?.objective) setObjective(profile.objective as UserObjective);

    const [weights, moods, waters, sleeps, exercises, foods, steps] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('water_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('sleep_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('food_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
      supabase.from('step_logs').select('*').eq('user_id', user.id).gte('logged_date', start).order('logged_date'),
    ]);

    setData({ weights: weights.data || [], moods: moods.data || [], waters: waters.data || [], sleeps: sleeps.data || [] });

    const dayMap = new Map<string, { exercise: number; sleep: number; water: number; mood: number; food: number; steps: number }>();
    const ensure = (d: string) => { if (!dayMap.has(d)) dayMap.set(d, { exercise: 0, sleep: 0, water: 0, mood: 0, food: 0, steps: 0 }); return dayMap.get(d)!; };

    (exercises.data || []).forEach((e: any) => { const d = ensure(e.logged_date); d.exercise += e.total_duration_min || 0; });
    (sleeps.data || []).forEach((s: any) => { const d = ensure(s.logged_date); d.sleep = s.duration_min || 0; });
    (waters.data || []).forEach((w: any) => { const d = ensure(w.logged_date); d.water = w.glasses || 0; });
    (moods.data || []).forEach((m: any) => { const d = ensure(m.logged_date); d.mood = Number(m.mood) || 0; });
    (foods.data || []).forEach((f: any) => { const d = ensure(f.logged_date); d.food += f.total_calories || 0; });
    (steps.data || []).forEach((s: any) => { const d = ensure(s.logged_date); d.steps = s.steps || 0; });

    let bestScore = -1; let bestDate = ''; let bestHighlights: string[] = [];

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
        bestScore = score; bestDate = date;
        const hl: string[] = [];
        if (d.exercise > 0) hl.push(`Treinou ${d.exercise}min`);
        if (d.sleep > 0) hl.push(`Dormiu ${Math.round(sleepH)}h`);
        if (d.water > 0) hl.push(`${d.water} copos de agua`);
        if (d.mood >= 4) hl.push(`Humor otimo`);
        if (d.steps > 0) hl.push(`${d.steps.toLocaleString()} passos`);
        bestHighlights = hl;
      }
    }

    if (bestDate && bestScore > 0) setBestDay({ date: bestDate, score: Math.round(bestScore), highlights: bestHighlights });
    else setBestDay(null);
    setLoading(false);
  }

  const weightsList = (data.weights || []) as Array<{ logged_date: string; weight_kg: string }>;
  const moodsList = (data.moods || []) as Array<{ logged_date: string; mood: string }>;
  const watersList = (data.waters || []) as Array<{ logged_date: string; glasses: number }>;
  const sleepsList = (data.sleeps || []) as Array<{ logged_date: string; quality: number; duration_min: number }>;

  function formatDate(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }); }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Meu Progresso</h1>

      <div className="flex gap-2 mb-6">
        {(['7', '30', '90'] as Period[]).map((p) => (
          <Button key={p} variant={period === p ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p)}>
            {p === '7' ? 'Semana' : p === '30' ? 'Mes' : '3 Meses'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Best Day */}
          {bestDay ? (
            <Card className="border-gold-300/50 bg-gradient-to-br from-gold-50 to-gold-100/30 dark:from-gold-500/5 dark:to-gold-500/10 dark:border-gold-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Trophy size={18} className="text-gold-600" /> Seu Melhor Dia</CardTitle>
                  <span className="text-2xl font-bold text-gold-600">{bestDay.score}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-semibold mb-3 capitalize">{formatDate(bestDay.date)}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {bestDay.highlights.map((h, i) => (
                    <div key={i} className="bg-card/60 rounded-lg px-3 py-2 text-sm">{h}</div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  Esse foi seu dia mais alinhado com {OBJECTIVE_LABELS[objective].toLowerCase()} nesse periodo.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <Trophy size={20} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Continue registrando para ver seu melhor dia</p>
              </CardContent>
            </Card>
          )}

          {/* Weight */}
          <SectionCard icon={Scale} title="Peso">
            {weightsList.length > 0 ? (
              <div className="space-y-1">
                {weightsList.map((w) => (
                  <div key={w.logged_date} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(w.logged_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <span className="font-medium">{w.weight_kg} kg</span>
                  </div>
                ))}
                {weightsList.length >= 2 && (
                  <p className="text-sm mt-2 text-primary">
                    Variacao: {(Number(weightsList[weightsList.length - 1].weight_kg) - Number(weightsList[0].weight_kg)).toFixed(1)} kg
                  </p>
                )}
              </div>
            ) : (<p className="text-sm text-muted-foreground">Sem registros neste periodo</p>)}
          </SectionCard>

          {/* Mood */}
          <SectionCard icon={Smile} title="Humor">
            {moodsList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {moodsList.map((m) => (
                  <div key={m.logged_date} className="text-center bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-sm font-medium">{MOOD_LABELS[Number(m.mood)] || m.mood}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(m.logged_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-muted-foreground">Sem registros neste periodo</p>)}
          </SectionCard>

          {/* Water */}
          <SectionCard icon={Droplets} title="Agua">
            {watersList.length > 0 ? (
              <div className="space-y-1">
                {watersList.map((w) => (
                  <div key={w.logged_date} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(w.logged_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <span className="font-medium">{w.glasses} copos</span>
                  </div>
                ))}
                <p className="text-sm mt-2 text-primary">
                  Media: {(watersList.reduce((s, w) => s + w.glasses, 0) / watersList.length).toFixed(1)} copos/dia
                </p>
              </div>
            ) : (<p className="text-sm text-muted-foreground">Sem registros neste periodo</p>)}
          </SectionCard>

          {/* Sleep */}
          <SectionCard icon={Moon} title="Sono">
            {sleepsList.length > 0 ? (
              <div className="space-y-1">
                {sleepsList.map((s) => (
                  <div key={s.logged_date} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(s.logged_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <span className="font-medium">
                      {s.duration_min ? `${Math.floor(s.duration_min / 60)}h${s.duration_min % 60}min` : '—'} — {s.quality}/5
                    </span>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-muted-foreground">Sem registros neste periodo</p>)}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2">
          <Icon size={14} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
