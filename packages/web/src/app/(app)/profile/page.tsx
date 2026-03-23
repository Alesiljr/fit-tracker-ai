'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateProfileSchema, OBJECTIVE_LABELS, type UserObjective } from '@fittracker/shared';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | null>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      setProfile(await res.json());
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const body = {
      displayName: formData.get('displayName') as string,
      heightCm: Number(formData.get('heightCm')),
      initialWeight: Number(formData.get('initialWeight')),
      objective: formData.get('objective') as string,
    };

    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      setError(result.error.errors[0].message);
      setSaving(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(result.data),
    });

    if (res.ok) {
      setProfile(await res.json());
      setEditing(false);
    } else {
      setError('Erro ao salvar perfil');
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="p-4 text-neutral-500">Carregando perfil...</div>;
  }

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
                <Input name="displayName" defaultValue={profile.displayName || ''} />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Altura (cm)</label>
                <Input name="heightCm" type="number" defaultValue={profile.heightCm || ''} />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Peso inicial (kg)</label>
                <Input name="initialWeight" type="number" step="0.1" defaultValue={profile.initialWeight || ''} />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Objetivo</label>
                <select name="objective" defaultValue={profile.objective || 'improve_health'} className="w-full border rounded-md p-2 text-sm">
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
                <p className="font-medium">{profile.displayName || '—'}</p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Altura</span>
                <p className="font-medium">{profile.heightCm ? `${profile.heightCm} cm` : '—'}</p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Peso inicial</span>
                <p className="font-medium">{profile.initialWeight ? `${profile.initialWeight} kg` : '—'}</p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Objetivo</span>
                <p className="font-medium">{OBJECTIVE_LABELS[profile.objective as UserObjective] || '—'}</p>
              </div>
              <Button onClick={() => setEditing(true)} className="mt-4">Editar perfil</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
