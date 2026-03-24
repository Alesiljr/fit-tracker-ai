'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { MOOD_EMOJIS } from '@fittracker/shared';

interface CaloriesData {
  available: boolean;
  reason?: string;
  bmr?: number;
  dailyExpenditure?: number;
  totalIntake?: number;
  deficit?: number;
  mealsLogged?: number;
}

export default function DashboardPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [userName, setUserName] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [weight, setWeight] = useState<string | null>(null);
  const [water, setWater] = useState(0);
  const [steps, setSteps] = useState(0);
  const [exerciseMin, setExerciseMin] = useState(0);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [mealsLogged, setMealsLogged] = useState<string[]>([]);
  const [calories, setCalories] = useState<CaloriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { if (authUser) loadData(); }, [authUser]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const uid = user.id;

    const [profileRes, weightRes, moodRes, waterRes, stepsRes, exerciseRes, sleepRes, foodRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('id', uid).single(),
      supabase.from('weight_logs').select('weight_kg').eq('user_id', uid).eq('logged_date', today).maybeSingle(),
      supabase.from('mood_logs').select('mood').eq('user_id', uid).eq('logged_date', today).maybeSingle(),
      supabase.from('water_logs').select('glasses').eq('user_id', uid).eq('logged_date', today).maybeSingle(),
      supabase.from('step_logs').select('steps').eq('user_id', uid).eq('logged_date', today).maybeSingle(),
      supabase.from('exercise_logs').select('total_duration_min').eq('user_id', uid).eq('logged_date', today),
      supabase.from('sleep_logs').select('duration_min').eq('user_id', uid).eq('logged_date', today).maybeSingle(),
      supabase.from('food_logs').select('meal_type, total_calories').eq('user_id', uid).eq('logged_date', today),
    ]);

    // Check for RLS/permission errors on critical queries
    const hasErrors = [profileRes, weightRes, moodRes, waterRes, stepsRes, exerciseRes, sleepRes, foodRes]
      .some(res => res.error);
    if (hasErrors) {
      setLoadError('Alguns dados não puderam ser carregados. Tente recarregar a página.');
    }

    setUserName(profileRes.data?.display_name || user.email?.split('@')[0] || 'Usuário');
    setWeight(weightRes.data?.weight_kg || null);
    setMood(moodRes.data?.mood || null);
    setWater(waterRes.data?.glasses || 0);
    setSteps(stepsRes.data?.steps || 0);
    setExerciseMin(exerciseRes.data?.reduce((s: number, e: { total_duration_min: number | null }) => s + (e.total_duration_min || 0), 0) || 0);
    setSleepMin(sleepRes.data?.duration_min || null);
    setMealsLogged((foodRes.data || []).map((f: { meal_type: string }) => f.meal_type));

    // Load calories from API if available
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const calRes = await fetch(`${apiBase}/api/dashboard/calories`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (calRes.ok) {
        setCalories(await calRes.json());
      }
    } catch {
      // Calories endpoint not available, skip
    }

    setLoading(false);
  }

  if (authLoading || loading) return <div className="p-4 text-neutral-500">Carregando...</div>;

  const moodEmoji = mood ? MOOD_EMOJIS[Number(mood) as keyof typeof MOOD_EMOJIS] : null;

  // Determine which fields are missing
  const hasMood = mood !== null;
  const hasWeight = weight !== null;
  const hasWater = water > 0;
  const hasSteps = steps > 0;
  const hasExercise = exerciseMin > 0;
  const hasSleep = sleepMin !== null;
  const hasMeals = mealsLogged.length > 0;
  const mealCount = mealsLogged.length;

  const allMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealLabels: Record<string, string> = {
    breakfast: 'Café',
    lunch: 'Almoço',
    dinner: 'Jantar',
    snack: 'Lanche',
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {loadError && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {loadError}
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">
          Olá, {userName}! {moodEmoji || '👋'}
        </h1>
        <p className="text-sm text-neutral-500">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard
          emoji="⚖️"
          value={weight || '—'}
          unit="kg"
          filled={hasWeight}
          focusField="peso"
        />
        <MetricCard
          emoji="💧"
          value={water}
          unit="copos"
          filled={hasWater}
          focusField="agua"
        />
        <MetricCard
          emoji="🏋️"
          value={exerciseMin}
          unit="min"
          filled={hasExercise}
          focusField="exercicio"
        />
        <MetricCard
          emoji="👟"
          value={steps.toLocaleString()}
          unit="passos"
          filled={hasSteps}
          focusField="passos"
        />
        <MetricCard
          emoji="🛏️"
          value={sleepMin ? `${Math.floor(sleepMin / 60)}h${sleepMin % 60 > 0 ? `${sleepMin % 60}m` : ''}` : '—'}
          unit="sono"
          filled={hasSleep}
          focusField="sono"
        />
        <MetricCard
          emoji={moodEmoji || '😊'}
          value={mood ? ['', 'Muito mal', 'Mal', 'Normal', 'Bem', 'Excelente'][Number(mood)] : '—'}
          unit="humor"
          filled={hasMood}
          focusField="humor"
        />
      </div>

      {/* Meals Card */}
      <Link href="/log/chat?focus=almoco">
        <Card className={`mb-3 transition-colors cursor-pointer ${hasMeals ? 'bg-white' : 'bg-neutral-50 border-dashed'}`}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍽️</span>
                <div>
                  <p className="text-sm font-medium text-neutral-700">Alimentação</p>
                  <p className="text-xs text-neutral-400">
                    {hasMeals
                      ? `${mealCount}/4 refeições registradas`
                      : 'Nenhuma refeição registrada'
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {allMealTypes.map(mt => (
                  <span
                    key={mt}
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      mealsLogged.includes(mt)
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                    title={mealLabels[mt]}
                  >
                    {mealLabels[mt]}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Calorie Deficit Card */}
      {calories?.available && (
        <Card className="mb-4 bg-white">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔥</span>
              <p className="text-sm font-medium text-neutral-700">Balanço Calórico</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-neutral-800">
                  {calories.totalIntake?.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-400">consumido</p>
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-800">
                  {calories.dailyExpenditure?.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-400">gasto est.</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${(calories.deficit ?? 0) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                  {(calories.deficit ?? 0) >= 0 ? '-' : '+'}{Math.abs(calories.deficit ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-neutral-400">
                  {(calories.deficit ?? 0) >= 0 ? 'défice' : 'superávit'}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((calories.totalIntake ?? 0) / (calories.dailyExpenditure ?? 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-neutral-400 mt-1 text-center">
              {calories.mealsLogged === 0
                ? 'Registre suas refeições para um cálculo preciso'
                : `${calories.mealsLogged} refeição(ões) registrada(s) | TMB: ${calories.bmr} kcal`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {calories && !calories.available && (
        <Card className="mb-4 bg-neutral-50 border-dashed">
          <CardContent className="py-3 text-center">
            <span className="text-xl">🔥</span>
            <p className="text-xs text-neutral-400 mt-1">{calories.reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Register CTA */}
      <Link href="/log/chat">
        <Card className="bg-primary-50 border-primary-200 hover:bg-primary-100 transition-colors cursor-pointer">
          <CardContent className="py-4 text-center">
            <p className="text-primary-600 font-medium">💬 Registrar o dia de hoje</p>
            <p className="text-xs text-primary-400 mt-0.5">Fale naturalmente, a AI interpreta tudo</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/log" className="block mt-2 text-center">
        <p className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
          Prefiro preencher manualmente
        </p>
      </Link>
    </div>
  );
}

function MetricCard({
  emoji,
  value,
  unit,
  filled,
  focusField,
}: {
  emoji: string;
  value: string | number;
  unit: string;
  filled: boolean;
  focusField: string;
}) {
  return (
    <Link href={`/log/chat?focus=${focusField}`}>
      <Card
        className={`transition-colors cursor-pointer ${
          filled
            ? 'bg-white hover:bg-neutral-50'
            : 'bg-neutral-50 border-dashed border-neutral-300 hover:bg-primary-50 hover:border-primary-200'
        }`}
      >
        <CardContent className="py-3 text-center">
          <p className="text-2xl">{emoji}</p>
          <p className={`text-lg font-bold ${filled ? 'text-neutral-800' : 'text-neutral-300'}`}>
            {filled ? value : '—'}
          </p>
          <p className="text-xs text-neutral-400">
            {filled ? unit : 'registrar'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
