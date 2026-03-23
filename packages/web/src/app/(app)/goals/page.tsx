'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Goal {
  id: string;
  goalType: string;
  title: string;
  targetValue: string;
  currentValue: string | null;
  unit: string;
  direction: string;
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadGoals(); }, []);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function loadGoals() {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/goals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setGoals(await res.json());
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const token = await getToken();

    await fetch(`${API_URL}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        goalType: form.get('goalType'),
        title: form.get('title'),
        targetValue: Number(form.get('targetValue')),
        unit: form.get('unit'),
        direction: form.get('direction'),
      }),
    });

    setShowForm(false);
    loadGoals();
  }

  async function archiveGoal(id: string) {
    const token = await getToken();
    await fetch(`${API_URL}/api/goals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadGoals();
  }

  function getProgress(goal: Goal) {
    if (!goal.currentValue) return 0;
    const current = Number(goal.currentValue);
    const target = Number(goal.targetValue);
    if (goal.direction === 'decrease') {
      return Math.min(100, Math.max(0, ((target - current) / target) * 100 + 100));
    }
    return Math.min(100, (current / target) * 100);
  }

  if (loading) return <div className="p-4 text-neutral-500">Carregando metas...</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-800">Metas</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nova meta'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input name="title" placeholder="Nome da meta (ex: Chegar a 75kg)" required />
              <select name="goalType" className="w-full border rounded-md p-2 text-sm" required>
                <option value="weight">Peso</option>
                <option value="water">Água</option>
                <option value="exercise_duration">Exercício</option>
                <option value="steps">Passos</option>
                <option value="sleep">Sono</option>
                <option value="custom">Outro</option>
              </select>
              <div className="flex gap-2">
                <Input name="targetValue" type="number" step="0.1" placeholder="Valor alvo" required />
                <Input name="unit" placeholder="Unidade (kg, copos...)" required />
              </div>
              <select name="direction" className="w-full border rounded-md p-2 text-sm">
                <option value="decrease">Diminuir até o alvo</option>
                <option value="increase">Aumentar até o alvo</option>
              </select>
              <Button type="submit" className="w-full">Criar meta</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-neutral-500">Nenhuma meta ativa</p>
            <p className="text-sm text-neutral-400 mt-1">Crie uma meta para acompanhar seu progresso!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = getProgress(goal);
            return (
              <Card key={goal.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-sm text-neutral-500">
                        Alvo: {goal.targetValue} {goal.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => archiveGoal(goal.id)}
                      className="text-xs text-neutral-400 hover:text-red-500"
                    >
                      Arquivar
                    </button>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2 mt-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{progress.toFixed(0)}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
