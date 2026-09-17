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
    return NextResponse.json({ success: false, message: 'Apenas administradores podem criar usuários.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Requisição inválida.' }, { status: 400 });
  }

  const { email, password, full_name, role, phone, whatsapp, department, job_title, professional_register, client_id } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ success: false, message: 'E-mail é obrigatório.' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ success: false, message: 'A senha precisa ter ao menos 8 caracteres.' }, { status: 400 });
  }
  if (!full_name || typeof full_name !== 'string') {
    return NextResponse.json({ success: false, message: 'Nome completo é obrigatório.' }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name, role, phone, whatsapp, department, job_title, professional_register, client_id },
  });

  if (error || !data.user) {
    const message = /already.*registered|already.*exists/i.test(error?.message || '')
      ? 'Já existe uma conta com este e-mail.'
      : 'Não foi possível criar o usuário. Tente novamente.';
    return NextResponse.json({ success: false, message }, { status: 422 });
  }

  return NextResponse.json({ success: true, auth_user_id: data.user.id });
}
