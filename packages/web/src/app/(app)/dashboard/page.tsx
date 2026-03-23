'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { MOOD_EMOJIS } from '@fittracker/shared';

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [weight, setWeight] = useState<string | null>(null);
  const [water, setWater] = useState(0);
  const [steps, setSteps] = useState(0);
  const [exerciseMin, setExerciseMin] = useState(0);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const uid = user.id;

    const [profileRes, weightRes, moodRes, waterRes, stepsRes, exerciseRes, sleepRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('id', uid).single(),
      supabase.from('weight_logs').select('weight_kg').eq('user_id', uid).eq('logged_date', today).single(),
      supabase.from('mood_logs').select('mood').eq('user_id', uid).eq('logged_date', today).single(),
      supabase.from('water_logs').select('glasses').eq('user_id', uid).eq('logged_date', today).single(),
      supabase.from('step_logs').select('steps').eq('user_id', uid).eq('logged_date', today).single(),
      supabase.from('exercise_logs').select('total_duration_min').eq('user_id', uid).eq('logged_date', today),
      supabase.from('sleep_logs').select('duration_min').eq('user_id', uid).eq('logged_date', today).single(),
    ]);

    setUserName(profileRes.data?.display_name || user.email?.split('@')[0] || 'Usuário');
    setWeight(weightRes.data?.weight_kg || null);
    setMood(moodRes.data?.mood || null);
    setWater(waterRes.data?.glasses || 0);
    setSteps(stepsRes.data?.steps || 0);
    setExerciseMin(exerciseRes.data?.reduce((s: number, e: { total_duration_min: number | null }) => s + (e.total_duration_min || 0), 0) || 0);
    setSleepMin(sleepRes.data?.duration_min || null);
    setLoading(false);
  }

  if (loading) return <div className="p-4 text-neutral-500">Carregando...</div>;

  const moodEmoji = mood ? MOOD_EMOJIS[Number(mood) as keyof typeof MOOD_EMOJIS] : null;

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
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl">⚖️</p>
          <p className="text-lg font-bold">{weight || '—'}</p>
          <p className="text-xs text-neutral-400">kg</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl">💧</p>
          <p className="text-lg font-bold">{water}</p>
          <p className="text-xs text-neutral-400">copos</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl">🏋️</p>
          <p className="text-lg font-bold">{exerciseMin}</p>
          <p className="text-xs text-neutral-400">min</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl">👟</p>
          <p className="text-lg font-bold">{steps.toLocaleString()}</p>
          <p className="text-xs text-neutral-400">passos</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl">🛏️</p>
          <p className="text-lg font-bold">{sleepMin ? `${Math.floor(sleepMin / 60)}h` : '—'}</p>
          <p className="text-xs text-neutral-400">sono</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl">{moodEmoji || '😊'}</p>
          <p className="text-lg font-bold">{mood || '—'}</p>
          <p className="text-xs text-neutral-400">humor</p>
        </CardContent></Card>
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
