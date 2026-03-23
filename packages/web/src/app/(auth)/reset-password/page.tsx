'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { resetPasswordSchema } from '@fittracker/shared';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      password,
    });

    if (authError) {
      setError('Erro ao atualizar senha. O link pode ter expirado.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/dashboard'), 2000);
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-600">Senha atualizada!</CardTitle>
          <CardDescription>
            Sua senha foi alterada com sucesso. Redirecionando...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary-600">Nova senha</CardTitle>
        <CardDescription>Digite sua nova senha</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Nova senha (mínimo 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
