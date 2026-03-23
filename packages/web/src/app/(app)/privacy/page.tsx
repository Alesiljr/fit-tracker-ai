'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PrivacyPage() {
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function handleExport() {
    setExporting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/privacy/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittracker-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const token = await getToken();
    await fetch(`${API_URL}/api/privacy/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-neutral-800">Privacidade</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exportar meus dados</CardTitle>
          <CardDescription>
            Baixe todos os seus dados em formato JSON (LGPD — direito de portabilidade)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting} className="w-full">
            {exporting ? 'Preparando download...' : 'Exportar dados (JSON)'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Excluir minha conta</CardTitle>
          <CardDescription>
            Remove permanentemente todos os seus dados. Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setShowDeleteDialog(true)}
          >
            Excluir conta e dados
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tem certeza?</DialogTitle>
            <DialogDescription>
              Todos os seus registros de saúde, conversas com a AI, metas e preferências
              serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
