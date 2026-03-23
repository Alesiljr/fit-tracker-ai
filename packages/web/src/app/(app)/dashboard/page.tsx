'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { MOOD_EMOJIS } from '@fittracker/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DayData {
  weight: string | null;
  mood: string | null;
  moodNote: string | null;
  waterGlasses: number;
  steps: number;
  exerciseMinutes: number;
  sleepDurationMin: number | null;
  sleepQuality: number | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DayData | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };

    const [dashRes, profileRes] = await Promise.all([
      fetch(`${API_URL}/api/dashboard/today`, { headers }),
      fetch(`${API_URL}/api/profile`, { headers }),
    ]);

    if (dashRes.ok) setData(await dashRes.json());
    if (profileRes.ok) {
      const profile = await profileRes.json();
      setUserName(profile.displayName || 'Usuário');
    }
    setLoading(false);
  }

  if (loading) return <div className="p-4 text-neutral-500">Carregando...</div>;

  const moodEmoji = data?.mood
    ? MOOD_EMOJIS[Number(data.mood) as keyof typeof MOOD_EMOJIS]
    : null;

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">
          Olá, {userName}! {moodEmoji || '👋'}
        </h1>
        <p className="text-sm text-neutral-500">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl">⚖️</p>
            <p className="text-lg font-bold">{data?.weight || '—'}</p>
            <p className="text-xs text-neutral-400">kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl">💧</p>
            <p className="text-lg font-bold">{data?.waterGlasses || 0}</p>
            <p className="text-xs text-neutral-400">copos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl">🏋️</p>
            <p className="text-lg font-bold">{data?.exerciseMinutes || 0}</p>
            <p className="text-xs text-neutral-400">min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl">👟</p>
            <p className="text-lg font-bold">{data?.steps?.toLocaleString() || 0}</p>
            <p className="text-xs text-neutral-400">passos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl">🛏️</p>
            <p className="text-lg font-bold">
              {data?.sleepDurationMin ? `${Math.floor(data.sleepDurationMin / 60)}h` : '—'}
            </p>
            <p className="text-xs text-neutral-400">sono</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl">{moodEmoji || '😊'}</p>
            <p className="text-lg font-bold">{data?.mood || '—'}</p>
            <p className="text-xs text-neutral-400">humor</p>
          </CardContent>
        </Card>
      </div>

      <Link href="/log">
        <Card className="bg-primary-50 border-primary-200 hover:bg-primary-100 transition-colors cursor-pointer">
          <CardContent className="py-4 text-center">
            <p className="text-primary-600 font-medium">📝 Registrar o dia de hoje</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
