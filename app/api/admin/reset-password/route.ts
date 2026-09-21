import { NextRequest, NextResponse } from 'next/server';
import { exigirAdminDaOrganizacao, autorizacaoNegada, ehUuid } from '@/lib/autorizacaoApi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // A autorizacao vem de prevsafe_members, nunca de user_metadata: aquele campo
  // e gravavel pelo proprio usuario e permitiria que qualquer autenticado se
  // declarasse ADMIN e redefinisse a senha de qualquer conta.
  const auth = await exigirAdminDaOrganizacao(req);
  if (autorizacaoNegada(auth)) return auth.resposta;
  const { supabaseAdmin, organizationIds } = auth;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Requisição inválida.' }, { status: 400 });
  }

  const { auth_user_id, password } = body;
  if (!auth_user_id || typeof auth_user_id !== 'string') {
    return NextResponse.json({ success: false, message: 'auth_user_id é obrigatório.' }, { status: 400 });
  }
  if (!ehUuid(auth_user_id)) {
    return NextResponse.json({ success: false, message: 'auth_user_id inválido.' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ success: false, message: 'A senha precisa ter ao menos 8 caracteres.' }, { status: 400 });
  }

  // O alvo precisa estar na mesma organizacao do admin. Sem esta checagem um
  // admin de uma organizacao redefinia a senha de usuario de outra — inclusive
  // a do dono do sistema.
  const { data: vinculosAlvo, error: alvoError } = await supabaseAdmin
    .from('prevsafe_members')
    .select('organization_id')
    .eq('auth_user_id', auth_user_id.trim());

  if (alvoError) {
    // Falha fechada: sem ler o vinculo do alvo nao da para afirmar que ele e da
    // mesma organizacao, entao a senha nao e tocada.
    return NextResponse.json(
      { success: false, message: 'Não foi possível confirmar a organização deste usuário agora. Tente novamente.' },
      { status: 503 }
    );
  }

  const mesmaOrganizacao = (vinculosAlvo || []).some(v => organizationIds.includes(String(v.organization_id)));

  if (!mesmaOrganizacao) {
    // Mesma resposta para "nao existe", "sem vinculo" e "de outra organizacao":
    // responder diferente revelaria quais contas existem fora da organizacao.
    return NextResponse.json(
      { success: false, message: 'Este usuário não pertence à sua organização.' },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id.trim(), { password });

  if (error) {
    return NextResponse.json({ success: false, message: 'Não foi possível redefinir a senha. Tente novamente.' }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
