'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MEAL_LABELS, MEAL_DEFAULT_TIMES, sessionLabelFromTime } from '@fittracker/shared';
import type { MealType } from '@fittracker/shared';
import { Scale, Smile, Dumbbell, Droplets, Footprints, Moon, Utensils, MessageCircle, Save, Plus, X, Minus, Check } from 'lucide-react';

const MOODS = [
  { value: 1, label: 'Muito mal' },
  { value: 2, label: 'Mal' },
  { value: 3, label: 'Normal' },
  { value: 4, label: 'Bem' },
  { value: 5, label: 'Excelente' },
];

export default function LogPage() {
  useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [exercises, setExercises] = useState([{ id: '1', time: '', input: '' }]);
  const [mealTimes, setMealTimes] = useState<Record<string, string>>(
    Object.fromEntries((['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper'] as const).map(m => [m, MEAL_DEFAULT_TIMES[m] || '']))
  );
  const [morningSnack, setMorningSnack] = useState('');
  const [afternoonSnack, setAfternoonSnack] = useState('');
  const [supperMeal, setSupperMeal] = useState('');
  const [water, setWater] = useState(0);
  const [steps, setSteps] = useState('');
  const [sleptAt, setSleptAt] = useState('');
  const [wokeAt, setWokeAt] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');
  const [snack, setSnack] = useState('');

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const uid = user.id;

    const promises: PromiseLike<unknown>[] = [];

    if (weightKg) {
      promises.push(supabase.from('weight_logs').upsert(
        { user_id: uid, logged_date: today, weight_kg: parseFloat(weightKg) },
        { onConflict: 'user_id,logged_date' }
      ).select());
    }
    if (mood) {
      promises.push(supabase.from('mood_logs').upsert(
        { user_id: uid, logged_date: today, mood: String(mood), note: moodNote || null },
        { onConflict: 'user_id,logged_date' }
      ).select());
    }
    for (const ex of exercises) {
      if (ex.input.trim()) {
        promises.push(supabase.from('exercise_logs').insert(
          { user_id: uid, logged_date: today, raw_input: ex.input.trim(), exercises: [], started_at: ex.time || null, session_label: ex.time ? sessionLabelFromTime(ex.time) : null }
        ).select());
      }
    }
    if (water > 0) {
      promises.push(supabase.from('water_logs').upsert(
        { user_id: uid, logged_date: today, glasses: water },
        { onConflict: 'user_id,logged_date' }
      ).select());
    }
    if (steps) {
      promises.push(supabase.from('step_logs').upsert(
        { user_id: uid, logged_date: today, steps: parseInt(steps) },
        { onConflict: 'user_id,logged_date' }
      ).select());
    }
    if (sleptAt && wokeAt) {
      const sleptDate = new Date(`${today}T${sleptAt}:00`);
      const wokeDate = new Date(`${today}T${wokeAt}:00`);
      const durationMin = Math.round((wokeDate.getTime() - sleptDate.getTime()) / 60000);
      promises.push(supabase.from('sleep_logs').upsert(
        { user_id: uid, logged_date: today, slept_at: sleptDate.toISOString(), woke_at: wokeDate.toISOString(), quality: sleepQuality, duration_min: Math.abs(durationMin) },
        { onConflict: 'user_id,logged_date' }
      ).select());
    }

    const meals = [
      { type: 'breakfast', text: breakfast },
      { type: 'morning_snack', text: morningSnack },
      { type: 'lunch', text: lunch },
      { type: 'afternoon_snack', text: afternoonSnack },
      { type: 'dinner', text: dinner },
      { type: 'supper', text: supperMeal },
      { type: 'snack', text: snack },
    ];
    for (const m of meals) {
      if (m.text.trim()) {
        promises.push(supabase.from('food_logs').upsert(
          { user_id: uid, logged_date: today, meal_type: m.type, description: m.text.trim(), logged_at: mealTimes[m.type] || null, ai_estimated: false },
          { onConflict: 'user_id,logged_date,meal_type' }
        ).select());
      }
    }

    const results = await Promise.allSettled(promises);
    const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as { error?: unknown })?.error));
    setSaving(false);
    if (failures.length > 0) {
      setSaveError(`Erro ao salvar ${failures.length} registro(s). Tente novamente.`);
      setTimeout(() => setSaveError(''), 5000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registro Diario</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <a href="/log/chat" className="text-sm text-primary hover:underline flex items-center gap-1.5">
          <MessageCircle size={14} /> Via chat
        </a>
      </div>

      {/* Peso */}
      <Card>
        <CardHeader><CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2"><Scale size={14} /> Peso</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input type="number" step="0.1" placeholder="72.5" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
            <span className="text-sm text-muted-foreground">kg</span>
          </div>
        </CardContent>
      </Card>

      {/* Humor */}
      <Card>
        <CardHeader><CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2"><Smile size={14} /> Humor</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-between mb-3 gap-1">
            {MOODS.map(m => (
              <button key={m.value} onClick={() => setMood(m.value)} title={m.label}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200 ${mood === m.value ? 'bg-primary/10 text-primary ring-2 ring-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <Input placeholder="Como foi o dia? (opcional)" value={moodNote} onChange={e => setMoodNote(e.target.value)} />
        </CardContent>
      </Card>

      {/* Exercicio */}
      <Card>
        <CardHeader><CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2"><Dumbbell size={14} /> Exercicios do Dia</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {exercises.map((ex, idx) => (
            <div key={ex.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input type="time" value={ex.time} onChange={e => { const arr = [...exercises]; arr[idx] = { ...arr[idx], time: e.target.value }; setExercises(arr); }}
                    className="w-28 text-xs" />
                  <span className="text-xs text-muted-foreground">{ex.time ? sessionLabelFromTime(ex.time) : ''}</span>
                </div>
                {exercises.length > 1 && (
                  <button onClick={() => setExercises(exercises.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive transition-colors"><X size={14} /></button>
                )}
              </div>
              <textarea placeholder="Ex: 30 min de agachamento e flexao..." value={ex.input}
                onChange={e => { const arr = [...exercises]; arr[idx] = { ...arr[idx], input: e.target.value }; setExercises(arr); }}
                rows={2} className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all duration-200" />
            </div>
          ))}
          <button onClick={() => setExercises([...exercises, { id: Date.now().toString(), time: '', input: '' }])}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"><Plus size={12} /> Adicionar exercicio</button>
        </CardContent>
      </Card>

      {/* Agua */}
      <Card>
        <CardHeader><CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2"><Droplets size={14} /> Agua</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <button onClick={() => setWater(Math.max(0, water - 1))} className="w-10 h-10 rounded-full bg-muted text-foreground font-bold flex items-center justify-center hover:bg-muted/80 transition-colors"><Minus size={16} /></button>
            <span className="text-2xl font-bold min-w-[3ch] text-center">{water}</span>
            <button onClick={() => setWater(water + 1)} className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center hover:bg-primary/20 transition-colors"><Plus size={16} /></button>
            <span className="text-sm text-muted-foreground">copos</span>
          </div>
        </CardContent>
      </Card>

      {/* Passos */}
      <Card>
        <CardHeader><CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2"><Footprints size={14} /> Passos</CardTitle></CardHeader>
        <CardContent>
          <Input type="number" placeholder="8000" value={steps} onChange={e => setSteps(e.target.value)} />
        </CardContent>
      </Card>

      {/* Sono */}
      <Card>
        <CardHeader><CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2"><Moon size={14} /> Sono</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1 block">Dormiu as</label>
              <Input type="time" value={sleptAt} onChange={e => setSleptAt(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1 block">Acordou as</label>
              <Input type="time" value={wokeAt} onChange={e => setWokeAt(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium">Qualidade: {sleepQuality}/5</label>
            <input type="range" min="1" max="5" value={sleepQuality} onChange={e => setSleepQuality(Number(e.target.value))} className="w-full accent-primary mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Alimentacao */}
      <Card>
        <CardHeader><CardTitle className="text-[11px] uppercase tracking-wide-custom text-muted-foreground flex items-center gap-2"><Utensils size={14} /> Alimentacao</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {([
            { key: 'breakfast', value: breakfast, set: setBreakfast },
            { key: 'morning_snack', value: morningSnack, set: setMorningSnack },
            { key: 'lunch', value: lunch, set: setLunch },
            { key: 'afternoon_snack', value: afternoonSnack, set: setAfternoonSnack },
            { key: 'dinner', value: dinner, set: setDinner },
            { key: 'supper', value: supperMeal, set: setSupperMeal },
            { key: 'snack', value: snack, set: setSnack },
          ] as const).map(({ key, value, set }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs text-muted-foreground flex-1 font-medium">{MEAL_LABELS[key as keyof typeof MEAL_LABELS]}</label>
                <Input type="time" value={mealTimes[key] || ''} onChange={e => setMealTimes({ ...mealTimes, [key]: e.target.value })}
                  className="w-24 text-xs" />
              </div>
              <textarea placeholder="O que comeu?" value={value} onChange={e => set(e.target.value)}
                rows={1} className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all duration-200" />
            </div>
          ))}
        </CardContent>
      </Card>

      {saveError && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-sm text-center">
          {saveError}
        </div>
      )}

      {saved && (
        <div className="p-3 rounded-xl bg-accent/10 text-accent-600 dark:text-accent-400 border border-accent/20 text-sm text-center flex items-center justify-center gap-2">
          <Check size={14} /> Registro salvo com sucesso
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full py-6 text-base">
        <Save size={16} />
        {saving ? 'Salvando...' : 'Salvar Registro'}
      </Button>
    </div>
  );
}
