import { supabaseServidor } from '@/lib/cipa/supabase';
import { mensagemDoErro } from '@/lib/cipa/erros';
import { montarAtaEleicao, montarAtaPosse } from '@/lib/cipa/ata';
import { somenteDigitos } from '@/lib/cipa/cpf';
import type {
  EleitorComToken, Indicado, MembroComissao, PayloadApuracao,
} from '@/lib/cipa/types';

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

export async function criarMembroComissao(
  eleicaoId: string, dados: FormData,
): Promise<Resultado & { membro?: MembroComissao }> {
  const supabase = await supabaseServidor();
  const cpf = dados.get('cpf')?.toString();

  const { data, error } = await supabase
    .from('cipa_comissao')
    .insert({
      eleicao_id: eleicaoId,
      nome: dados.get('nome')?.toString(),
      cpf: cpf ? somenteDigitos(cpf) : null,
      cargo: dados.get('cargo')?.toString() || null,
      papel: dados.get('papel')?.toString(),
    })
    .select('id, nome, cpf, cargo, papel')
    .single();

  if (error) {
    const mensagem = error.message.includes('cipa_comissao_presidente_uk')
      ? 'Já existe um presidente cadastrado nesta comissão.'
      : error.message.includes('cipa_comissao_vice_uk')
        ? 'Já existe um vice-presidente cadastrado nesta comissão.'
        : mensagemDoErro(error);
    return { ok: false, mensagem };
  }

  return { ok: true, mensagem: 'Membro adicionado.', membro: data as MembroComissao };
}

export async function removerMembroComissao(id: string): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('cipa_comissao').delete().eq('id', id);
  return error
    ? { ok: false, mensagem: mensagemDoErro(error) }
    : { ok: true, mensagem: 'Membro removido.' };
}

export async function criarIndicado(
  eleicaoId: string, dados: FormData,
): Promise<Resultado & { indicado?: Indicado }> {
  const supabase = await supabaseServidor();
  const condicao = dados.get('condicao')?.toString() || 'titular';

  const { count } = await supabase
    .from('cipa_indicados')
    .select('id', { count: 'exact', head: true })
    .eq('eleicao_id', eleicaoId)
    .eq('condicao', condicao);

  const { data, error } = await supabase
    .from('cipa_indicados')
    .insert({
      eleicao_id: eleicaoId,
      nome: dados.get('nome')?.toString(),
      cargo: dados.get('cargo')?.toString() || null,
      setor: dados.get('setor')?.toString() || null,
      condicao,
      ordem: (count ?? 0) + 1,
    })
    .select('id, nome, cargo, setor, condicao, ordem')
    .single();

  if (error) return { ok: false, mensagem: mensagemDoErro(error) };
  return { ok: true, mensagem: 'Representante indicado.', indicado: data as Indicado };
}

export async function removerIndicado(id: string): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('cipa_indicados').delete().eq('id', id);
  return error
    ? { ok: false, mensagem: mensagemDoErro(error) }
    : { ok: true, mensagem: 'Representante removido.' };
}

/** Horários chegam soltos (input type="time"); combinados com a data de referência da apuração. */
export async function salvarApuracao(eleicaoId: string, dados: FormData): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const dataRef = dados.get('data_referencia')?.toString();
  const horaInicio = dados.get('hora_inicio')?.toString();
  const horaFim = dados.get('hora_fim')?.toString();

  const { error } = await supabase
    .from('eleicoes')
    .update({
      local_apuracao: dados.get('local_apuracao')?.toString() || null,
      apuracao_iniciada_em: horaInicio && dataRef ? `${dataRef}T${horaInicio}` : null,
      apuracao_encerrada_em: horaFim && dataRef ? `${dataRef}T${horaFim}` : null,
      ata_lavrada_por: dados.get('ata_lavrada_por')?.toString() || null,
    })
    .eq('id', eleicaoId);

  return error
    ? { ok: false, mensagem: mensagemDoErro(error) }
    : { ok: true, mensagem: 'Dados da sessão de apuração salvos.' };
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
