'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MEAL_LABELS, MEAL_DEFAULT_TIMES, MEAL_ICONS, sessionLabelFromTime } from '@fittracker/shared';
import type { MealType } from '@fittracker/shared';

const MOODS = [
  { value: 1, emoji: '😢', label: 'Muito mal' },
  { value: 2, emoji: '😐', label: 'Mal' },
  { value: 3, emoji: '😊', label: 'Normal' },
  { value: 4, emoji: '😄', label: 'Bem' },
  { value: 5, emoji: '🔥', label: 'Excelente' },
];

export default function LogPage() {
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

    // Save meals to food_logs with times
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
          <h1 className="text-2xl font-bold text-neutral-800">Registro Diário</h1>
          <p className="text-sm text-neutral-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <a href="/log/chat" className="text-sm text-primary-500 hover:underline">
          💬 Via chat
        </a>
      </div>

      {/* Peso */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase text-neutral-500">⚖️ Peso</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input type="number" step="0.1" placeholder="72.5" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
            <span className="text-sm text-neutral-500">kg</span>
          </div>
        </CardContent>
      </Card>

      {/* Humor */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase text-neutral-500">😊 Humor</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-between mb-3">
            {MOODS.map(m => (
              <button key={m.value} onClick={() => setMood(m.value)} title={m.label}
                className={`text-2xl p-2 rounded-lg transition-colors ${mood === m.value ? 'bg-primary-100 ring-2 ring-primary-500' : 'hover:bg-neutral-100'}`}>
                {m.emoji}
              </button>
            ))}
          </div>
          <Input placeholder="Como foi o dia? (opcional)" value={moodNote} onChange={e => setMoodNote(e.target.value)} />
        </CardContent>
      </Card>

      {/* Exercício - Múltiplas sessões */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase text-neutral-500">🏋️ Exercícios do Dia</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {exercises.map((ex, idx) => (
            <div key={ex.id} className="bg-neutral-50 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input type="time" value={ex.time} onChange={e => { const arr = [...exercises]; arr[idx] = { ...arr[idx], time: e.target.value }; setExercises(arr); }}
                    className="w-28 text-xs" />
                  <span className="text-xs text-neutral-400">{ex.time ? sessionLabelFromTime(ex.time) : ''}</span>
                </div>
                {exercises.length > 1 && (
                  <button onClick={() => setExercises(exercises.filter((_, i) => i !== idx))} className="text-neutral-300 hover:text-red-400 text-sm">✕</button>
                )}
              </div>
              <textarea placeholder="Ex: 30 min de agachamento e flexão..." value={ex.input}
                onChange={e => { const arr = [...exercises]; arr[idx] = { ...arr[idx], input: e.target.value }; setExercises(arr); }}
                rows={2} className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          ))}
          <button onClick={() => setExercises([...exercises, { id: Date.now().toString(), time: '', input: '' }])}
            className="text-sm text-primary-500 hover:underline">+ Adicionar exercício</button>
        </CardContent>
      </Card>

      {/* Água */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase text-neutral-500">💧 Água</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <button onClick={() => setWater(Math.max(0, water - 1))} className="w-10 h-10 rounded-full bg-neutral-100 text-lg font-bold">-</button>
            <span className="text-2xl font-semibold min-w-[3ch] text-center">{water}</span>
            <button onClick={() => setWater(water + 1)} className="w-10 h-10 rounded-full bg-primary-100 text-lg font-bold text-primary-600">+</button>
            <span className="text-sm text-neutral-500">copos</span>
          </div>
        </CardContent>
      </Card>

      {/* Passos */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase text-neutral-500">👟 Passos</CardTitle></CardHeader>
        <CardContent>
          <Input type="number" placeholder="8000" value={steps} onChange={e => setSteps(e.target.value)} />
        </CardContent>
      </Card>

      {/* Sono */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase text-neutral-500">🛏️ Sono</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500">Dormiu às</label>
              <Input type="time" value={sleptAt} onChange={e => setSleptAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Acordou às</label>
              <Input type="time" value={wokeAt} onChange={e => setWokeAt(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Qualidade: {sleepQuality}/5</label>
            <input type="range" min="1" max="5" value={sleepQuality} onChange={e => setSleepQuality(Number(e.target.value))} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Alimentação com horários */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase text-neutral-500">🍽️ Alimentação</CardTitle></CardHeader>
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
                <span className="text-sm">{MEAL_ICONS[key]}</span>
                <label className="text-xs text-neutral-500 flex-1">{MEAL_LABELS[key as keyof typeof MEAL_LABELS]}</label>
                <Input type="time" value={mealTimes[key] || ''} onChange={e => setMealTimes({ ...mealTimes, [key]: e.target.value })}
                  className="w-24 text-xs" />
              </div>
              <textarea placeholder="O que comeu?" value={value} onChange={e => set(e.target.value)}
                rows={1} className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          ))}
        </CardContent>
      </Card>

      {saveError && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm text-center">
          {saveError}
        </div>
      )}

      {saved && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 border border-green-200 text-sm text-center">
          Registro salvo com sucesso! ✨
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full py-6 text-base">
        {saving ? 'Salvando...' : '💾 Salvar Registro'}
      </Button>
    </div>
  );
}
