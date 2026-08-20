import { supabase } from '@/lib/supabase';

export type Recurso = { codigo: string; nome: string; modulo: 'nucleo' | 'cipa'; ordem: number };
export type Acao = { codigo: string; nome: string };
export type RecursoAcao = { recurso_codigo: string; acao_codigo: string };

export type PerfilAcesso = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
};

export type VinculoUsuario = {
  id: string;
  usuario_id: string;
  papel: string;
  ativo: boolean;
  perfil_id: string | null;
  nome: string;
  email: string | null;
};

export type UnidadeResumo = { id: string; razao_social: string; nome_fantasia: string | null };

/** Catálogo global (recursos, ações e quais ações valem para cada recurso). Igual para toda empresa. */
export async function carregarCatalogo() {
  const [{ data: recursos, error: e1 }, { data: acoes, error: e2 }, { data: recursoAcoes, error: e3 }] =
    await Promise.all([
      supabase.from('recursos').select('codigo, nome, modulo, ordem').order('ordem'),
      supabase.from('acoes').select('codigo, nome'),
      supabase.from('recurso_acoes').select('recurso_codigo, acao_codigo'),
    ]);

  return {
    recursos: (recursos ?? []) as Recurso[],
    acoes: (acoes ?? []) as Acao[],
    recursoAcoes: (recursoAcoes ?? []) as RecursoAcao[],
    error: e1 ?? e2 ?? e3 ?? null,
  };
}

export function listarPerfis(empresaId: string) {
  return supabase
    .from('perfis_acesso')
    .select('id, empresa_id, nome, descricao')
    .eq('empresa_id', empresaId)
    .order('nome');
}

export function criarPerfil(empresaId: string, nome: string, descricao: string) {
  return supabase
    .from('perfis_acesso')
    .insert({ empresa_id: empresaId, nome: nome.trim(), descricao: descricao.trim() || null })
    .select('id, empresa_id, nome, descricao')
    .single();
}

export function excluirPerfil(perfilId: string) {
  return supabase.from('perfis_acesso').delete().eq('id', perfilId);
}

/** Quantos vínculos (usuarios_empresas) estão hoje com cada perfil — para travar a exclusão. */
export async function contarUsuariosPorPerfil(empresaId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('usuarios_empresas')
    .select('perfil_id')
    .eq('empresa_id', empresaId)
    .not('perfil_id', 'is', null);

  const contagem: Record<string, number> = {};
  for (const linha of (data ?? []) as { perfil_id: string }[]) {
    contagem[linha.perfil_id] = (contagem[linha.perfil_id] ?? 0) + 1;
  }
  return contagem;
}

export function listarPermissoes(perfilId: string) {
  return supabase.from('perfil_permissoes').select('recurso_codigo, acao_codigo').eq('perfil_id', perfilId);
}

export function concederPermissao(perfilId: string, recursoCodigo: string, acaoCodigo: string) {
  return supabase
    .from('perfil_permissoes')
    .insert({ perfil_id: perfilId, recurso_codigo: recursoCodigo, acao_codigo: acaoCodigo });
}

export function revogarPermissao(perfilId: string, recursoCodigo: string, acaoCodigo: string) {
  return supabase
    .from('perfil_permissoes')
    .delete()
    .eq('perfil_id', perfilId)
    .eq('recurso_codigo', recursoCodigo)
    .eq('acao_codigo', acaoCodigo);
}

/**
 * Vínculos (usuarios_empresas) da empresa, com nome/e-mail do profile.
 * Sem FK direta entre usuarios_empresas e profiles (ambos apontam para
 * auth.users), então o embed do PostgREST não funciona — busca em duas
 * consultas e junta no cliente.
 */
export async function listarVinculos(
  empresaId: string
): Promise<{ data: VinculoUsuario[]; error: { message: string } | null }> {
  const { data: vinculos, error } = await supabase
    .from('usuarios_empresas')
    .select('id, usuario_id, papel, ativo, perfil_id')
    .eq('empresa_id', empresaId)
    .order('criado_em');

  if (error || !vinculos) return { data: [], error };

  const ids = vinculos.map((v) => v.usuario_id);
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, nome, email').in('id', ids)
    : { data: [] as { id: string; nome: string; email: string | null }[] };

  const porId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const data: VinculoUsuario[] = vinculos.map((v) => ({
    id: v.id,
    usuario_id: v.usuario_id,
    papel: v.papel,
    ativo: v.ativo,
    perfil_id: v.perfil_id,
    nome: porId.get(v.usuario_id)?.nome ?? '(usuário removido)',
    email: porId.get(v.usuario_id)?.email ?? null,
  }));

  return { data, error: null };
}

export function atualizarPerfilDoVinculo(vinculoId: string, perfilId: string | null) {
  return supabase.from('usuarios_empresas').update({ perfil_id: perfilId }).eq('id', vinculoId);
}

export function listarUnidadesDaEmpresa(empresaId: string) {
  return supabase
    .from('unidades')
    .select('id, razao_social, nome_fantasia')
    .eq('empresa_id', empresaId)
    .order('razao_social');
}

/** Quantas unidades cada usuário tem liberadas — para a lista da aba Usuários. */
export async function contarUnidadesPorUsuario(empresaId: string): Promise<Record<string, number>> {
  const { data } = await supabase.from('usuario_unidades').select('usuario_id').eq('empresa_id', empresaId);
  const contagem: Record<string, number> = {};
  for (const linha of (data ?? []) as { usuario_id: string }[]) {
    contagem[linha.usuario_id] = (contagem[linha.usuario_id] ?? 0) + 1;
  }
  return contagem;
}

export function listarUnidadesLiberadas(usuarioId: string, empresaId: string) {
  return supabase.from('usuario_unidades').select('unidade_id').eq('usuario_id', usuarioId).eq('empresa_id', empresaId);
}

export function liberarUnidade(usuarioId: string, empresaId: string, unidadeId: string) {
  return supabase.from('usuario_unidades').insert({ usuario_id: usuarioId, empresa_id: empresaId, unidade_id: unidadeId });
}

export function revogarUnidade(usuarioId: string, unidadeId: string) {
  return supabase.from('usuario_unidades').delete().eq('usuario_id', usuarioId).eq('unidade_id', unidadeId);
}

type RespostaAdmin = { ok: boolean; mensagem?: string; usuario_id?: string };

async function chamarAdminUsuarios(corpo: Record<string, unknown>): Promise<{ data: RespostaAdmin | null; error: { message: string } | null }> {
  const { data: sessao } = await supabase.auth.getSession();
  const token = sessao.session?.access_token;
  if (!token) return { data: null, error: { message: 'Sessão expirada. Faça login novamente.' } };

  let resposta: Response;
  try {
    resposta = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
  } catch {
    return { data: null, error: { message: 'Sem conexão com o servidor. Verifique sua internet.' } };
  }

  const json = (await resposta.json().catch(() => null)) as RespostaAdmin | null;
  if (!resposta.ok || !json?.ok) {
    return { data: null, error: { message: json?.mensagem ?? 'Não foi possível concluir. Tente novamente.' } };
  }
  return { data: json, error: null };
}

export function criarUsuario(
  empresaId: string,
  dados: { nome: string; email: string; senha: string; papel: string }
) {
  return chamarAdminUsuarios({ acao: 'criar', empresa_id: empresaId, ...dados });
}

export function resetarSenha(empresaId: string, usuarioId: string, senhaNova: string) {
  return chamarAdminUsuarios({ acao: 'resetar_senha', empresa_id: empresaId, usuario_id: usuarioId, senha_nova: senhaNova });
}

export function atualizarNomeDoUsuario(usuarioId: string, nome: string) {
  return supabase.from('profiles').update({ nome: nome.trim() }).eq('id', usuarioId);
}
