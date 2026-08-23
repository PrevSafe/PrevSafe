import { supabase } from '@/lib/supabase';
import { daEmpresa } from '@/lib/consulta';

export type SeveridadeAlerta = 'HARD_BLOCK' | 'WARNING_ADVISORY';

export type AcaoRapida = { rotulo: string; para: string };

export type Alerta = {
  id: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  diagnostico: string;
  impacto: string;
  resolucao: string;
  acao?: AcaoRapida;
};

export type RiscoAuditoria = {
  id: string;
  descricao: string;
  fatorRiscoCodigo: string | null;
  fatorRiscoDescricao: string | null;
  procedimentosExigidos: { codigo: string; nomeExame: string; periodicidadeMeses: number | null }[];
  epiExigidoId: string | null;
  epiExigidoNome: string | null;
  ensejaAposentadoriaEspecial: boolean;
};

export type ProcedimentoRealizado = { codigo: string; dataExame: string };
export type EntregaEpi = { epiId: string; dataValidade: string | null };

export type AfastamentoMotivo = 'acidente_trabalho' | 'doenca_ocupacional' | 'doenca_nao_ocupacional' | 'outros';
export type AfastamentoAtivo = { id: string; motivo: AfastamentoMotivo; dataInicio: string; temCat: boolean };

export type AuditoriaPayload = {
  funcionario: { id: string; nome: string };
  /** Código GFIP efetivo: da competência corrente em folha_agente_nocivo, com fallback para cargos.codigo_gfip. */
  codigoGfip: number | null;
  riscos: RiscoAuditoria[];
  procedimentosRealizados: ProcedimentoRealizado[];
  entregasEpi: EntregaEpi[];
  afastamentoAtivo: AfastamentoAtivo | null;
};

const CODIGO_AUSENCIA_RISCO = '09.01.001';

function dentroDaPeriodicidade(dataExame: string, periodicidadeMeses: number | null): boolean {
  if (periodicidadeMeses == null) return true;
  const limite = new Date(`${dataExame}T00:00:00`);
  limite.setMonth(limite.getMonth() + periodicidadeMeses);
  return limite >= new Date();
}

function epiEmDia(epiId: string, entregas: EntregaEpi[]): boolean {
  const hoje = new Date().toISOString().slice(0, 10);
  return entregas.some((e) => e.epiId === epiId && (!e.dataValidade || e.dataValidade >= hoje));
}

/**
 * Avalia as regras do SST Linter (Fase 1) sobre um payload já montado —
 * função pura, sem I/O, para poder ser testada isoladamente.
 */
export function avaliarAlertas(payload: AuditoriaPayload): Alerta[] {
  const alertas: Alerta[] = [];
  const nome = payload.funcionario.nome;

  const temAusenciaDeRisco = payload.riscos.some((r) => r.fatorRiscoCodigo === CODIGO_AUSENCIA_RISCO);
  const temRiscoComExigencia = payload.riscos.some(
    (r) => r.fatorRiscoCodigo !== CODIGO_AUSENCIA_RISCO && (r.procedimentosExigidos.length > 0 || r.epiExigidoId)
  );
  if (temAusenciaDeRisco && temRiscoComExigencia) {
    alertas.push({
      id: 'LNT-S2240-003',
      severidade: 'HARD_BLOCK',
      titulo: 'Ausência de Risco Inconsistente com Outros Riscos do GHE',
      diagnostico: `O GHE de ${nome} contém o código de ausência de risco (${CODIGO_AUSENCIA_RISCO}) ao mesmo tempo em que outro risco do grupo exige exame ou EPI. O eSocial rejeitará o XML do S-2240 por erro de estrutura.`,
      impacto: 'Bloqueio no envio do evento S-2240 (rejeição de schema pelo eSocial).',
      resolucao: 'Revise o inventário do GHE: se há exposição real, remova o código de ausência de risco; se não há, remova os demais riscos que exigem EPI/exame.',
    });
  }

  for (const risco of payload.riscos) {
    if (risco.fatorRiscoCodigo === CODIGO_AUSENCIA_RISCO) continue;

    for (const proc of risco.procedimentosExigidos) {
      const realizado = payload.procedimentosRealizados.some(
        (p) => p.codigo === proc.codigo && dentroDaPeriodicidade(p.dataExame, proc.periodicidadeMeses)
      );
      if (!realizado) {
        alertas.push({
          id: 'LNT-S2240-001',
          severidade: 'HARD_BLOCK',
          titulo: 'Exposição a Risco sem Monitoramento de Saúde no PCMSO',
          diagnostico: `${nome} está exposto ao risco "${risco.fatorRiscoDescricao ?? risco.descricao}" (${risco.fatorRiscoCodigo}), mas não há registro válido do exame "${proc.nomeExame}" (código ${proc.codigo})${proc.periodicidadeMeses ? ` dentro da periodicidade de ${proc.periodicidadeMeses} meses` : ''}.`,
          impacto: 'Bloqueio no envio do S-2240 por inconsistência com o PCMSO (S-2220), e risco de autuação por descumprimento da NR-7.',
          resolucao: `Registre o exame "${proc.nomeExame}" para ${nome} na Controle de ASO antes de enviar o evento.`,
          acao: { rotulo: 'Lançar exame de ASO', para: `/aso/novo?funcionario_id=${payload.funcionario.id}` },
        });
      }
    }

    if (risco.epiExigidoId && !epiEmDia(risco.epiExigidoId, payload.entregasEpi)) {
      alertas.push({
        id: 'LNT-S2240-EPI',
        severidade: 'HARD_BLOCK',
        titulo: 'EPI Exigido sem Entrega Vigente',
        diagnostico: `O risco "${risco.fatorRiscoDescricao ?? risco.descricao}" exige o uso do EPI "${risco.epiExigidoNome ?? ''}", mas não há entrega registrada e dentro da validade para ${nome}.`,
        impacto: 'Bloqueio no envio do S-2240 (uso de EPI sem comprovação de entrega) e risco de autuação pela NR-6.',
        resolucao: `Registre a entrega do EPI "${risco.epiExigidoNome ?? ''}" para ${nome} antes de enviar o evento.`,
        acao: { rotulo: 'Registrar entrega de EPI', para: `/epi/nova?funcionario_id=${payload.funcionario.id}` },
      });
    }
  }

  const ensejaAposentadoriaEspecial = payload.riscos.some((r) => r.ensejaAposentadoriaEspecial);
  if (ensejaAposentadoriaEspecial && (payload.codigoGfip === 0 || payload.codigoGfip === 1)) {
    alertas.push({
      id: 'LNT-S1200-001',
      severidade: 'WARNING_ADVISORY',
      titulo: 'Divergência Tributária de Aposentadoria Especial',
      diagnostico: `${nome} está exposto a risco que enseja aposentadoria especial, mas o cargo está com código GFIP ${payload.codigoGfip} (ausência de exposição / neutralizado), quando deveria estar em 2, 3 ou 4.`,
      impacto: 'Risco de multa de 75% a 150% sobre a contribuição do SAT/FENTEC não recolhida (Portaria Interministerial MPS/MF nº 13/2026).',
      resolucao: 'Ajuste o código GFIP do cargo do trabalhador para refletir a exposição real e alinhe o recolhimento da alíquota suplementar de SAT/FENTEC com o Departamento Pessoal.',
      acao: { rotulo: 'Editar código GFIP do cargo', para: '/cargos' },
    });
  }

  const afastamento = payload.afastamentoAtivo;
  if (afastamento && (afastamento.motivo === 'acidente_trabalho' || afastamento.motivo === 'doenca_ocupacional') && !afastamento.temCat) {
    alertas.push({
      id: 'LNT-S2210-001',
      severidade: 'WARNING_ADVISORY',
      titulo: 'Afastamento Acidentário sem CAT Transmitida',
      diagnostico: `${nome} foi afastado em ${afastamento.dataInicio} por motivo acidentário/ocupacional, mas nenhuma Comunicação de Acidente de Trabalho (S-2210) foi registrada para esse afastamento.`,
      impacto: 'Risco de multa de até R$ 98.484,45 por deixar de comunicar o acidente de trabalho no prazo legal (1 dia útil).',
      resolucao: 'Emita a CAT vinculada a este afastamento com os dados do acidente.',
      acao: { rotulo: 'Emitir CAT', para: `/afastamentos/${afastamento.id}/cat` },
    });
  }

  return alertas;
}

export async function carregarAuditoriaFuncionario(empresaId: string, funcionarioId: string): Promise<AuditoriaPayload> {
  const { data: funcionario, error: erroFuncionario } = await daEmpresa(
    supabase.from('funcionarios').select('id, nome'),
    empresaId
  )
    .eq('id', funcionarioId)
    .single();
  if (erroFuncionario) throw erroFuncionario;

  const { data: lotacaoAtiva } = await daEmpresa(
    supabase
      .from('funcionarios_lotacoes')
      .select('lotacoes(cargo_id, cargos(codigo_gfip, ghe_id))'),
    empresaId
  )
    .eq('funcionario_id', funcionarioId)
    .is('data_fim', null)
    .maybeSingle();

  type CargoEmbutido = { codigo_gfip: number | null; ghe_id: string | null } | null;
  const cargo = (lotacaoAtiva?.lotacoes as { cargos?: CargoEmbutido } | null)?.cargos ?? null;
  const gheId = cargo?.ghe_id ?? null;

  const competenciaAtual = `${new Date().toISOString().slice(0, 7)}-01`;
  const { data: folhaCompetencia } = await daEmpresa(
    supabase.from('folha_agente_nocivo').select('codigo_gfip'),
    empresaId
  )
    .eq('funcionario_id', funcionarioId)
    .eq('competencia', competenciaAtual)
    .maybeSingle();
  const codigoGfip = folhaCompetencia?.codigo_gfip ?? cargo?.codigo_gfip ?? null;

  let riscos: RiscoAuditoria[] = [];
  if (gheId) {
    const { data: riscosRaw, error: erroRiscos } = await daEmpresa(
      supabase
        .from('riscos_inventario')
        .select(
          'id, descricao, fator_risco_t24_codigo, epi_id, epis(nome), fatores_risco_t24(descricao, enseja_aposentadoria_especial)'
        ),
      empresaId
    ).eq('ghe_id', gheId);
    if (erroRiscos) throw erroRiscos;

    const codigosFator = [...new Set((riscosRaw ?? []).map((r) => r.fator_risco_t24_codigo).filter((c): c is string => Boolean(c)))];

    const compatPorFator = new Map<string, string[]>();
    if (codigosFator.length) {
      const { data: compat } = await supabase
        .from('riscos_exames_compatibilidade')
        .select('fator_risco_codigo, procedimento_codigo')
        .in('fator_risco_codigo', codigosFator);
      for (const c of compat ?? []) {
        const lista = compatPorFator.get(c.fator_risco_codigo) ?? [];
        lista.push(c.procedimento_codigo);
        compatPorFator.set(c.fator_risco_codigo, lista);
      }
    }

    const codigosProcedimento = [...new Set([...compatPorFator.values()].flat())];
    const procedimentosPorCodigo = new Map<string, { nomeExame: string; periodicidadeMeses: number | null }>();
    if (codigosProcedimento.length) {
      const { data: procs } = await supabase
        .from('procedimentos_t27')
        .select('codigo_esocial, nome_exame, periodicidade_meses')
        .in('codigo_esocial', codigosProcedimento);
      for (const p of procs ?? []) {
        procedimentosPorCodigo.set(p.codigo_esocial, { nomeExame: p.nome_exame, periodicidadeMeses: p.periodicidade_meses });
      }
    }

    riscos = (riscosRaw ?? []).map((r) => {
      const fatorInfo = r.fatores_risco_t24 as unknown as {
        descricao: string;
        enseja_aposentadoria_especial: boolean;
      } | null;
      const epiInfo = r.epis as unknown as { nome: string } | null;
      const codigosExigidos = r.fator_risco_t24_codigo ? compatPorFator.get(r.fator_risco_t24_codigo) ?? [] : [];
      return {
        id: r.id,
        descricao: r.descricao,
        fatorRiscoCodigo: r.fator_risco_t24_codigo,
        fatorRiscoDescricao: fatorInfo?.descricao ?? null,
        procedimentosExigidos: codigosExigidos.map((codigo) => ({
          codigo,
          nomeExame: procedimentosPorCodigo.get(codigo)?.nomeExame ?? codigo,
          periodicidadeMeses: procedimentosPorCodigo.get(codigo)?.periodicidadeMeses ?? null,
        })),
        epiExigidoId: r.epi_id,
        epiExigidoNome: epiInfo?.nome ?? null,
        ensejaAposentadoriaEspecial: fatorInfo?.enseja_aposentadoria_especial ?? false,
      };
    });
  }

  const { data: asoExames } = await daEmpresa(supabase.from('aso_exames').select('id, data_exame'), empresaId).eq(
    'funcionario_id',
    funcionarioId
  );
  const asoIds = (asoExames ?? []).map((a) => a.id);
  let procedimentosRealizados: ProcedimentoRealizado[] = [];
  if (asoIds.length) {
    const { data: procRealizados } = await supabase
      .from('aso_exames_procedimentos')
      .select('procedimento_codigo, aso_exame_id')
      .in('aso_exame_id', asoIds);
    const dataPorExame = new Map((asoExames ?? []).map((a) => [a.id, a.data_exame as string]));
    procedimentosRealizados = (procRealizados ?? []).map((p) => ({
      codigo: p.procedimento_codigo,
      dataExame: dataPorExame.get(p.aso_exame_id) ?? '',
    }));
  }

  const { data: entregas } = await daEmpresa(supabase.from('epi_entregas').select('epi_id, data_validade'), empresaId).eq(
    'funcionario_id',
    funcionarioId
  );
  const entregasEpi: EntregaEpi[] = (entregas ?? []).map((e) => ({ epiId: e.epi_id, dataValidade: e.data_validade }));

  const { data: afastamento } = await daEmpresa(
    supabase.from('funcionarios_afastamentos').select('id, motivo, data_inicio'),
    empresaId
  )
    .eq('funcionario_id', funcionarioId)
    .is('data_fim', null)
    .maybeSingle();

  let afastamentoAtivo: AfastamentoAtivo | null = null;
  if (afastamento) {
    const { data: cat } = await supabase
      .from('cat_comunicacoes')
      .select('id')
      .eq('afastamento_id', afastamento.id)
      .limit(1)
      .maybeSingle();
    afastamentoAtivo = {
      id: afastamento.id,
      motivo: afastamento.motivo as AfastamentoMotivo,
      dataInicio: afastamento.data_inicio,
      temCat: Boolean(cat),
    };
  }

  return {
    funcionario: { id: funcionario.id, nome: funcionario.nome },
    codigoGfip,
    riscos,
    procedimentosRealizados,
    entregasEpi,
    afastamentoAtivo,
  };
}

export async function auditarFuncionario(empresaId: string, funcionarioId: string): Promise<Alerta[]> {
  const payload = await carregarAuditoriaFuncionario(empresaId, funcionarioId);
  return avaliarAlertas(payload);
}
