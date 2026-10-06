import { NextRequest, NextResponse } from 'next/server';
import {
  exigirAdminDaOrganizacao,
  autorizacaoNegada,
  organizacaoUnica,
  ehUuid,
  conferirPapelECliente,
  conferenciaRecusada
} from '@/lib/autorizacaoApi';

export const dynamic = 'force-dynamic';

/**
 * Troca o papel (e, para conta de cliente, a empresa) de um usuario que ja
 * existe.
 *
 * Antes, editar o perfil na tela de usuarios mudava so o registro na colecao
 * profiles: o papel que a RLS confere, em prevsafe_members, continuava o
 * antigo. Promover alguem ao papel SAUDE nao lhe dava os resultados de exame,
 * e rebaixar nao tirava nada. prevsafe_members so aceita escrita da service
 * role, entao a troca passa por aqui, com a mesma autorizacao das outras rotas
 * administrativas.
 */
export async function POST(req: NextRequest) {
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

  const alvo = String(body.auth_user_id || '').trim();
  if (!alvo || !ehUuid(alvo)) {
    return NextResponse.json({ success: false, message: 'auth_user_id inválido.' }, { status: 400 });
  }

  const vinculo = await conferirPapelECliente(supabaseAdmin, organizationId, body.role, body.client_id);
  if (conferenciaRecusada(vinculo)) return vinculo.resposta;

  const { data: membros, error: membrosError } = await supabaseAdmin
    .from('prevsafe_members')
    .select('auth_user_id, role')
    .eq('organization_id', organizationId);

  if (membrosError) {
    // Falha fechada: sem ler os vinculos nao da para conferir o alvo nem o
    // ultimo administrador.
    return NextResponse.json(
      { success: false, message: 'Não foi possível conferir os usuários da organização agora. Tente novamente.' },
      { status: 503 }
    );
  }

  const atual = (membros || []).find(m => String(m.auth_user_id) === alvo);
  if (!atual) {
    // Mesma resposta para "nao existe" e "de outra organizacao".
    return NextResponse.json({ success: false, message: 'Este usuário não pertence à sua organização.' }, { status: 403 });
  }

  // A organizacao nao pode ficar sem administrador: ninguem mais conseguiria
  // criar usuario nem trocar papel.
  const eraAdmin = String(atual.role || '').trim().toUpperCase() === 'ADMIN';
  if (eraAdmin && vinculo.role !== 'ADMIN') {
    const admins = (membros || []).filter(m => String(m.role || '').trim().toUpperCase() === 'ADMIN').length;
    if (admins <= 1) {
      return NextResponse.json(
        { success: false, message: 'Este é o único administrador da organização. Promova outro usuário antes de trocar o perfil dele.' },
        { status: 409 }
      );
    }
  }

  const { error } = await supabaseAdmin
    .from('prevsafe_members')
    .update({ role: vinculo.role, client_id: vinculo.clientId })
    .eq('auth_user_id', alvo)
    .eq('organization_id', organizationId);

  if (error) {
    return NextResponse.json(
      { success: false, message: 'Não foi possível gravar o novo perfil de acesso. Tente novamente.' },
      { status: 422 }
    );
  }

  return NextResponse.json({ success: true, role: vinculo.role, client_id: vinculo.clientId });
}
