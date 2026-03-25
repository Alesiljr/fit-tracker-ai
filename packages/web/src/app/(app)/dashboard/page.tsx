'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { MOOD_EMOJIS } from '@fittracker/shared';
import { Scale, Droplets, Dumbbell, Footprints, Moon, Smile, Utensils, Flame, MessageCircle, type LucideIcon } from 'lucide-react';

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
      // Calories endpoint not available
    }

    setLoading(false);
  }

  if (authLoading || loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-lg w-2/3" />
          <div className="h-4 bg-muted rounded-lg w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const moodEmoji = mood ? MOOD_EMOJIS[Number(mood) as keyof typeof MOOD_EMOJIS] : null;
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
    breakfast: 'Cafe',
    lunch: 'Almoco',
    dinner: 'Jantar',
    snack: 'Lanche',
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="p-4 max-w-md mx-auto">
      {loadError && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          {loadError}
        </div>
      )}

      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide-custom">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight-custom mt-1">
          {greeting}, {userName} {moodEmoji || ''}
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard icon={Scale} value={weight || '—'} unit="kg" filled={hasWeight} focusField="peso" />
        <MetricCard icon={Droplets} value={water} unit="copos" filled={hasWater} focusField="agua" />
        <MetricCard icon={Dumbbell} value={exerciseMin} unit="min" filled={hasExercise} focusField="exercicio" />
        <MetricCard icon={Footprints} value={steps.toLocaleString()} unit="passos" filled={hasSteps} focusField="passos" />
        <MetricCard
          icon={Moon}
          value={sleepMin ? `${Math.floor(sleepMin / 60)}h${sleepMin % 60 > 0 ? `${sleepMin % 60}m` : ''}` : '—'}
          unit="sono"
          filled={hasSleep}
          focusField="sono"
        />
        <MetricCard
          icon={Smile}
          value={mood ? ['', 'Muito mal', 'Mal', 'Normal', 'Bem', 'Otimo'][Number(mood)] : '—'}
          unit="humor"
          filled={hasMood}
          focusField="humor"
        />
      </div>

      {/* Meals Card */}
      <Link href="/log/chat?focus=almoco">
        <Card className={`mb-3 cursor-pointer ${!hasMeals ? 'border-dashed' : ''}`}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Utensils size={18} className="text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Alimentacao</p>
                  <p className="text-xs text-muted-foreground">
                    {hasMeals ? `${mealCount}/4 refeicoes registradas` : 'Nenhuma refeicao registrada'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {allMealTypes.map(mt => (
                  <span
                    key={mt}
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      mealsLogged.includes(mt)
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
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
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gold-100 dark:bg-gold-500/10 flex items-center justify-center">
                <Flame size={18} className="text-gold-600" />
              </div>
              <p className="text-sm font-medium">Balanco Calorico</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{calories.totalIntake?.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide-custom">consumido</p>
              </div>
              <div>
                <p className="text-lg font-bold">{calories.dailyExpenditure?.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide-custom">gasto est.</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${(calories.deficit ?? 0) >= 0 ? 'text-primary' : 'text-gold-600'}`}>
                  {(calories.deficit ?? 0) >= 0 ? '-' : '+'}{Math.abs(calories.deficit ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide-custom">
                  {(calories.deficit ?? 0) >= 0 ? 'defice' : 'superavit'}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((calories.totalIntake ?? 0) / (calories.dailyExpenditure ?? 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              {calories.mealsLogged === 0
                ? 'Registre suas refeicoes para um calculo preciso'
                : `${calories.mealsLogged} refeicao(oes) | TMB: ${calories.bmr} kcal`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {calories && !calories.available && (
        <Card className="mb-4 border-dashed">
          <CardContent className="py-3 text-center">
            <Flame size={20} className="mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">{calories.reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Register CTA */}
      <Link href="/log/chat">
        <Card className="bg-gradient-to-r from-primary-600 to-primary-500 border-0 cursor-pointer hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200">
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <MessageCircle size={18} className="text-white" />
              <p className="text-white font-semibold">Registrar o dia de hoje</p>
            </div>
            <p className="text-xs text-white/70 mt-1">Fale naturalmente, a AI interpreta tudo</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/log" className="block mt-3 text-center">
        <p className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Prefiro preencher manualmente
        </p>
      </Link>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  unit,
  filled,
  focusField,
}: {
  icon: LucideIcon;
  value: string | number;
  unit: string;
  filled: boolean;
  focusField: string;
}) {
  return (
    <Link href={`/log/chat?focus=${focusField}`}>
      <Card
        className={`cursor-pointer group ${
          filled
            ? 'hover:shadow-card-hover'
            : 'border-dashed hover:border-primary/30 hover:bg-primary/5'
        }`}
      >
        <CardContent className="py-3 px-2 text-center">
          <div className={`w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center ${
            filled ? 'bg-primary/10' : 'bg-muted'
          }`}>
            <Icon size={16} className={filled ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <p className={`text-base font-bold tracking-tight-custom ${filled ? '' : 'text-muted-foreground'}`}>
            {filled ? value : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide-custom mt-0.5">
            {filled ? unit : 'registrar'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
