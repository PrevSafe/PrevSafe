import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from '@/lib/supabase';

/**
 * Autorizacao das rotas administrativas.
 *
 * Regra central: o papel do usuario NAO pode ser lido de user_metadata. Esse
 * campo e gravavel pelo proprio dono da conta (supabase.auth.updateUser), entao
 * qualquer autenticado poderia se declarar ADMIN. A fonte de verdade e a tabela
 * public.prevsafe_members, que so a service role escreve e cuja RLS deixa o
 * usuario apenas LER as proprias linhas.
 *
 * Schema real (supabase/migrations/20260917000000_prevsafe_records_store.sql):
 *   prevsafe_members(auth_user_id uuid, organization_id text, role text,
 *                    created_at timestamptz, primary key (auth_user_id, organization_id))
 */

export interface AdminAutorizado {
  ok: true;
  /** id do chamador em auth.users, extraido do token (nao do corpo da requisicao). */
  authUserId: string;
  /** Organizacoes em que o chamador e ADMIN. Sempre com ao menos um item. */
  organizationIds: string[];
  /** Cliente service role ja instanciado, para a rota reaproveitar. */
  supabaseAdmin: SupabaseClient;
}

export interface AdminNegado {
  ok: false;
  /** Resposta pronta para a rota devolver sem acrescentar nada. */
  resposta: NextResponse;
}

export type ResultadoAutorizacao = AdminAutorizado | AdminNegado;

/**
 * Type guard explicito: com "strict: false" o TypeScript nao estreita a uniao
 * so pelo campo ok, entao a rota usa esta funcao para separar os dois casos.
 */
export function autorizacaoNegada(resultado: ResultadoAutorizacao): resultado is AdminNegado {
  return !resultado.ok;
}

function negar(message: string, status: number): AdminNegado {
  return { ok: false, resposta: NextResponse.json({ success: false, message }, { status }) };
}

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O banco compara auth_user_id como uuid: texto livre derruba a consulta. */
export function ehUuid(valor: string): boolean {
  return REGEX_UUID.test(valor.trim());
}

/**
 * Valida o token Bearer e exige que o chamador seja ADMIN em prevsafe_members.
 * Devolve as organizacoes em que ele e ADMIN — a rota decide o que fazer com elas.
 */
export async function exigirAdminDaOrganizacao(req: NextRequest): Promise<ResultadoAutorizacao> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceRoleKey || !anonKey) {
    return negar('Supabase não está configurado no servidor.', 500);
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return negar('Não autenticado.', 401);
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData?.user) {
    return negar('Sessão inválida ou expirada.', 401);
  }

  const authUserId = userData.user.id;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Consulta com a service role: o vinculo precisa ser lido da tabela mesmo
  // quando a RLS do proprio usuario esconderia a linha.
  const { data: vinculos, error: vinculoError } = await supabaseAdmin
    .from('prevsafe_members')
    .select('organization_id, role')
    .eq('auth_user_id', authUserId);

  if (vinculoError) {
    // Falha fechada: sem conseguir ler o vinculo nao da para afirmar que e admin.
    return negar('Não foi possível verificar suas permissões agora. Tente novamente.', 503);
  }

  const organizationIds = (vinculos || [])
    .filter(v => String(v.role || '').trim().toUpperCase() === 'ADMIN')
    .map(v => String(v.organization_id))
    .filter(id => id.length > 0);

  if (organizationIds.length === 0) {
    return negar(
      'Apenas administradores podem executar esta ação. Sua conta não está registrada como ADMIN em nenhuma organização.',
      403
    );
  }

  return { ok: true, authUserId, organizationIds, supabaseAdmin };
}

/**
 * Reduz as organizacoes do admin a uma unica, para acoes que precisam escolher
 * onde gravar. Com mais de uma o sistema nao tem como adivinhar qual — declara
 * a ambiguidade em vez de escolher a primeira.
 */
export function organizacaoUnica(auth: AdminAutorizado): { organizationId: string } | { erro: NextResponse } {
  if (auth.organizationIds.length > 1) {
    return {
      erro: NextResponse.json(
        {
          success: false,
          message:
            'Sua conta é administradora em mais de uma organização e o sistema não tem como saber em qual esta ação deve ser aplicada. Peça para deixar o vínculo ADMIN em apenas uma organização.',
          organizations: auth.organizationIds,
        },
        { status: 409 }
      ),
    };
  }
  return { organizationId: auth.organizationIds[0] };
}
