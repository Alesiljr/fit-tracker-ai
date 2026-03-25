'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OBJECTIVE_LABELS, type UserObjective } from '@fittracker/shared';
import { Plus, X, Check, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

const LOCATION_LABELS: Record<string, string> = { home: 'Em casa', gym: 'Academia', outdoor: 'Ao ar livre', other: 'Outro' };

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [objective, setObjective] = useState<UserObjective>('improve_health');
  const [heightCm, setHeightCm] = useState('');
  const [initialWeight, setInitialWeight] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [exerciseLocations, setExerciseLocations] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState('');
  const [aiDislikes, setAiDislikes] = useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = useState('');

  function toggleLocation(loc: string) {
    setExerciseLocations((prev) => prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]);
  }
  function addRestriction() { if (restrictionInput.trim()) { setDietaryRestrictions((prev) => [...prev, restrictionInput.trim()]); setRestrictionInput(''); } }
  function addDislike() { if (dislikeInput.trim()) { setAiDislikes((prev) => [...prev, dislikeInput.trim()]); setDislikeInput(''); } }

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
      { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) },
    );

    if (res.ok) { router.push('/log'); router.refresh(); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 via-transparent to-accent-500/5" />
      <div className="w-full max-w-md relative z-10">
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-primary' : s < step ? 'w-4 bg-primary/40' : 'w-4 bg-muted'}`} />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl tracking-tight">Bem-vindo ao FitTracker</CardTitle>
              <CardDescription>Vamos configurar a AI para entender voce.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Qual seu objetivo principal?</p>
              {(Object.entries(OBJECTIVE_LABELS) as [UserObjective, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setObjective(key)}
                  className={`w-full p-3 rounded-lg border text-left text-sm font-medium transition-all duration-200 ${
                    objective === key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
                  }`}>
                  {label}
                </button>
              ))}
              <Button className="w-full mt-4" onClick={() => setStep(2)}>Proximo <ArrowRight size={14} /></Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl tracking-tight">Sobre voce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Peso atual (kg)</label>
                <Input type="number" step="0.1" placeholder="72.5" value={initialWeight} onChange={(e) => setInitialWeight(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Altura (cm)</label>
                <Input type="number" placeholder="175" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Data de nascimento</label>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Esses dados ajudam a calcular seu gasto calorico. Voce pode ajustar depois.</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft size={14} /> Voltar</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Proximo <ArrowRight size={14} /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl tracking-tight">Suas preferencias</CardTitle>
              <CardDescription>Me conte o que voce NAO quer que eu sugira.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-2">Onde voce se exercita?</p>
                <div className="flex flex-wrap gap-2">
                  {['home', 'gym', 'outdoor', 'other'].map((loc) => (
                    <button key={loc} onClick={() => toggleLocation(loc)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                        exerciseLocations.includes(loc) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'
                      }`}>
                      {LOCATION_LABELS[loc]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Restricoes alimentares?</p>
                <div className="flex gap-2">
                  <Input placeholder="ex: vegetariano, sem lactose..." value={restrictionInput}
                    onChange={(e) => setRestrictionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRestriction())} />
                  <Button type="button" variant="outline" onClick={addRestriction}><Plus size={14} /></Button>
                </div>
                {dietaryRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {dietaryRestrictions.map((r, i) => (
                      <span key={i} onClick={() => setDietaryRestrictions((prev) => prev.filter((_, j) => j !== i))}
                        className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-destructive/10 hover:text-destructive flex items-center gap-1">
                        {r} <X size={10} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">O que voce NAO quer que a AI sugira?</p>
                <div className="flex gap-2">
                  <Input placeholder="ex: nao me mande ir na academia" value={dislikeInput}
                    onChange={(e) => setDislikeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDislike())} />
                  <Button type="button" variant="outline" onClick={addDislike}><Plus size={14} /></Button>
                </div>
                {aiDislikes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {aiDislikes.map((d, i) => (
                      <span key={i} onClick={() => setAiDislikes((prev) => prev.filter((_, j) => j !== i))}
                        className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg text-xs font-medium cursor-pointer hover:bg-destructive/20 flex items-center gap-1">
                        {d} <X size={10} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft size={14} /> Voltar</Button>
                <Button className="flex-1" onClick={() => setStep(4)}>Proximo <ArrowRight size={14} /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl tracking-tight">Tudo pronto</CardTitle>
              <CardDescription>Aqui esta o que eu sei sobre voce:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <SummaryItem label="Objetivo" value={OBJECTIVE_LABELS[objective]} />
                {initialWeight && <SummaryItem label="Peso" value={`${initialWeight} kg`} />}
                {heightCm && <SummaryItem label="Altura" value={`${heightCm} cm`} />}
                {exerciseLocations.length > 0 && <SummaryItem label="Exercita" value={exerciseLocations.map(l => LOCATION_LABELS[l]).join(', ')} />}
                {dietaryRestrictions.map((r, i) => <SummaryItem key={`r-${i}`} label="Restricao" value={r} />)}
                {aiDislikes.map((d, i) => <SummaryItem key={`d-${i}`} label="Nunca sugerir" value={d} variant="destructive" />)}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Vou aprender mais sobre voce conforme conversamos. Pode mudar qualquer preferencia a qualquer momento no Perfil.
              </p>

              <div className="flex gap-2 mt-4">
                <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft size={14} /> Voltar</Button>
                <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                  {loading ? 'Salvando...' : 'Comecar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value, variant }: { label: string; value: string; variant?: 'destructive' }) {
  return (
    <div className="flex items-start gap-2">
      <Check size={14} className={variant === 'destructive' ? 'text-destructive mt-0.5' : 'text-accent-500 mt-0.5'} />
      <p><strong>{label}:</strong> {value}</p>
    </div>
  );
}
