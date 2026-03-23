'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const supabase = createClient();

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary-600">FitTracker AI</CardTitle>
        <CardDescription>Acompanhamento físico com AI adaptativa</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={handleGoogleSignIn}
          type="button"
        >
          Entrar com Google
        </Button>
      </CardContent>
    </Card>
  );
}
