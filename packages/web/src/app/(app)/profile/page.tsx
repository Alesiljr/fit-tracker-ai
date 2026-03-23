'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OBJECTIVE_LABELS, type UserObjective } from '@fittracker/shared';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | number | boolean | null>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const form = new FormData(e.target as HTMLFormElement);
    const updates = {
      display_name: form.get('displayName') as string,
      height_cm: Number(form.get('heightCm')) || null,
      initial_weight: Number(form.get('initialWeight')) || null,
      objective: form.get('objective') as string,
      updated_at: new Date().toISOString(),
    };

    const { error: err } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);

    if (err) {
      setError('Erro ao salvar perfil');
    } else {
      setProfile({ ...profile, ...updates });
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) return <div className="p-4 text-neutral-500">Carregando perfil...</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-primary-600">Meu Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm text-neutral-600">Nome</label>
                <Input name="displayName" defaultValue={String(profile.display_name || '')} />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Altura (cm)</label>
                <Input name="heightCm" type="number" defaultValue={String(profile.height_cm || '')} />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Peso inicial (kg)</label>
                <Input name="initialWeight" type="number" step="0.1" defaultValue={String(profile.initial_weight || '')} />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Objetivo</label>
                <select name="objective" defaultValue={String(profile.objective || 'improve_health')} className="w-full border rounded-md p-2 text-sm">
                  {Object.entries(OBJECTIVE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
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
              <div>
                <span className="text-sm text-neutral-500">Nome</span>
                <p className="font-medium">{String(profile.display_name || '—')}</p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Altura</span>
                <p className="font-medium">{profile.height_cm ? `${profile.height_cm} cm` : '—'}</p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Peso inicial</span>
                <p className="font-medium">{profile.initial_weight ? `${profile.initial_weight} kg` : '—'}</p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Objetivo</span>
                <p className="font-medium">{OBJECTIVE_LABELS[String(profile.objective) as UserObjective] || '—'}</p>
              </div>
              <Button onClick={() => setEditing(true)} className="mt-4">Editar perfil</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
