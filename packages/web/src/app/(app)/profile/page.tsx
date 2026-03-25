'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OBJECTIVE_LABELS, GENDER_LABELS, BLOOD_TYPES, GENDERS, type UserObjective } from '@fittracker/shared';
import type { Medication, HealthCondition } from '@fittracker/shared';
import { User, Heart, Pill, Shield, Plus, X, type LucideIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Record<string, string | number | boolean | null>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [supplements, setSupplements] = useState<Medication[]>([]);
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>([]);
  const [newIntolerance, setNewIntolerance] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [healthSaving, setHealthSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => { if (authUser) { loadProfile(); loadHealthInfo(); } }, [authUser]);

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        setError('Erro ao carregar perfil.');
      }
    } catch {
      setError('Erro ao carregar perfil. Verifique sua conexao.');
    }
    setLoading(false);
  }

  async function loadHealthInfo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_health_info').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setIntolerances(data.intolerances || []);
      setAllergies(data.allergies || []);
      setMedications(data.medications || []);
      setSupplements(data.supplements || []);
      setHealthConditions(data.health_conditions || []);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSaving(false); return; }

      const form = new FormData(e.target as HTMLFormElement);
      const updates = {
        displayName: form.get('displayName') as string,
        dateOfBirth: (form.get('dateOfBirth') as string) || undefined,
        gender: (form.get('gender') as string) || undefined,
        bloodType: (form.get('bloodType') as string) || undefined,
        heightCm: Number(form.get('heightCm')) || undefined,
        initialWeight: Number(form.get('initialWeight')) || undefined,
        objective: form.get('objective') as string,
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Erro ao salvar perfil.');
        setSaving(false);
        return;
      }

      const data = await res.json();
      setProfile(data);
      setEditing(false);
    } catch {
      setError('Erro ao salvar perfil. Verifique sua conexao.');
    }
    setSaving(false);
  }

  async function handleSaveHealth() {
    setHealthSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHealthSaving(false); return; }

    const healthData = { user_id: user.id, intolerances, allergies, medications, supplements, health_conditions: healthConditions, updated_at: new Date().toISOString() };
    const { error: err } = await supabase.from('user_health_info').upsert(healthData, { onConflict: 'user_id' }).select();
    if (err) {
      setError('Erro ao salvar dados de saude. Tente novamente.');
    }
    setHealthSaving(false);
  }

  function addChip(list: string[], setList: (v: string[]) => void, value: string, setValue: (v: string) => void) {
    if (value.trim() && !list.includes(value.trim())) { setList([...list, value.trim()]); setValue(''); }
  }

  if (authLoading || loading) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded-lg w-1/3" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const selectClass = "w-full rounded-lg border border-input bg-muted/50 p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all duration-200";

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
            <CardTitle className="text-lg">Meu Perfil</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Nome</label>
                <Input name="displayName" defaultValue={String(profile.display_name || '')} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Data de Nascimento</label>
                <Input name="dateOfBirth" type="date" defaultValue={String(profile.date_of_birth || '')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Genero</label>
                  <select name="gender" defaultValue={String(profile.gender || '')} className={selectClass}>
                    <option value="">Selecionar</option>
                    {GENDERS.map(g => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Tipo Sanguineo</label>
                  <select name="bloodType" defaultValue={String(profile.blood_type || '')} className={selectClass}>
                    <option value="">Selecionar</option>
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Altura (cm)</label>
                  <Input name="heightCm" type="number" defaultValue={String(profile.height_cm || '')} />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Peso (kg)</label>
                  <Input name="initialWeight" type="number" step="0.1" defaultValue={String(profile.initial_weight || '')} />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium mb-1.5 block">Objetivo</label>
                <select name="objective" defaultValue={String(profile.objective || 'improve_health')} className={selectClass}>
                  {Object.entries(OBJECTIVE_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <ProfileField label="Nome" value={String(profile.display_name || '—')} />
              <ProfileField label="Idade" value={profile.date_of_birth ? `${Math.floor((Date.now() - new Date(String(profile.date_of_birth)).getTime()) / 31557600000)} anos` : '—'} />
              <div className="grid grid-cols-2 gap-3">
                <ProfileField label="Genero" value={profile.gender ? GENDER_LABELS[String(profile.gender) as keyof typeof GENDER_LABELS] : '—'} />
                <ProfileField label="Tipo Sanguineo" value={String(profile.blood_type || '—')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ProfileField label="Altura" value={profile.height_cm ? `${profile.height_cm} cm` : '—'} />
                <ProfileField label="Peso" value={profile.initial_weight ? `${profile.initial_weight} kg` : '—'} />
              </div>
              <ProfileField label="Objetivo" value={OBJECTIVE_LABELS[String(profile.objective) as UserObjective] || '—'} />
              <Button onClick={() => setEditing(true)} className="mt-4">Editar perfil</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Heart size={20} className="text-accent-600 dark:text-accent-400" />
            </div>
            <CardTitle className="text-lg">Saude & Medicamentos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Health Conditions */}
          <HealthSection icon={Shield} title="Condicoes de Saude" subtitle="Ex: hipertensao, diabetes, asma">
            {healthConditions.map((cond, idx) => (
              <div key={idx} className="flex gap-1.5 mb-2 items-center">
                <Input placeholder="Condicao" value={cond.name} className="text-xs" onChange={(e) => { const c = [...healthConditions]; c[idx] = { ...c[idx], name: e.target.value }; setHealthConditions(c); }} />
                <select value={cond.severity || ''} className={`${selectClass} w-24 text-xs`} onChange={(e) => { const c = [...healthConditions]; c[idx] = { ...c[idx], severity: (e.target.value || undefined) as HealthCondition['severity'] }; setHealthConditions(c); }}>
                  <option value="">Grau</option>
                  <option value="mild">Leve</option>
                  <option value="moderate">Moderado</option>
                  <option value="severe">Grave</option>
                </select>
                <Input placeholder="Ano" type="number" value={cond.diagnosedYear || ''} className="text-xs w-20" onChange={(e) => { const c = [...healthConditions]; c[idx] = { ...c[idx], diagnosedYear: e.target.value ? Number(e.target.value) : undefined }; setHealthConditions(c); }} />
                <button onClick={() => setHealthConditions(healthConditions.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive transition-colors"><X size={14} /></button>
              </div>
            ))}
            <AddButton onClick={() => setHealthConditions([...healthConditions, { name: '' }])} label="Adicionar condicao" />
          </HealthSection>

          {/* Intolerances */}
          <ChipSection
            label="Intolerancias"
            items={intolerances}
            onRemove={(item) => setIntolerances(intolerances.filter(i => i !== item))}
            chipColor="bg-gold-100 text-gold-600 dark:bg-gold-500/10 dark:text-gold-400"
            inputValue={newIntolerance}
            onInputChange={setNewIntolerance}
            onAdd={() => addChip(intolerances, setIntolerances, newIntolerance, setNewIntolerance)}
            placeholder="Ex: lactose, gluten"
          />

          {/* Allergies */}
          <ChipSection
            label="Alergias"
            items={allergies}
            onRemove={(item) => setAllergies(allergies.filter(i => i !== item))}
            chipColor="bg-destructive/10 text-destructive"
            inputValue={newAllergy}
            onInputChange={setNewAllergy}
            onAdd={() => addChip(allergies, setAllergies, newAllergy, setNewAllergy)}
            placeholder="Ex: amendoim, camarao"
          />

          {/* Medications */}
          <HealthSection icon={Pill} title="Medicamentos de uso diario">
            {medications.map((med, idx) => (
              <div key={idx} className="flex gap-1.5 mb-2 items-center">
                <Input placeholder="Nome" value={med.name} className="text-xs" onChange={(e) => { const m = [...medications]; m[idx] = { ...m[idx], name: e.target.value }; setMedications(m); }} />
                <Input placeholder="Dose" value={med.dosage || ''} className="text-xs w-20" onChange={(e) => { const m = [...medications]; m[idx] = { ...m[idx], dosage: e.target.value }; setMedications(m); }} />
                <Input placeholder="Freq" value={med.frequency || ''} className="text-xs w-20" onChange={(e) => { const m = [...medications]; m[idx] = { ...m[idx], frequency: e.target.value }; setMedications(m); }} />
                <button onClick={() => setMedications(medications.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive transition-colors"><X size={14} /></button>
              </div>
            ))}
            <AddButton onClick={() => setMedications([...medications, { name: '' }])} label="Adicionar medicamento" />
          </HealthSection>

          {/* Supplements */}
          <HealthSection icon={Pill} title="Vitaminas & Suplementos">
            {supplements.map((sup, idx) => (
              <div key={idx} className="flex gap-1.5 mb-2 items-center">
                <Input placeholder="Nome" value={sup.name} className="text-xs" onChange={(e) => { const s = [...supplements]; s[idx] = { ...s[idx], name: e.target.value }; setSupplements(s); }} />
                <Input placeholder="Dose" value={sup.dosage || ''} className="text-xs w-20" onChange={(e) => { const s = [...supplements]; s[idx] = { ...s[idx], dosage: e.target.value }; setSupplements(s); }} />
                <Input placeholder="Freq" value={sup.frequency || ''} className="text-xs w-20" onChange={(e) => { const s = [...supplements]; s[idx] = { ...s[idx], frequency: e.target.value }; setSupplements(s); }} />
                <button onClick={() => setSupplements(supplements.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive transition-colors"><X size={14} /></button>
              </div>
            ))}
            <AddButton onClick={() => setSupplements([...supplements, { name: '' }])} label="Adicionar suplemento" />
          </HealthSection>

          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            Esses dados ajudam a AI a entender melhor sua saude. Sao criptografados e voce pode exportar/excluir a qualquer momento.
          </div>

          <Button onClick={handleSaveHealth} disabled={healthSaving} className="w-full">
            {healthSaving ? 'Salvando...' : 'Salvar dados de saude'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide-custom font-medium">{label}</span>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}

function HealthSection({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-muted-foreground" />
        <label className="text-sm font-medium">{title}</label>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>}
      {children}
    </div>
  );
}

function ChipSection({ label, items, onRemove, chipColor, inputValue, onInputChange, onAdd, placeholder }: {
  label: string; items: string[]; onRemove: (item: string) => void; chipColor: string;
  inputValue: string; onInputChange: (v: string) => void; onAdd: () => void; placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {items.map((item) => (
            <span key={item} className={`px-2.5 py-1 ${chipColor} rounded-lg text-xs font-medium flex items-center gap-1.5`}>
              {item}
              <button onClick={() => onRemove(item)} className="opacity-60 hover:opacity-100 transition-opacity"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input value={inputValue} onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          placeholder={placeholder} className="text-sm" />
        <Button variant="outline" size="sm" onClick={onAdd}><Plus size={14} /></Button>
      </div>
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
      <Plus size={12} /> {label}
    </button>
  );
}
