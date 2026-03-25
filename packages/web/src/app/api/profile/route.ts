import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.displayName !== undefined) updates.display_name = body.displayName;
  if (body.dateOfBirth !== undefined) updates.date_of_birth = body.dateOfBirth || null;
  if (body.gender !== undefined) updates.gender = body.gender || null;
  if (body.bloodType !== undefined) updates.blood_type = body.bloodType || null;
  if (body.heightCm !== undefined) updates.height_cm = body.heightCm || null;
  if (body.initialWeight !== undefined) updates.initial_weight = body.initialWeight || null;
  if (body.objective !== undefined) updates.objective = body.objective;

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Erro ao salvar perfil' }, { status: 500 });
  }

  return NextResponse.json(data);
}
