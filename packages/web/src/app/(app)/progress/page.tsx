'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MOOD_EMOJIS } from '@fittracker/shared';

type Period = '7' | '30' | '90';

export default function ProgressPage() {
  const [period, setPeriod] = useState<Period>('7');
  const [data, setData] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadProgress();
  }, [period]);

  async function loadProgress() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/dashboard/progress?days=${period}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    );

    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }

  const weights = (data.weights || []) as Array<{ loggedDate: string; weightKg: string }>;
  const moods = (data.moods || []) as Array<{ loggedDate: string; mood: string }>;
  const waters = (data.waters || []) as Array<{ loggedDate: string; glasses: number }>;
  const sleeps = (data.sleeps || []) as Array<{ loggedDate: string; quality: number; durationMin: number }>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-800 mb-4">Meu Progresso</h1>

      <div className="flex gap-2 mb-6">
        {(['7', '30', '90'] as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === '7' ? 'Semana' : p === '30' ? 'Mês' : '3 Meses'}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando dados...</p>
      ) : (
        <div className="space-y-4">
          {/* Weight Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⚖️ Peso</CardTitle>
            </CardHeader>
            <CardContent>
              {weights.length > 0 ? (
                <div className="space-y-1">
                  {weights.map((w) => (
                    <div key={w.loggedDate} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{new Date(w.loggedDate).toLocaleDateString('pt-BR')}</span>
                      <span className="font-medium">{w.weightKg} kg</span>
                    </div>
                  ))}
                  {weights.length >= 2 && (
                    <p className="text-sm mt-2 text-primary-600">
                      Variação: {(Number(weights[weights.length - 1].weightKg) - Number(weights[0].weightKg)).toFixed(1)} kg
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">Sem registros de peso neste período</p>
              )}
            </CardContent>
          </Card>

          {/* Mood Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">😊 Humor</CardTitle>
            </CardHeader>
            <CardContent>
              {moods.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {moods.map((m) => (
                    <div key={m.loggedDate} className="text-center">
                      <p className="text-2xl">{MOOD_EMOJIS[Number(m.mood) as keyof typeof MOOD_EMOJIS]}</p>
                      <p className="text-xs text-neutral-400">{new Date(m.loggedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">Sem registros de humor neste período</p>
              )}
            </CardContent>
          </Card>

          {/* Water Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💧 Água</CardTitle>
            </CardHeader>
            <CardContent>
              {waters.length > 0 ? (
                <div className="space-y-1">
                  {waters.map((w) => (
                    <div key={w.loggedDate} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{new Date(w.loggedDate).toLocaleDateString('pt-BR')}</span>
                      <span className="font-medium">{w.glasses} copos</span>
                    </div>
                  ))}
                  <p className="text-sm mt-2 text-primary-600">
                    Média: {(waters.reduce((s, w) => s + w.glasses, 0) / waters.length).toFixed(1)} copos/dia
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-400">Sem registros de água neste período</p>
              )}
            </CardContent>
          </Card>

          {/* Sleep Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🛏️ Sono</CardTitle>
            </CardHeader>
            <CardContent>
              {sleeps.length > 0 ? (
                <div className="space-y-1">
                  {sleeps.map((s) => (
                    <div key={s.loggedDate} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{new Date(s.loggedDate).toLocaleDateString('pt-BR')}</span>
                      <span className="font-medium">
                        {s.durationMin ? `${Math.floor(s.durationMin / 60)}h${s.durationMin % 60}min` : '—'} — {'★'.repeat(s.quality)}{'☆'.repeat(5 - s.quality)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">Sem registros de sono neste período</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
