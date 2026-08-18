import { supabaseServidor } from '@/lib/cipa/supabase';
import { mensagemDoErro } from '@/lib/cipa/erros';
import { montarAtaEleicao, montarAtaPosse } from '@/lib/cipa/ata';
import type { EleitorComToken, PayloadApuracao } from '@/lib/cipa/types';

export type Resultado = { ok: boolean; mensagem: string };

/** Cria a eleição. A policy de INSERT exige módulo CIPA contratado. */
export async function criarEleicao(dados: FormData): Promise<Resultado & { id?: string }> {
  const supabase = await supabaseServidor();
  const unidadeId = dados.get('unidade_id')?.toString();
  if (!unidadeId) return { ok: false, mensagem: 'Selecione a unidade.' };

  const { data: unidade } = await supabase
    .from('unidades').select('empresa_id').eq('id', unidadeId).single();

  if (!unidade) return { ok: false, mensagem: 'Unidade não encontrada.' };

  const { data, error } = await supabase
    .from('eleicoes')
    .insert({
      empresa_id: unidade.empresa_id,
      unidade_id: unidadeId,
      titulo: dados.get('titulo')?.toString(),
      norma: dados.get('norma')?.toString() || 'NR-05',
      gestao: dados.get('gestao')?.toString() || null,
      data_inicio: dados.get('data_inicio')?.toString(),
      data_fim: dados.get('data_fim')?.toString(),
      vagas_efetivos: Number(dados.get('vagas_efetivos') || 1),
      vagas_suplentes: Number(dados.get('vagas_suplentes') || 1),
      permite_qr_code: dados.get('permite_qr_code') === 'on',
    })
    .select('id')
    .single();

  if (error) {
    const mensagem = error.message.includes('row-level security')
      ? 'O módulo CIPA não está contratado para esta empresa.'
      : mensagemDoErro(error);
    return { ok: false, mensagem };
  }

  return { ok: true, mensagem: 'Eleição criada.', id: data.id as string };
}

export async function montarEleitores(eleicaoId: string, apenasUnidade: boolean): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc('cipa_montar_eleitores', {
    p_eleicao_id: eleicaoId,
    p_apenas_unidade: apenasUnidade,
  });
  if (error) return { ok: false, mensagem: mensagemDoErro(error) };
  const r = data as { incluidos: number; total_aptos: number };
  return { ok: true, mensagem: `${r.incluidos} incluído(s). Total de aptos: ${r.total_aptos}.` };
}

export async function abrirEleicao(eleicaoId: string): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc('cipa_abrir_eleicao', { p_eleicao_id: eleicaoId });
  return error
    ? { ok: false, mensagem: mensagemDoErro(error) }
    : { ok: true, mensagem: 'Votação aberta. Os links e o QR Code já funcionam.' };
}

export async function aprovarEnvelope(envelopeId: string): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc('cipa_aprovar_voto', { p_quarentena_id: envelopeId });
  return error
    ? { ok: false, mensagem: mensagemDoErro(error) }
    : { ok: true, mensagem: 'Voto computado e desvinculado do eleitor.' };
}

export async function rejeitarEnvelope(envelopeId: string, motivo: string): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc('cipa_rejeitar_voto', {
    p_quarentena_id: envelopeId, p_motivo: motivo,
  });
  return error
    ? { ok: false, mensagem: mensagemDoErro(error) }
    : { ok: true, mensagem: 'Voto rejeitado e registrado na auditoria.' };
}

export async function aprovarLote(ids: string[]): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc('cipa_aprovar_lote', { p_ids: ids });
  if (error) return { ok: false, mensagem: mensagemDoErro(error) };
  const r = data as { aprovados: number; erros: unknown[] };
  return {
    ok: true,
    mensagem: `${r.aprovados} voto(s) computado(s)` +
      (r.erros?.length ? `, ${r.erros.length} com erro.` : '.'),
  };
}

export type LinhaEleitor = {
  nome: string; cpf: string; cargo?: string; setor?: string;
  matricula?: string; email?: string; telefone?: string;
};

export async function importarEleitores(
  eleicaoId: string, linhas: LinhaEleitor[],
): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc('cipa_importar_eleitores', {
    p_eleicao_id: eleicaoId, p_eleitores: linhas,
  });
  if (error) return { ok: false, mensagem: mensagemDoErro(error) };
  const r = data as { processados: number; ignorados: unknown[]; total_aptos: number };
  return {
    ok: true,
    mensagem: `${r.processados} eleitor(es). Total de aptos: ${r.total_aptos}.` +
      (r.ignorados?.length ? ` ${r.ignorados.length} linha(s) ignorada(s).` : ''),
  };
}

export async function gerarTokens(eleicaoId: string): Promise<Resultado & { links?: string[] }> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc('cipa_gerar_tokens', {
    p_eleicao_id: eleicaoId, p_validade_horas: 168, p_apenas_sem_token: true,
  });
  if (error) return { ok: false, mensagem: mensagemDoErro(error) };

  const base = import.meta.env.VITE_APP_URL ?? '';
  const eleitores = (data ?? []) as EleitorComToken[];
  const links = eleitores.map(
    (e) => `${e.nome};${e.email ?? e.telefone ?? ''};${base}/v/${e.token}`,
  );
  return { ok: true, links, mensagem: `${links.length} link(s) gerado(s).` };
}

export async function criarCandidato(eleicaoId: string, dados: FormData): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const funcionarioId = dados.get('funcionario_id')?.toString();

  let extras: Record<string, unknown> = {};
  if (funcionarioId) {
    const { data: f } = await supabase
      .from('funcionarios').select('nome, cpf, data_admissao').eq('id', funcionarioId).single();
    if (f) extras = { nome_completo: f.nome, cpf: f.cpf, data_admissao: f.data_admissao };
  }

  const numero = dados.get('numero_urna')?.toString();
  const { error } = await supabase.from('candidatos').insert({
    eleicao_id: eleicaoId,
    funcionario_id: funcionarioId || null,
    nome_completo: dados.get('nome_completo')?.toString() || extras.nome_completo,
    nome_urna: dados.get('nome_urna')?.toString(),
    cargo: dados.get('cargo')?.toString() || null,
    setor: dados.get('setor')?.toString() || null,
    numero_urna: numero ? Number(numero) : null,
    ...extras,
  });

  return error
    ? { ok: false, mensagem: 'Não foi possível cadastrar. Confira se o número da urna já existe.' }
    : { ok: true, mensagem: 'Candidato cadastrado.' };
}

/**
 * Encerra, consolida a apuração e preenche o modelo de ata. Determinístico.
 * Portado de /api/cipa/ata: não depende de IP nem de nada que exija servidor,
 * então roda direto no client com o mesmo client de sessão (RLS protege).
 */
export async function encerrarEleicao(
  eleicaoId: string, documento: 'ELEICAO' | 'POSSE' = 'ELEICAO',
): Promise<Resultado & { markdown?: string; payload?: PayloadApuracao }> {
  const supabase = await supabaseServidor();
  const { data: payload, error } = await supabase.rpc('cipa_encerrar_eleicao', {
    p_eleicao_id: eleicaoId,
  });

  if (error) return { ok: false, mensagem: mensagemDoErro(error) };

  const dados = payload as PayloadApuracao;
  const markdown = documento === 'POSSE' ? montarAtaPosse(dados) : montarAtaEleicao(dados);

  await supabase
    .from('eleicoes')
    .update(documento === 'POSSE' ? { ata_posse_md: markdown } : { ata_eleicao_md: markdown })
    .eq('id', eleicaoId);

  return { ok: true, mensagem: 'Ata gerada.', markdown, payload: dados };
}
