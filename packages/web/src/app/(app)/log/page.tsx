'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MOOD_EMOJIS = [
  { value: 1, emoji: '\u{1F622}', label: 'Muito mal' },
  { value: 2, emoji: '\u{1F610}', label: 'Mal' },
  { value: 3, emoji: '\u{1F60A}', label: 'Normal' },
  { value: 4, emoji: '\u{1F604}', label: 'Bem' },
  { value: 5, emoji: '\u{1F525}', label: 'Excelente' },
] as const;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogPage() {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [logDate] = useState(todayStr);

  // Form state
  const [weightKg, setWeightKg] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [exerciseText, setExerciseText] = useState('');
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [steps, setSteps] = useState('');
  const [sleptAt, setSleptAt] = useState('');
  const [wokeAt, setWokeAt] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');
  const [snack, setSnack] = useState('');

  const getToken = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, []);

  const post = useCallback(
    async (path: string, body: unknown) => {
      const token = await getToken();
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      return res.json();
    },
    [getToken],
  );

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    const errors: string[] = [];
    const promises: Promise<unknown>[] = [];

    // Weight
    if (weightKg.trim()) {
      const val = parseFloat(weightKg);
      if (!isNaN(val) && val >= 10 && val <= 500) {
        promises.push(
          post('/api/health/weight', { loggedDate: logDate, weightKg: val }),
        );
      } else {
        errors.push('Peso deve estar entre 10 e 500 kg');
      }
    }

    // Mood
    if (mood !== null) {
      promises.push(
        post('/api/health/mood', {
          loggedDate: logDate,
          mood,
          note: moodNote.trim() || undefined,
        }),
      );
    }

    // Exercise
    if (exerciseText.trim()) {
      promises.push(
        post('/api/health/exercise', {
          loggedDate: logDate,
          rawInput: exerciseText.trim(),
        }),
      );
    }

    // Water
    if (waterGlasses > 0) {
      promises.push(
        post('/api/health/water', {
          loggedDate: logDate,
          glasses: waterGlasses,
        }),
      );
    }

    // Steps
    if (steps.trim()) {
      const val = parseInt(steps, 10);
      if (!isNaN(val) && val >= 0) {
        promises.push(
          post('/api/health/steps', {
            loggedDate: logDate,
            steps: val,
          }),
        );
      } else {
        errors.push('Passos deve ser um numero positivo');
      }
    }

    // Sleep
    if (sleptAt && wokeAt) {
      // Convert time inputs to ISO datetime using logDate context
      const sleptAtISO = new Date(`${logDate}T${sleptAt}:00`).toISOString();
      const wokeAtISO = new Date(`${logDate}T${wokeAt}:00`).toISOString();
      promises.push(
        post('/api/health/sleep', {
          loggedDate: logDate,
          sleptAt: sleptAtISO,
          wokeAt: wokeAtISO,
          quality: sleepQuality,
        }),
      );
    }

    // Food logs
    const meals = [
      { meal: 'breakfast', text: breakfast },
      { meal: 'lunch', text: lunch },
      { meal: 'dinner', text: dinner },
      { meal: 'snack', text: snack },
    ];
    for (const { meal, text } of meals) {
      if (text.trim()) {
        promises.push(
          post('/api/health/food', {
            loggedDate: logDate,
            meal,
            rawInput: text.trim(),
          }),
        );
      }
    }

    if (promises.length === 0 && errors.length === 0) {
      setFeedback('Nenhum dado para salvar.');
      setSaving(false);
      return;
    }

    try {
      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        const msgs = failed.map((r) =>
          r.status === 'rejected' ? (r.reason as Error).message : '',
        );
        errors.push(...msgs);
      }

      if (errors.length > 0) {
        setFeedback(`Salvo com erros: ${errors.join('; ')}`);
      } else {
        setFeedback('Registro salvo com sucesso!');
      }
    } catch (err) {
      setFeedback(`Erro ao salvar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Registro Diario</h1>
        <p className="text-sm text-neutral-500 mt-1">{logDate}</p>
      </div>

      {/* Weight */}
      <section className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-3">
          Peso
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="10"
            max="500"
            placeholder="Ex: 72.5"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-sm text-neutral-500">kg</span>
        </div>
      </section>

      {/* Mood */}
      <section className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-3">
          Humor
        </h2>
        <div className="flex justify-between mb-3">
          {MOOD_EMOJIS.map(({ value, emoji, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMood(value)}
              title={label}
              className={`text-2xl p-2 rounded-lg transition-colors ${
                mood === value
                  ? 'bg-primary-100 ring-2 ring-primary-500'
                  : 'hover:bg-neutral-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Nota opcional..."
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </section>

      {/* Exercise */}
      <section className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-3">
          Exercicio
        </h2>
        <textarea
          placeholder="Ex: Corrida 30 min, musculacao 45 min..."
          value={exerciseText}
          onChange={(e) => setExerciseText(e.target.value)}
          rows={3}
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </section>

      {/* Water */}
      <section className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-3">
          Agua
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setWaterGlasses((g) => Math.max(0, g - 1))}
            className="w-10 h-10 rounded-full bg-neutral-100 text-lg font-bold text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            -
          </button>
          <span className="text-2xl font-semibold text-neutral-800 min-w-[3ch] text-center">
            {waterGlasses}
          </span>
          <button
            type="button"
            onClick={() => setWaterGlasses((g) => g + 1)}
            className="w-10 h-10 rounded-full bg-primary-100 text-lg font-bold text-primary-600 hover:bg-primary-200 transition-colors"
          >
            +
          </button>
          <span className="text-sm text-neutral-500">copos</span>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-3">
          Passos
        </h2>
        <input
          type="number"
          min="0"
          placeholder="Ex: 8000"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </section>

      {/* Sleep */}
      <section className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-3">
          Sono
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Dormiu as</label>
            <input
              type="time"
              value={sleptAt}
              onChange={(e) => setSleptAt(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Acordou as</label>
            <input
              type="time"
              value={wokeAt}
              onChange={(e) => setWokeAt(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Qualidade: {sleepQuality}/5
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={sleepQuality}
            onChange={(e) => setSleepQuality(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>
      </section>

      {/* Food */}
      <section className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-3">
          Alimentacao
        </h2>
        <div className="space-y-3">
          {([
            { label: 'Cafe da manha', value: breakfast, setter: setBreakfast },
            { label: 'Almoco', value: lunch, setter: setLunch },
            { label: 'Jantar', value: dinner, setter: setDinner },
            { label: 'Lanche', value: snack, setter: setSnack },
          ] as const).map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-xs text-neutral-500 mb-1">{label}</label>
              <textarea
                placeholder={`O que voce comeu no ${label.toLowerCase()}?`}
                value={value}
                onChange={(e) => setter(e.target.value)}
                rows={2}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-md text-sm ${
            feedback.includes('sucesso')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Salvando...' : 'Salvar Registro'}
      </button>
    </div>
  );
}
