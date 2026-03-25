'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ReportsPage() {
  const [weekly, setWeekly] = useState<Record<string, unknown> | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };

    const [weeklyRes, insightsRes] = await Promise.all([
      fetch(`${API_URL}/api/reports/weekly`, { headers }),
      fetch(`${API_URL}/api/reports/insights`, { headers }),
    ]);

    if (weeklyRes.ok) setWeekly(await weeklyRes.json());
    if (insightsRes.ok) {
      const data = await insightsRes.json();
      setInsights(data.insights || []);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-4 text-muted-foreground">Carregando relatórios...</div>;

  const metrics = (weekly as Record<string, unknown>)?.metrics as Record<string, string | number | null | undefined> | undefined;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dias com registro</span>
                <span className="font-medium">{String(metrics.daysWithLogs)}</span>
              </div>
              {metrics.avgMood ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Humor médio</span>
                  <span className="font-medium">{String(metrics.avgMood)}/5</span>
                </div>
              ) : null}
              {metrics.avgWater ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Água média</span>
                  <span className="font-medium">{String(metrics.avgWater)} copos/dia</span>
                </div>
              ) : null}
              {metrics.totalExerciseMinutes != null ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exercício total</span>
                  <span className="font-medium">{String(metrics.totalExerciseMinutes)} min</span>
                </div>
              ) : null}
              {metrics.weightStart && metrics.weightEnd ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peso</span>
                  <span className="font-medium">{String(metrics.weightStart)} → {String(metrics.weightEnd)} kg</span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados suficientes para o resumo semanal</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insights da AI</CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-primary font-bold">—</span>
                  <p className="text-foreground">{insight}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Preciso de mais dados para gerar insights. Continue registrando!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
