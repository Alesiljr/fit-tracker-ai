'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OBJECTIVE_LABELS, GENDER_LABELS, BLOOD_TYPES, GENDERS, type UserObjective } from '@fittracker/shared';
import type { Medication } from '@fittracker/shared';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | number | boolean | null>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Health info state
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [supplements, setSupplements] = useState<Medication[]>([]);
  const [newIntolerance, setNewIntolerance] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [healthSaving, setHealthSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadProfile(); loadHealthInfo(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error: err } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    if (err) {
      setError('Erro ao carregar perfil. Verifique sua conexão.');
    } else if (data) {
      setProfile(data);
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
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const form = new FormData(e.target as HTMLFormElement);
    const updates = {
      display_name: form.get('displayName') as string,
      gender: (form.get('gender') as string) || null,
      blood_type: (form.get('bloodType') as string) || null,
      height_cm: Number(form.get('heightCm')) || null,
      initial_weight: Number(form.get('initialWeight')) || null,
      objective: form.get('objective') as string,
      updated_at: new Date().toISOString(),
    };

    const { data, error: err } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (err || !data) {
      setError('Erro ao salvar perfil. Verifique sua conexão e tente novamente.');
      setSaving(false);
      return;
    }

    setProfile(data);
    setEditing(false);
    setSaving(false);
  }

  async function handleSaveHealth() {
    setHealthSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHealthSaving(false); return; }

    const healthData = { user_id: user.id, intolerances, allergies, medications, supplements, updated_at: new Date().toISOString() };
    const { error: err } = await supabase.from('user_health_info').upsert(healthData, { onConflict: 'user_id' }).select();
    if (err) {
      setError('Erro ao salvar dados de saúde. Tente novamente.');
    }
    setHealthSaving(false);
  }

  function addChip(list: string[], setList: (v: string[]) => void, value: string, setValue: (v: string) => void) {
    if (value.trim() && !list.includes(value.trim())) { setList([...list, value.trim()]); setValue(''); }
  }

  if (loading) return <div className="p-4 text-neutral-500">Carregando perfil...</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Profile Card */}
      <Card>
        <CardHeader><CardTitle className="text-xl text-primary-600">Meu Perfil</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm text-neutral-600">Nome</label>
                <Input name="displayName" defaultValue={String(profile.display_name || '')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-600">Gênero</label>
                  <select name="gender" defaultValue={String(profile.gender || '')} className="w-full border rounded-md p-2 text-sm">
                    <option value="">Selecionar</option>
                    {GENDERS.map(g => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-neutral-600">Tipo Sanguíneo</label>
                  <select name="bloodType" defaultValue={String(profile.blood_type || '')} className="w-full border rounded-md p-2 text-sm">
                    <option value="">Selecionar</option>
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-600">Altura (cm)</label>
                  <Input name="heightCm" type="number" defaultValue={String(profile.height_cm || '')} />
                </div>
                <div>
                  <label className="text-sm text-neutral-600">Peso (kg)</label>
                  <Input name="initialWeight" type="number" step="0.1" defaultValue={String(profile.initial_weight || '')} />
                </div>
              </div>
              <div>
                <label className="text-sm text-neutral-600">Objetivo</label>
                <select name="objective" defaultValue={String(profile.objective || 'improve_health')} className="w-full border rounded-md p-2 text-sm">
                  {Object.entries(OBJECTIVE_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div><span className="text-sm text-neutral-500">Nome</span><p className="font-medium">{String(profile.display_name || '—')}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-sm text-neutral-500">Gênero</span><p className="font-medium">{profile.gender ? GENDER_LABELS[String(profile.gender) as keyof typeof GENDER_LABELS] : '—'}</p></div>
                <div><span className="text-sm text-neutral-500">Tipo Sanguíneo</span><p className="font-medium">{String(profile.blood_type || '—')}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-sm text-neutral-500">Altura</span><p className="font-medium">{profile.height_cm ? `${profile.height_cm} cm` : '—'}</p></div>
                <div><span className="text-sm text-neutral-500">Peso</span><p className="font-medium">{profile.initial_weight ? `${profile.initial_weight} kg` : '—'}</p></div>
              </div>
              <div><span className="text-sm text-neutral-500">Objetivo</span><p className="font-medium">{OBJECTIVE_LABELS[String(profile.objective) as UserObjective] || '—'}</p></div>
              <Button onClick={() => setEditing(true)} className="mt-4">Editar perfil</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Info Card */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🏥 Saúde & Medicamentos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Intolerances */}
          <div>
            <label className="text-sm text-neutral-600 mb-2 block">Intolerâncias</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {intolerances.map((item) => (
                <span key={item} className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs flex items-center gap-1">
                  {item} <button onClick={() => setIntolerances(intolerances.filter(i => i !== item))} className="hover:text-orange-900">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newIntolerance} onChange={(e) => setNewIntolerance(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(intolerances, setIntolerances, newIntolerance, setNewIntolerance))}
                placeholder="Ex: lactose, glúten" className="text-sm" />
              <Button variant="outline" size="sm" onClick={() => addChip(intolerances, setIntolerances, newIntolerance, setNewIntolerance)}>+</Button>
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="text-sm text-neutral-600 mb-2 block">Alergias</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {allergies.map((item) => (
                <span key={item} className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs flex items-center gap-1">
                  {item} <button onClick={() => setAllergies(allergies.filter(i => i !== item))} className="hover:text-red-900">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(allergies, setAllergies, newAllergy, setNewAllergy))}
                placeholder="Ex: amendoim, camarão" className="text-sm" />
              <Button variant="outline" size="sm" onClick={() => addChip(allergies, setAllergies, newAllergy, setNewAllergy)}>+</Button>
            </div>
          </div>

          {/* Medications */}
          <div>
            <label className="text-sm text-neutral-600 mb-2 block">Medicamentos de uso diário</label>
            {medications.map((med, idx) => (
              <div key={idx} className="flex gap-1 mb-2 items-center">
                <Input placeholder="Nome" value={med.name} className="text-xs" onChange={(e) => { const m = [...medications]; m[idx] = { ...m[idx], name: e.target.value }; setMedications(m); }} />
                <Input placeholder="Dose" value={med.dosage || ''} className="text-xs w-20" onChange={(e) => { const m = [...medications]; m[idx] = { ...m[idx], dosage: e.target.value }; setMedications(m); }} />
                <Input placeholder="Freq" value={med.frequency || ''} className="text-xs w-20" onChange={(e) => { const m = [...medications]; m[idx] = { ...m[idx], frequency: e.target.value }; setMedications(m); }} />
                <button onClick={() => setMedications(medications.filter((_, i) => i !== idx))} className="text-neutral-300 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
            <button onClick={() => setMedications([...medications, { name: '' }])} className="text-xs text-primary-500 hover:underline">+ Adicionar medicamento</button>
          </div>

          {/* Supplements */}
          <div>
            <label className="text-sm text-neutral-600 mb-2 block">Vitaminas & Suplementos</label>
            {supplements.map((sup, idx) => (
              <div key={idx} className="flex gap-1 mb-2 items-center">
                <Input placeholder="Nome" value={sup.name} className="text-xs" onChange={(e) => { const s = [...supplements]; s[idx] = { ...s[idx], name: e.target.value }; setSupplements(s); }} />
                <Input placeholder="Dose" value={sup.dosage || ''} className="text-xs w-20" onChange={(e) => { const s = [...supplements]; s[idx] = { ...s[idx], dosage: e.target.value }; setSupplements(s); }} />
                <Input placeholder="Freq" value={sup.frequency || ''} className="text-xs w-20" onChange={(e) => { const s = [...supplements]; s[idx] = { ...s[idx], frequency: e.target.value }; setSupplements(s); }} />
                <button onClick={() => setSupplements(supplements.filter((_, i) => i !== idx))} className="text-neutral-300 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
            <button onClick={() => setSupplements([...supplements, { name: '' }])} className="text-xs text-primary-500 hover:underline">+ Adicionar suplemento</button>
          </div>

          <p className="text-xs text-neutral-400 p-2 bg-neutral-50 rounded-md">
            ℹ️ Esses dados ajudam a AI a entender melhor sua saúde. São criptografados e você pode exportar/excluir a qualquer momento.
          </p>

          <Button onClick={handleSaveHealth} disabled={healthSaving} className="w-full">
            {healthSaving ? 'Salvando...' : '💾 Salvar dados de saúde'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
