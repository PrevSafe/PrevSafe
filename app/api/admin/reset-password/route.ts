import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceRoleKey || !anonKey) {
    return NextResponse.json({ success: false, message: 'Supabase não está configurado no servidor.' }, { status: 500 });
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ success: false, message: 'Não autenticado.' }, { status: 401 });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
  }

  if (userData.user.user_metadata?.role !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Apenas administradores podem redefinir senhas.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Requisição inválida.' }, { status: 400 });
  }

  const { auth_user_id, password } = body;
  if (!auth_user_id || typeof auth_user_id !== 'string') {
    return NextResponse.json({ success: false, message: 'auth_user_id é obrigatório.' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ success: false, message: 'A senha precisa ter ao menos 8 caracteres.' }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { password });

  if (error) {
    return NextResponse.json({ success: false, message: 'Não foi possível redefinir a senha. Tente novamente.' }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
