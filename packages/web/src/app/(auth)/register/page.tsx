'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Preencha seu nome'); return; }
    if (!email.trim()) { setError('Preencha seu email'); return; }
    if (password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres'); return; }
    if (password !== confirmPassword) { setError('Senhas não coincidem'); return; }

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Este email já está cadastrado');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Auto-login and redirect after signup
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 2000);
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary-600">Conta criada com sucesso</CardTitle>
          <CardDescription>
            Bem-vindo ao FitTracker AI, {name}! Redirecionando...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary-600">FitTracker AI</CardTitle>
        <CardDescription>Crie sua conta gratuita</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Senha (mínimo 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirmar senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Já tem conta?{' '}
          <a href="/login" className="text-primary-500 hover:underline">
            Fazer login
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
