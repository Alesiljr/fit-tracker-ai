'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { forgotPasswordSchema } from '@fittracker/shared';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (authError) {
      setError('Erro ao enviar email. Tente novamente.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-600">Email enviado</CardTitle>
          <CardDescription>
            Se uma conta existir com <strong>{email}</strong>, você receberá um
            link para redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Voltar ao login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary-600">Esqueci minha senha</CardTitle>
        <CardDescription>
          Digite seu email e enviaremos um link de recuperação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link href="/login" className="text-primary-500 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
