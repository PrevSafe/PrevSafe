import { NextRequest, NextResponse } from 'next/server';
import {
  exigirAdminDaOrganizacao,
  autorizacaoNegada,
  organizacaoUnica,
  conferirPapelECliente,
  conferenciaRecusada
} from '@/lib/autorizacaoApi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // A autorizacao vem de prevsafe_members, nunca de user_metadata: aquele campo
  // e gravavel pelo proprio usuario e permitiria que qualquer autenticado se
  // declarasse ADMIN.
  const auth = await exigirAdminDaOrganizacao(req);
  if (autorizacaoNegada(auth)) return auth.resposta;

  const org = organizacaoUnica(auth);
  if ('erro' in org) return org.erro;
  const { organizationId } = org;
  const { supabaseAdmin } = auth;

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

  // Papel e cliente conferidos ANTES de criar o login: uma conta de cliente
  // sem empresa vinculada nao enxergaria nada, e criada assim ficaria um login
  // que ninguem consegue usar.
  const vinculo = await conferirPapelECliente(supabaseAdmin, organizationId, role || 'TÉCNICO', client_id);
  if (conferenciaRecusada(vinculo)) return vinculo.resposta;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    // user_metadata e so informativo: o proprio usuario o altera. O que vale
    // para a RLS e o vinculo gravado abaixo.
    user_metadata: { full_name, role: vinculo.role, phone, whatsapp, department, job_title, professional_register, client_id: vinculo.clientId },
  });

  if (error || !data.user) {
    const message = /already.*registered|already.*exists/i.test(error?.message || '')
      ? 'Já existe uma conta com este e-mail.'
      : 'Não foi possível criar o usuário. Tente novamente.';
    return NextResponse.json({ success: false, message }, { status: 422 });
  }

  // Sem o vinculo em prevsafe_members o usuario loga mas a RLS bloqueia todos
  // os dados da organizacao — ele veria o sistema vazio. O vinculo herda a
  // organizacao de quem esta criando, ja confirmada na autorizacao acima. O
  // client_id liga a conta de cliente a empresa dela: e o que a RLS usa para
  // isola-la dos demais clientes.
  const { error: memberError } = await supabaseAdmin
    .from('prevsafe_members')
    .upsert(
      { auth_user_id: data.user.id, organization_id: organizationId, role: vinculo.role, client_id: vinculo.clientId },
      { onConflict: 'auth_user_id,organization_id' }
    );

  if (memberError) {
    return NextResponse.json({
      success: true,
      auth_user_id: data.user.id,
      warning: 'Usuário criado, mas o vínculo com a organização falhou. Ele conseguirá entrar, porém verá o sistema sem dados até o vínculo ser refeito.'
    });
  }

  return NextResponse.json({ success: true, auth_user_id: data.user.id });
}
