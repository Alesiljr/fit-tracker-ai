'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OBJECTIVE_LABELS, type UserObjective } from '@fittracker/shared';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Step 1: Objective
  const [objective, setObjective] = useState<UserObjective>('improve_health');

  // Step 2: Basic data
  const [heightCm, setHeightCm] = useState('');
  const [initialWeight, setInitialWeight] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Step 3: Preferences & Boundaries
  const [exerciseLocations, setExerciseLocations] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState('');
  const [aiDislikes, setAiDislikes] = useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = useState('');

  function toggleLocation(loc: string) {
    setExerciseLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc],
    );
  }

  function addRestriction() {
    if (restrictionInput.trim()) {
      setDietaryRestrictions((prev) => [...prev, restrictionInput.trim()]);
      setRestrictionInput('');
    }
  }

  function addDislike() {
    if (dislikeInput.trim()) {
      setAiDislikes((prev) => [...prev, dislikeInput.trim()]);
      setDislikeInput('');
    }
  }

  async function handleComplete() {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const body = {
      objective,
      heightCm: heightCm ? Number(heightCm) : undefined,
      initialWeight: initialWeight ? Number(initialWeight) : undefined,
      dateOfBirth: dateOfBirth || undefined,
      exerciseLocations,
      dietaryRestrictions,
      aiDislikes,
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/profile/onboarding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) {
      router.push('/log');
      router.refresh();
    }
    setLoading(false);
  }

  const dots = (
    <div className="flex justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full ${s === step ? 'bg-primary-500' : 'bg-neutral-300'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white p-4">
      <div className="w-full max-w-md">
        {dots}

        {/* STEP 1: Objective */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Bem-vindo! 🌟</CardTitle>
              <CardDescription>
                Vamos configurar o FitTracker AI para entender VOCÊ.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-600 mb-4">Qual seu objetivo principal?</p>
              {(Object.entries(OBJECTIVE_LABELS) as [UserObjective, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setObjective(key)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      objective === key
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300'
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
              <Button className="w-full mt-4" onClick={() => setStep(2)}>
                Próximo →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Basic Data */}
        {step === 2 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sobre você 📋</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-neutral-600">Peso atual (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="72.5"
                  value={initialWeight}
                  onChange={(e) => setInitialWeight(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Altura (cm)</label>
                <Input
                  type="number"
                  placeholder="175"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Data de nascimento</label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <p className="text-xs text-neutral-400">
                Esses dados nos ajudam a calcular seu gasto calórico. Você pode ajustar depois.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Próximo →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Preferences & Boundaries (MOST IMPORTANT) */}
        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Suas preferências 🎯</CardTitle>
              <CardDescription>
                Me conte o que você NÃO quer que eu sugira. Vou respeitar sempre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exercise locations */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  Onde você se exercita?
                </p>
                <div className="flex flex-wrap gap-2">
                  {['home', 'gym', 'outdoor', 'other'].map((loc) => (
                    <button
                      key={loc}
                      onClick={() => toggleLocation(loc)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        exerciseLocations.includes(loc)
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-neutral-300 hover:border-primary-300'
                      }`}
                    >
                      {{ home: '🏠 Em casa', gym: '🏋️ Academia', outdoor: '🌳 Ao ar livre', other: '📍 Outro' }[loc]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary restrictions */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  Restrições alimentares?
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="ex: vegetariano, sem lactose..."
                    value={restrictionInput}
                    onChange={(e) => setRestrictionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRestriction())}
                  />
                  <Button type="button" variant="outline" onClick={addRestriction}>+</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {dietaryRestrictions.map((r, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs cursor-pointer hover:bg-red-50 hover:text-red-600"
                      onClick={() => setDietaryRestrictions((prev) => prev.filter((_, j) => j !== i))}
                    >
                      {r} ×
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Dislikes (BOUNDARIES) */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  O que você NÃO quer que a AI sugira?
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="ex: não me mande ir na academia"
                    value={dislikeInput}
                    onChange={(e) => setDislikeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDislike())}
                  />
                  <Button type="button" variant="outline" onClick={addDislike}>+</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {aiDislikes.map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs cursor-pointer hover:bg-red-100"
                      onClick={() => setAiDislikes((prev) => prev.filter((_, j) => j !== i))}
                    >
                      🚫 {d} ×
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
                <Button className="flex-1" onClick={() => setStep(4)}>Próximo →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Confirmation */}
        {step === 4 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Pronto! 🎉</CardTitle>
              <CardDescription>
                Entendi! Aqui está o que eu sei sobre você até agora:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <p>✅ <strong>Objetivo:</strong> {OBJECTIVE_LABELS[objective]}</p>
                {initialWeight && <p>✅ <strong>Peso:</strong> {initialWeight} kg</p>}
                {heightCm && <p>✅ <strong>Altura:</strong> {heightCm} cm</p>}
                {exerciseLocations.length > 0 && (
                  <p>✅ <strong>Exercita:</strong> {exerciseLocations.join(', ')}</p>
                )}
                {dietaryRestrictions.map((r, i) => (
                  <p key={i}>📝 <strong>Restrição:</strong> {r}</p>
                ))}
                {aiDislikes.map((d, i) => (
                  <p key={i}>🚫 <strong>Nunca sugerir:</strong> {d}</p>
                ))}
              </div>

              <p className="text-xs text-neutral-400 mt-4">
                Vou aprender mais sobre você conforme conversamos. Pode mudar qualquer
                preferência a qualquer momento em Configurações.
              </p>

              <div className="flex gap-2 mt-4">
                <Button variant="ghost" onClick={() => setStep(3)}>← Voltar</Button>
                <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                  {loading ? 'Salvando...' : 'Começar! 🚀'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
