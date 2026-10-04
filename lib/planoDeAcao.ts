/**
 * Plano de acao do PGR (NR-01, subitens 1.5.5.2 e 1.5.5.3).
 *
 * O PLANO E UM REGISTRO
 *
 * Era uma tabela calculada na hora de imprimir: uma acao generica por risco,
 * o responsavel tecnico no lugar do responsavel, a faixa da classificacao no
 * lugar do prazo e o status sempre "Nao iniciada". Nada podia ser
 * acompanhado, e o subitem 1.5.5.3.1 manda registrar a implementacao e os
 * ajustes. Agora cada acao e um registro da colecao `pgrActionPlan`
 * (types/index.ts, PgrActionPlanItem).
 *
 * Uma acao nasce de tres jeitos:
 *   - CATALOGO: ao aplicar um risco do catalogo, as medidas recomendadas viram
 *     acoes SUGERIDAS (`sugestoesDoCatalogo`);
 *   - INVENTARIO: para risco sem acao, a sugestao sai do estado dos controles
 *     do risco (`sugestaoDoInventario`), a regra que o PDF usava;
 *   - MANUAL: cadastrada na tela.
 *
 * SUGESTAO NAO E PLANO. So entra no PGR a acao que alguem ACEITOU, com
 * responsavel, prazo, acompanhamento e afericao (subitem 1.5.5.2.2). Risco sem
 * acao aceita sai no PDF com a sugestao e a pendencia, e nunca com um
 * responsavel ou um prazo que ninguem definiu.
 *
 * REGRA UNICA
 *
 * O PGR, o relatorio de fatores psicossociais e a tela leem daqui. Duas copias
 * da mesma regra divergem; um recorte que diverge do PGR e pior que nenhum.
 */
import {
  classificarRisco,
  DECISAO_POR_NIVEL,
  NivelDeRiscoPGR,
  RiscoClassificado
} from '@/lib/classificacaoDeRisco';
import { ehRiscoPsicossocial, PREFIXO_DO_RISCO } from '@/lib/psicossocial';
import { dataDeHoje, formatarDataISO } from '@/lib/datas';
import type {
  HierarquiaDaMedida,
  JustificativaDaHierarquia,
  OccupationalRiskCatalogItem,
  PgrActionPlanItem,
  StatusDaAcaoDoPlano,
  TipoDaAcaoDoPlano
} from '@/types';

// ---------------------------------------------------------------------------
// Rotulos
// ---------------------------------------------------------------------------

/** Alinea "g" do item 1.4.1, na ordem: I eliminacao ... IV protecao individual. */
export const ORDEM_DA_HIERARQUIA: HierarquiaDaMedida[] = [
  'ELIMINACAO',
  'PROTECAO_COLETIVA',
  'ADMINISTRATIVA',
  'EPI'
];

export const ROTULO_DA_HIERARQUIA: Record<HierarquiaDaMedida, string> = {
  ELIMINACAO: 'Eliminação do fator de risco',
  PROTECAO_COLETIVA: 'Proteção coletiva',
  ADMINISTRATIVA: 'Administrativa ou de organização do trabalho',
  EPI: 'Proteção individual (EPI)'
};

/** As hipoteses do subitem 1.5.5.1.2. */
export const ROTULO_DA_JUSTIFICATIVA: Record<JustificativaDaHierarquia, string> = {
  INVIABILIDADE_TECNICA: 'Inviabilidade técnica da proteção coletiva, comprovada',
  INSUFICIENCIA: 'Proteção coletiva não suficiente',
  COLETIVA_EM_IMPLANTACAO: 'Proteção coletiva em fase de estudo, planejamento ou implantação',
  COMPLEMENTAR: 'Caráter complementar',
  EMERGENCIAL: 'Caráter emergencial'
};

export const ROTULO_DO_TIPO: Record<TipoDaAcaoDoPlano, 'Introduzir' | 'Aprimorar' | 'Manter'> = {
  INTRODUZIR: 'Introduzir',
  APRIMORAR: 'Aprimorar',
  MANTER: 'Manter'
};

/** Os status da secao 8 do PGR. "Atrasada" e calculado (`statusExibido`). */
export const ROTULO_DO_STATUS: Record<StatusDaAcaoDoPlano, string> = {
  SUGERIDA: 'Sugerida, não aceita',
  NAO_INICIADA: 'Não iniciada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  EFICACIA_VERIFICADA: 'Concluída - eficácia verificada',
  DESCARTADA: 'Descartada'
};

/** Status de acao aceita: so estas entram no plano do PGR. */
export const STATUS_DO_PLANO: StatusDaAcaoDoPlano[] = [
  'NAO_INICIADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'EFICACIA_VERIFICADA'
];

export const acaoAceita = (a: Pick<PgrActionPlanItem, 'status'> | null | undefined): boolean =>
  !!a && STATUS_DO_PLANO.includes(a.status);

const acaoConcluida = (a: Pick<PgrActionPlanItem, 'status'> | null | undefined): boolean =>
  !!a && (a.status === 'CONCLUIDA' || a.status === 'EFICACIA_VERIFICADA');

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function dataValida(iso: string | undefined | null): boolean {
  if (!iso || !DATA_ISO.test(iso)) return false;
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d, 12));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** AAAA-MM-DD + N dias de calendario. null quando a data nao serve. */
export function somarDias(iso: string, dias: number): string | null {
  const base = String(iso || '').slice(0, 10);
  if (!dataValida(base) || !Number.isFinite(dias)) return null;
  const [a, m, d] = base.split('-').map(Number);
  // Meio-dia UTC: a soma nao cai na virada do dia por causa de fuso.
  const dt = new Date(Date.UTC(a, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** AAAA-MM-DD para DD/MM/AAAA. */
export function dataBR(iso: string | undefined | null): string {
  const s = String(iso || '').slice(0, 10);
  if (!dataValida(s)) return '';
  const [a, m, d] = s.split('-');
  return `${d}/${m}/${a}`;
}

const texto = (v: unknown): string => String(v ?? '').trim();

// ---------------------------------------------------------------------------
// Prazo da classificacao (secao 5.7 do PGR)
// ---------------------------------------------------------------------------

/**
 * Secao 5.7, regra do numero de trabalhadores (subitem 1.5.5.2.1.1): "com 10
 * ou mais expostos, ou 20% ou mais do efetivo, o prazo passa ao da faixa
 * imediatamente superior". O PGR prometia a regra e o quadro do plano nao a
 * aplicava.
 */
export const EXPOSTOS_QUE_ELEVAM_O_PRAZO = 10;
export const FRACAO_DO_EFETIVO_QUE_ELEVA_O_PRAZO = 0.2;

const FAIXA_ACIMA: Record<NivelDeRiscoPGR, NivelDeRiscoPGR> = {
  BAIXO: 'MEDIO',
  MEDIO: 'ALTO',
  ALTO: 'MUITO_ALTO',
  MUITO_ALTO: 'MUITO_ALTO'
};

export interface PrazoDaClassificacao {
  /** Faixa cujo prazo se aplica: a do risco, ou a de cima. */
  nivel: NivelDeRiscoPGR;
  /** O texto do prazo no modelo, ex. "90 dias". */
  rotulo: string;
  dias: number | null;
  /** Subiu de faixa pelo numero de expostos. */
  elevado: boolean;
}

export function prazoDaClassificacao(
  classificado: RiscoClassificado | null,
  expostos: number,
  efetivo: number
): PrazoDaClassificacao | null {
  if (!classificado) return null;
  const muitos =
    expostos >= EXPOSTOS_QUE_ELEVAM_O_PRAZO ||
    (efetivo > 0 && expostos > 0 && expostos / efetivo >= FRACAO_DO_EFETIVO_QUE_ELEVA_O_PRAZO);
  const nivel = muitos ? FAIXA_ACIMA[classificado.nivel] : classificado.nivel;
  const decisao = DECISAO_POR_NIVEL[nivel];
  return {
    nivel,
    rotulo: decisao.prazo,
    dias: decisao.prazoEmDias,
    elevado: nivel !== classificado.nivel
  };
}

/** Data-limite da faixa contada de uma data (o aceite). */
export function limiteDaFaixa(prazo: PrazoDaClassificacao | null, desde: string): string | null {
  if (!prazo || prazo.dias == null) return null;
  return somarDias(String(desde || '').slice(0, 10), prazo.dias);
}

// ---------------------------------------------------------------------------
// Sugestoes
// ---------------------------------------------------------------------------

/** O que a tela ou o contexto gravam: o resto (id, datas, historico) e do contexto. */
export type NovaAcaoDoPlano = Omit<
  PgrActionPlanItem,
  'id' | 'organization_id' | 'created_at' | 'updated_at' | 'history'
>;

const ehErgonomico = (r: any): boolean =>
  String(r?.risk_category || '').toUpperCase().startsWith('ERGON');

/**
 * A medida do proprio controle do risco: organizacao do trabalho para fator
 * psicossocial, protecao coletiva para o resto. E ela que muda os campos
 * "EPC implantado" e "EPC eficaz" do inventario (`efeitoNoRisco`).
 */
export function hierarquiaDoControle(r: any): HierarquiaDaMedida {
  return ehRiscoPsicossocial(r) ? 'ADMINISTRATIVA' : 'PROTECAO_COLETIVA';
}

/**
 * Medida administrativa e EPI exigem a justificativa do subitem 1.5.5.1.2,
 * que e a excecao a protecao coletiva. Para fator ergonomico e psicossocial a
 * organizacao do trabalho e a propria medida da NR-17 (item 17.4), e nao a
 * excecao: ali so o EPI precisa de justificativa.
 */
export function exigeJustificativa(hierarquia: HierarquiaDaMedida, risco: any): boolean {
  if (hierarquia === 'EPI') return true;
  if (hierarquia === 'ADMINISTRATIVA') return !(ehRiscoPsicossocial(risco) || ehErgonomico(risco));
  return false;
}

const ACOMPANHAMENTO_SUGERIDO =
  'Verificação da execução e inspeção do local (alíneas "a" e "b" do subitem 1.5.5.3.2)';
const ACOMPANHAMENTO_PSICOSSOCIAL_SUGERIDO =
  'Acompanhamento com os trabalhadores e a CIPA, quando houver (alínea "d" do subitem 1.5.5.3.2)';

function afericaoSugerida(r: any): string {
  return r?.evaluation_type === 'QUANTITATIVA'
    ? 'Nova avaliação quantitativa da exposição após a medida (alínea "c" do subitem 1.5.5.3.2)'
    : 'Reavaliação do risco após a medida (alínea "a" do subitem 1.5.4.4.6)';
}

export interface SugestaoDoInventario {
  tipo: TipoDaAcaoDoPlano;
  medida: string;
  hierarquia: HierarquiaDaMedida;
  /** Como a hierarquia sai no PDF. */
  rotulo: string;
}

/**
 * A acao que o estado dos controles do risco sugere. Tipo (subitem 1.5.5.2.1):
 * introduzir quando nao ha controle, aprimorar quando o controle existe mas a
 * eficacia nao foi verificada, manter quando esta implementado e verificado.
 */
export function sugestaoDoInventario(r: any): SugestaoDoInventario {
  const semControle = !r?.epc_implemented;
  const semEficacia = !!r?.epc_implemented && !r?.epc_effective;
  const tipo: TipoDaAcaoDoPlano = semControle ? 'INTRODUZIR' : semEficacia ? 'APRIMORAR' : 'MANTER';

  // Fator psicossocial nao se controla com protecao coletiva: a medida e na
  // organizacao do trabalho, definida com os trabalhadores. O Guia do MTE
  // manda preferir mudar as condicoes de trabalho a intervir na pessoa.
  if (ehRiscoPsicossocial(r)) {
    const perigo = String(r?.agent_name || '').replace(PREFIXO_DO_RISCO, '') || 'o fator identificado';
    return {
      tipo,
      medida: semControle
        ? `Adotar, com os trabalhadores, medida na organização do trabalho contra: ${perigo}`
        : semEficacia
          ? `Verificar e evidenciar, com os trabalhadores, a eficácia da medida contra: ${perigo}`
          : `Manter e acompanhar, com os trabalhadores, as medidas contra: ${perigo}`,
      hierarquia: 'ADMINISTRATIVA',
      rotulo: 'Organização do trabalho (preferível a medida individual ou comportamental)'
    };
  }

  const agente = r?.agent_name || 'o perigo identificado';
  return {
    tipo,
    medida: semControle
      ? `Implantar medida de proteção coletiva para ${agente}`
      : semEficacia
        ? `Verificar e evidenciar a eficácia do controle coletivo de ${agente}`
        : `Manter e monitorar os controles de ${agente}`,
    hierarquia: 'PROTECAO_COLETIVA',
    rotulo: semControle || semEficacia ? 'Proteção coletiva' : 'Manutenção dos controles'
  };
}

/** A sugestao do inventario como registro SUGERIDO. */
export function novaAcaoDoInventario(r: any, prazoSugerido?: string | null): NovaAcaoDoPlano {
  const s = sugestaoDoInventario(r);
  return {
    client_id: r?.client_id || '',
    risk_id: r?.id,
    ghe_id: r?.ghe_id || '',
    origin: 'INVENTARIO',
    measure: s.medida,
    hierarchy: s.hierarquia,
    action_type: s.tipo,
    deadline: prazoSugerido || undefined,
    monitoring: ehRiscoPsicossocial(r) ? ACOMPANHAMENTO_PSICOSSOCIAL_SUGERIDO : ACOMPANHAMENTO_SUGERIDO,
    measurement: afericaoSugerida(r),
    status: 'SUGERIDA'
  };
}

/**
 * As medidas recomendadas pelo catalogo, como acoes SUGERIDAS do risco recem
 * aplicado. O catalogo diz o que se RECOMENDA para o agente; o que existe no
 * local so quem foi la sabe. Por isso nascem sugeridas, e o risco nasce sem
 * controle implantado.
 *
 * Nao se sugere justificativa para o EPI: a hipotese do subitem 1.5.5.1.2
 * (inviabilidade, insuficiencia, implantacao, complementar, emergencial) e um
 * fato do local, e e declarada por quem aceita a acao.
 */
export function sugestoesDoCatalogo(
  r: any,
  item: Pick<OccupationalRiskCatalogItem, 'id' | 'recommended_epcs' | 'recommended_epis' | 'suggested_controls_summary'>,
  prazoSugerido?: string | null
): NovaAcaoDoPlano[] {
  const comum = {
    client_id: r?.client_id || '',
    risk_id: r?.id,
    ghe_id: r?.ghe_id || '',
    origin: 'CATALOGO' as const,
    origin_catalog_id: item?.id,
    action_type: 'INTRODUZIR' as const,
    deadline: prazoSugerido || undefined,
    monitoring: ACOMPANHAMENTO_SUGERIDO,
    measurement: afericaoSugerida(r),
    status: 'SUGERIDA' as const
  };
  const acoes: NovaAcaoDoPlano[] = [];

  const coletiva = texto(item?.recommended_epcs) || texto(item?.suggested_controls_summary);
  if (coletiva) {
    acoes.push({ ...comum, measure: coletiva, hierarchy: 'PROTECAO_COLETIVA' });
  }

  const epis = (Array.isArray(item?.recommended_epis) ? item.recommended_epis : [])
    .map((e) => texto(e?.name))
    .filter(Boolean);
  if (epis.length > 0) {
    acoes.push({
      ...comum,
      measure: `Fornecer EPI com CA válido, orientar e controlar o uso: ${epis.join('; ')}`,
      hierarchy: 'EPI',
      monitoring: 'Registro de entrega e inspeção do uso',
      measurement: 'Verificação das condições de eficácia do EPI: uso ininterrupto, troca periódica e higienização'
    });
  }

  return acoes;
}

// ---------------------------------------------------------------------------
// Conferencia de uma acao
// ---------------------------------------------------------------------------

/**
 * Grupo da falta, para quem precisa separar sem ler o texto:
 *   CRONOGRAMA  medida, responsavel, prazo, acompanhamento, afericao (1.5.5.2)
 *   HIERARQUIA  falta a hipotese do 1.5.5.1.2
 *   REGISTRO    implementacao, ajustes e afericao (1.5.5.3 e 1.5.5.1.3)
 *   PRAZO       prazo aceito alem do da classificacao (secao 5.7)
 */
export type GrupoDaFalta = 'CRONOGRAMA' | 'HIERARQUIA' | 'REGISTRO' | 'PRAZO';

export interface FaltaDaAcao {
  texto: string;
  grupo: GrupoDaFalta;
}

/** Inicio do evento que o contexto grava ao mudar o prazo de acao aceita. */
export const EVENTO_PRAZO_ALTERADO = 'Prazo alterado';

/** As mudancas de prazo registradas no historico da acao. */
export function alteracoesDePrazo(a: PgrActionPlanItem) {
  return (a?.history || []).filter((h) => String(h?.evento || '').startsWith(EVENTO_PRAZO_ALTERADO));
}

/** Prazo atual diferente do aceito: houve prorrogacao (ou antecipacao). */
export function prazoAlterado(a: PgrActionPlanItem): boolean {
  return dataValida(a?.original_deadline) && dataValida(a?.deadline) && a.original_deadline !== a.deadline;
}

/** As faltas de uma acao ACEITA, com o grupo. Ver `faltasDaAcao`. */
export function faltasDetalhadasDaAcao(
  a: PgrActionPlanItem,
  contexto: { risco?: any; prazoDaFaixa?: PrazoDaClassificacao | null } = {}
): FaltaDaAcao[] {
  const f: FaltaDaAcao[] = [];
  const falta = (grupo: GrupoDaFalta, t: string) => f.push({ grupo, texto: t });
  if (!texto(a.measure)) falta('CRONOGRAMA', 'medida não descrita (subitem 1.5.5.2.1)');
  if (!texto(a.responsible)) falta('CRONOGRAMA', 'responsável não definido (subitem 1.5.5.2.2)');
  if (!dataValida(a.deadline)) falta('CRONOGRAMA', 'prazo não definido (subitem 1.5.5.2.2)');
  if (!texto(a.monitoring)) falta('CRONOGRAMA', 'forma de acompanhamento não definida (subitem 1.5.5.2.2)');
  if (!texto(a.measurement)) falta('CRONOGRAMA', 'forma de aferição de resultados não definida (subitem 1.5.5.2.2)');
  if (exigeJustificativa(a.hierarchy, contexto.risco) && !a.hierarchy_justification) {
    falta('HIERARQUIA', `${ROTULO_DA_HIERARQUIA[a.hierarchy]} sem a justificativa do subitem 1.5.5.1.2`);
  }

  if (acaoConcluida(a)) {
    if (!dataValida(a.completed_at)) falta('REGISTRO', 'conclusão sem data (subitem 1.5.5.3.1)');
    if (!texto(a.evidence)) falta('REGISTRO', 'conclusão sem evidência registrada (subitem 1.5.5.3.1)');
    if (!dataValida(a.workers_informed_at)) {
      falta('REGISTRO', 'sem registro da informação aos trabalhadores (subitem 1.5.5.1.3)');
    }
  }
  if (a.status === 'EFICACIA_VERIFICADA'
    && (!dataValida(a.effectiveness_checked_at) || !texto(a.effectiveness_result))) {
    falta('REGISTRO', 'eficácia dada por verificada sem a data e o resultado da aferição (subitem 1.5.5.3.2)');
  }
  // O contexto nao deixa mudar prazo aceito sem motivo; registro vindo de
  // outro caminho (importacao, edicao direta) pode ter. Ajuste sem motivo
  // nao esta registrado como o subitem 1.5.5.3.1 manda.
  if (prazoAlterado(a) && alteracoesDePrazo(a).length === 0) {
    falta('REGISTRO',
      `prazo alterado de ${dataBR(a.original_deadline)} para ${dataBR(a.deadline)} sem o motivo no histórico (subitem 1.5.5.3.1)`);
  }

  // O prazo ACEITO conta da data do aceite. Prorrogar depois e permitido,
  // com motivo no historico: por isso a conferencia usa o prazo original.
  const prazoAceito = a.original_deadline || a.deadline;
  // accepted_at e data e hora UTC: cortar a string daria o dia seguinte para
  // aceite feito depois das 21h em Brasilia.
  const desde = formatarDataISO(a.accepted_at || a.created_at || '');
  const limite = limiteDaFaixa(contexto.prazoDaFaixa ?? null, desde);
  if (limite && dataValida(prazoAceito) && (prazoAceito as string) > limite) {
    falta('PRAZO',
      `prazo de ${dataBR(prazoAceito)} além do da classificação (${contexto.prazoDaFaixa!.rotulo}, ` +
      `até ${dataBR(limite)}; seção 5.7)`
    );
  }
  return f;
}

/**
 * O que falta numa acao ACEITA para cumprir a NR-01. Lista vazia: completa.
 *
 * `risco` decide se a medida administrativa precisa de justificativa;
 * `prazoDaFaixa` confere o prazo contra a secao 5.7.
 */
export function faltasDaAcao(
  a: PgrActionPlanItem,
  contexto: { risco?: any; prazoDaFaixa?: PrazoDaClassificacao | null } = {}
): string[] {
  return faltasDetalhadasDaAcao(a, contexto).map((x) => x.texto);
}

/**
 * O que a conclusao e a afericao registraram, em texto para o historico.
 *
 * Os campos da acao guardam so a conclusao VIGENTE: reaberta e concluida de
 * novo, a primeira implementacao sumiria. O historico guarda cada uma
 * (subitem 1.5.5.3.1: a implementacao e os ajustes devem ser registrados).
 */
export function registroDaConclusao(a: PgrActionPlanItem): string {
  return `Concluída em ${dataBR(a.completed_at) || 'data não informada'}. Evidência: ${texto(a.evidence) || 'não registrada'}. `
    + `Trabalhadores informados em ${dataBR(a.workers_informed_at) || 'data não informada'}.`;
}

export function registroDaAfericao(a: PgrActionPlanItem): string {
  return `Eficácia aferida em ${dataBR(a.effectiveness_checked_at) || 'data não informada'}: ${texto(a.effectiveness_result) || 'resultado não registrado'}.`;
}

export function estaAtrasada(a: PgrActionPlanItem, hoje: string = dataDeHoje()): boolean {
  return (a.status === 'NAO_INICIADA' || a.status === 'EM_ANDAMENTO')
    && dataValida(a.deadline)
    && (a.deadline as string) < hoje;
}

/** Status como sai no PGR: "Atrasada" e calculado, e a prorrogacao mostra o prazo original. */
export function statusExibido(a: PgrActionPlanItem, hoje: string = dataDeHoje()): string {
  const base = estaAtrasada(a, hoje) ? 'Atrasada' : ROTULO_DO_STATUS[a.status] || a.status;
  const prorrogada = dataValida(a.original_deadline) && a.original_deadline !== a.deadline;
  return prorrogada ? `${base} (prazo original ${dataBR(a.original_deadline)})` : base;
}

/**
 * Confere uma gravacao. null: pode gravar; texto: o motivo de nao poder.
 *
 * `anterior` e o registro como estava; `motivo` e a justificativa da mudanca
 * de prazo, exigida quando a acao ja tinha sido aceita (a secao 8 do PGR
 * admite "Atrasada (com nova data justificada)").
 */
export function conferirAcao(
  proposta: NovaAcaoDoPlano | PgrActionPlanItem,
  contexto: { risco?: any; anterior?: PgrActionPlanItem | null; motivo?: string; hoje?: string } = {}
): string | null {
  const hoje = contexto.hoje || dataDeHoje();
  const a = proposta as PgrActionPlanItem;
  if (!texto(a.risk_id)) return 'A ação precisa estar ligada a um risco do inventário.';
  if (!texto(a.measure)) return 'Descreva a medida.';
  if (!ORDEM_DA_HIERARQUIA.includes(a.hierarchy)) return 'Escolha o nível da hierarquia da medida.';
  if (a.deadline && !dataValida(a.deadline)) return 'Prazo inválido.';

  const anterior = contexto.anterior;
  if (anterior?.status === 'DESCARTADA') {
    return 'Ação descartada não se altera: o registro fica como está. Cadastre outra ação.';
  }
  if (a.status === 'DESCARTADA') {
    return texto(a.discard_reason) ? null : 'Informe por que a ação foi descartada: o registro fica (subitem 1.5.5.3.1).';
  }
  if (a.status === 'SUGERIDA') {
    return acaoAceita(anterior)
      ? 'Ação aceita não volta a ser sugestão: altere o status, ou descarte-a com o motivo.'
      : null;
  }
  // Reabrir medida concluida e o caso do subitem 1.5.5.3.2.1 (medida
  // ineficaz se corrige): o motivo vai ao historico.
  if (acaoConcluida(anterior) && !acaoConcluida(a) && !texto(contexto.motivo)) {
    return 'A ação estava concluída: informe o motivo de reabri-la (subitem 1.5.5.3.2.1).';
  }

  // Aceita: o cronograma do subitem 1.5.5.2.2 completo.
  if (!texto(a.responsible)) return 'Defina o responsável pela ação (subitem 1.5.5.2.2).';
  if (!dataValida(a.deadline)) return 'Defina o prazo da ação (subitem 1.5.5.2.2).';
  if (!texto(a.monitoring)) return 'Defina a forma de acompanhamento (subitem 1.5.5.2.2).';
  if (!texto(a.measurement)) return 'Defina a forma de aferição de resultados (subitem 1.5.5.2.2).';
  if (exigeJustificativa(a.hierarchy, contexto.risco) && !a.hierarchy_justification) {
    return `${ROTULO_DA_HIERARQUIA[a.hierarchy]} só se adota nas hipóteses do subitem 1.5.5.1.2: escolha a justificativa.`;
  }

  if (anterior && acaoAceita(anterior) && dataValida(anterior.deadline)
    && a.deadline !== anterior.deadline && !texto(contexto.motivo)) {
    return 'A ação já foi aceita: informe o motivo da mudança de prazo. O prazo original fica no histórico.';
  }

  if (acaoConcluida(a)) {
    if (!dataValida(a.completed_at)) return 'Informe a data de conclusão.';
    if ((a.completed_at as string) > hoje) return 'A data de conclusão não pode ser futura.';
    if (!texto(a.evidence)) return 'Registre a evidência da implementação (subitem 1.5.5.3.1).';
    if (!dataValida(a.workers_informed_at)) {
      return 'Informe quando os trabalhadores foram informados dos procedimentos e das limitações da medida (subitem 1.5.5.1.3).';
    }
    if ((a.workers_informed_at as string) > hoje) return 'A data da informação aos trabalhadores não pode ser futura.';
  }
  if (a.status === 'EFICACIA_VERIFICADA') {
    if (!dataValida(a.effectiveness_checked_at)) return 'Informe a data da aferição da eficácia.';
    if ((a.effectiveness_checked_at as string) > hoje) return 'A data da aferição não pode ser futura.';
    if ((a.effectiveness_checked_at as string) < (a.completed_at as string)) {
      return 'A aferição da eficácia não pode ser anterior à conclusão da medida.';
    }
    if (!texto(a.effectiveness_result)) {
      return 'Registre o resultado da aferição: é ele que sustenta "eficácia verificada" (subitem 1.5.5.3.2).';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Efeito no inventario
// ---------------------------------------------------------------------------

/**
 * O que o plano muda no risco.
 *
 * Os campos "EPC implantado" e "EPC eficaz" do inventario alimentam o PGR, o
 * LTCAT e o S-2240 (utilizEPC e eficEpc). O plano e onde a implantacao e a
 * afericao ficam registradas; por isso e ele que os atualiza:
 *
 *   - medida de controle concluida -> EPC implantado;
 *   - eficacia verificada, com data e resultado -> EPC eficaz;
 *   - a acao que sustentava a eficacia deixou de estar verificada (medida
 *     ineficaz, subitem 1.5.5.3.2.1) -> EPC deixa de ser eficaz.
 *
 * Nunca desmarca "implantado": um controle declarado no inventario sem acao
 * no plano continua declarado. null: nada muda.
 */
export function efeitoNoRisco(
  risco: any,
  acoesAntes: PgrActionPlanItem[],
  acoesDepois: PgrActionPlanItem[]
): { epc_implemented?: boolean; epc_effective?: boolean; epc_description?: string } | null {
  const hierarquia = hierarquiaDoControle(risco);
  const doControle = (lista: PgrActionPlanItem[]) =>
    (lista || []).filter((a) => a?.risk_id === risco?.id && a.hierarchy === hierarquia);
  const verificadas = (lista: PgrActionPlanItem[]) =>
    doControle(lista).filter((a) => a.status === 'EFICACIA_VERIFICADA');

  const antes = verificadas(acoesAntes).length > 0;
  const depois = verificadas(acoesDepois).length > 0;
  const concluida = doControle(acoesDepois).find(acaoConcluida);

  const mudanca: { epc_implemented?: boolean; epc_effective?: boolean; epc_description?: string } = {};
  if (concluida && !risco?.epc_implemented) mudanca.epc_implemented = true;
  if (concluida && !texto(risco?.epc_description)) mudanca.epc_description = texto(concluida.measure);
  if (depois && !risco?.epc_effective) {
    mudanca.epc_implemented = true;
    mudanca.epc_effective = true;
  }
  if (antes && !depois && risco?.epc_effective) mudanca.epc_effective = false;

  return Object.keys(mudanca).length > 0 ? mudanca : null;
}

// ---------------------------------------------------------------------------
// O plano como sai no PGR
// ---------------------------------------------------------------------------

export interface OpcoesDoPlano {
  /** Colecao pgrActionPlan. Pode vir com todos os clientes: filtra-se pelo risco. */
  acoes?: PgrActionPlanItem[];
  /** Empregados do cliente, para a regra dos 20% da secao 5.7. */
  efetivo?: number;
  /** AAAA-MM-DD. Padrao: hoje. */
  hoje?: string;
}

export interface AcaoDoPlano {
  risco: any;
  /** R-<codigo do GHE>-<ordem do risco no inventario do cliente>. */
  id: string;
  /** <id>.<ordem da acao no risco>. */
  numero: string;
  gheNome: string;
  classificado: RiscoClassificado | null;
  expostos: number;
  /** Prazo da faixa, ja com a regra do numero de expostos. */
  prazoDaFaixa: PrazoDaClassificacao | null;
  tipo: 'Introduzir' | 'Aprimorar' | 'Manter';
  medida: string;
  hierarquia: string;
  /** O registro. null: sugestao do inventario, nunca gravada. */
  registro: PgrActionPlanItem | null;
  /** Falso: sugestao, sai no PGR como pendencia. */
  aceita: boolean;
  responsavel: string;
  /** AAAA-MM-DD, ou '' quando nao ha. */
  prazo: string;
  acompanhamento: string;
  afericao: string;
  status: string;
  atrasada: boolean;
  /** O que falta para a acao cumprir a NR-01. Vazia: completa. */
  faltas: string[];
  /** As mesmas faltas, com o grupo (`faltasDetalhadasDaAcao`). */
  faltasDetalhadas: FaltaDaAcao[];
}

/**
 * Indicador "acoes concluidas no prazo" (secao 9.1 do PGR; subitem 1.5.3.4).
 *
 * Base: acao aceita ja concluida, ou com o prazo ORIGINAL vencido. No prazo:
 * concluida ate o prazo original aceito. Pelo prazo prorrogado, prorrogar
 * viraria pontualidade. null: ainda nao ha base.
 */
export function indicadorNoPrazo(
  acoes: Array<Pick<AcaoDoPlano, 'aceita' | 'registro'>>,
  hoje: string = dataDeHoje()
): { base: number; noPrazo: number; percentual: number } | null {
  let base = 0;
  let noPrazo = 0;
  (acoes || []).filter((a) => a.aceita && a.registro).forEach((a) => {
    const r = a.registro as PgrActionPlanItem;
    const prazo = dataValida(r.original_deadline) ? String(r.original_deadline)
      : dataValida(r.deadline) ? String(r.deadline) : '';
    if (acaoConcluida(r)) {
      base++;
      if (prazo && dataValida(r.completed_at) && String(r.completed_at) <= prazo) noPrazo++;
    } else if (prazo && prazo < hoje) {
      base++;
    }
  });
  return base > 0 ? { base, noPrazo, percentual: Math.round((noPrazo / base) * 100) } : null;
}

export const FALTA_SEM_ACAO =
  'nenhuma ação cadastrada para o risco: medida, responsável, prazo, acompanhamento e aferição a definir (subitens 1.5.5.2.1 e 1.5.5.2.2)';
export const FALTA_SUGESTAO_NAO_ACEITA =
  'ação sugerida e não aceita: responsável, prazo, acompanhamento e aferição a confirmar (subitem 1.5.5.2.2)';

export const porCriacao = (a: PgrActionPlanItem, b: PgrActionPlanItem) =>
  String(a.created_at || '').localeCompare(String(b.created_at || ''))
  || String(a.id).localeCompare(String(b.id));

/**
 * As acoes do plano, ordenadas pela prioridade da classificacao e, dentro do
 * mesmo nivel, pelo numero de expostos (secao 5.7).
 *
 * Por risco: as acoes aceitas; sem aceita, as sugeridas; sem nenhuma, a
 * sugestao do inventario. As duas ultimas saem com `aceita: false`.
 *
 * `riscosDoCliente` na ordem do inventario: o numero R-... vem dessa ordem, e
 * o relatorio psicossocial so reproduz os numeros do PGR se receber a mesma
 * lista e filtrar DEPOIS.
 */
export function acoesDoPlano(
  riscosDoCliente: any[],
  gheDoCliente: any[],
  expostosDoGhe: (gheId: string) => number,
  opcoes: OpcoesDoPlano = {}
): AcaoDoPlano[] {
  const hoje = opcoes.hoje || dataDeHoje();
  const gravadas = Array.isArray(opcoes.acoes) ? opcoes.acoes : [];
  const efetivo = opcoes.efetivo ?? 0;
  const linhas: Array<AcaoDoPlano & { _risco: number; _acao: number }> = [];

  (riscosDoCliente || []).forEach((r: any, i: number) => {
    const ghe = (gheDoCliente || []).find((g: any) => g?.id === r?.ghe_id);
    const classificado = classificarRisco(r?.severity, r?.probability);
    const expostos = expostosDoGhe(r?.ghe_id);
    const prazoDaFaixa = prazoDaClassificacao(classificado, expostos, efetivo);
    const id = `R-${ghe?.code || 'SEM-GHE'}-${String(i + 1).padStart(2, '0')}`;
    const base = {
      risco: r,
      id,
      gheNome: ghe?.name || 'GHE não vinculado',
      classificado,
      expostos,
      prazoDaFaixa
    };

    const doRisco = gravadas
      .filter((a) => a && a.risk_id === r?.id && a.status !== 'DESCARTADA')
      .sort(porCriacao);
    const aceitas = doRisco.filter(acaoAceita);
    const escolhidas = aceitas.length > 0 ? aceitas : doRisco.filter((a) => a.status === 'SUGERIDA');

    if (escolhidas.length === 0) {
      const s = sugestaoDoInventario(r);
      linhas.push({
        ...base,
        numero: `${id}.1`,
        tipo: ROTULO_DO_TIPO[s.tipo],
        medida: s.medida,
        hierarquia: s.rotulo,
        registro: null,
        aceita: false,
        responsavel: '',
        prazo: '',
        acompanhamento: '',
        afericao: '',
        status: 'Não definida',
        atrasada: false,
        faltas: [FALTA_SEM_ACAO],
        faltasDetalhadas: [{ grupo: 'CRONOGRAMA', texto: FALTA_SEM_ACAO }],
        _risco: i,
        _acao: 0
      });
      return;
    }

    escolhidas.forEach((a, k) => {
      const aceita = acaoAceita(a);
      const detalhadas: FaltaDaAcao[] = aceita
        ? faltasDetalhadasDaAcao(a, { risco: r, prazoDaFaixa })
        : [{ grupo: 'CRONOGRAMA', texto: FALTA_SUGESTAO_NAO_ACEITA }];
      const justificativa = a.hierarchy_justification
        ? ` (${ROTULO_DA_JUSTIFICATIVA[a.hierarchy_justification]})`
        : '';
      linhas.push({
        ...base,
        numero: `${id}.${k + 1}`,
        tipo: ROTULO_DO_TIPO[a.action_type] || 'Introduzir',
        medida: texto(a.measure),
        hierarquia: `${ROTULO_DA_HIERARQUIA[a.hierarchy] || a.hierarchy}${justificativa}`,
        registro: a,
        aceita,
        responsavel: aceita ? texto(a.responsible) : '',
        prazo: aceita && dataValida(a.deadline) ? (a.deadline as string) : '',
        acompanhamento: aceita ? texto(a.monitoring) : '',
        afericao: aceita ? texto(a.measurement) : '',
        status: statusExibido(a, hoje),
        atrasada: aceita && estaAtrasada(a, hoje),
        faltas: detalhadas.map((x) => x.texto),
        faltasDetalhadas: detalhadas,
        _risco: i,
        _acao: k
      });
    });
  });

  return linhas
    .sort((a, b) =>
      (a.classificado?.prioridade ?? 9) - (b.classificado?.prioridade ?? 9)
      || b.expostos - a.expostos
      || a._risco - b._risco
      || a._acao - b._acao)
    .map(({ _risco, _acao, ...acao }) => acao);
}
