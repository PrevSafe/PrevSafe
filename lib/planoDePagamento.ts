/**
 * Plano de pagamento da proposta e do contrato.
 *
 * A proposta nao guardava condicao de pagamento nenhuma, e o contrato gerado
 * dela escrevia "em parcelas anuais" na clausula 7 por um valor padrao do
 * codigo - um cliente que pagaria por mes saia com um contrato de parcela
 * anual. E o faturamento do Financeiro lancava o valor TOTAL do contrato a
 * cada mes.
 *
 * Agora a condicao e um registro: partes (entrada no Pix, parcelas fixas no
 * boleto, cartao, parcelas de valor variavel), cada uma com forma, valor e
 * vencimento. Daqui saem o cronograma, as validacoes, o texto da clausula 7
 * (lib/contratoTermos.ts), o PDF da proposta e as contas a receber da
 * assinatura. Uma regra so, para que proposta, contrato e Financeiro digam a
 * mesma coisa.
 *
 * Dinheiro em centavos inteiros: 1.000,00 em 3 parcelas sao 333,33 + 333,33 +
 * 333,34, e a soma bate com o total ate o centavo.
 */

import type {
  Contract,
  FinancialPaymentMethod,
  FinancialTransaction,
  ParteDoPlanoDePagamento,
  PeriodicidadeDasParcelas,
  PlanoDePagamento,
  RecurrenceType
} from '@/types';
import { somarMesesISO, novoId } from '@/lib/datas';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Rotulos
// ---------------------------------------------------------------------------

export const FORMAS_DE_PAGAMENTO: FinancialPaymentMethod[] = ['PIX', 'BOLETO', 'CARTAO_CREDITO', 'TRANSFERENCIA', 'DINHEIRO'];

/** Como a forma aparece numa lista ou num campo. */
export const ROTULO_DA_FORMA: Record<FinancialPaymentMethod, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto bancário',
  CARTAO_CREDITO: 'Cartão de crédito',
  TRANSFERENCIA: 'Transferência bancária',
  DINHEIRO: 'Dinheiro'
};

/** Como a forma entra numa frase: "via Pix", "em dinheiro". */
const MEIO_NA_FRASE: Record<FinancialPaymentMethod, string> = {
  PIX: 'via Pix',
  BOLETO: 'via boleto bancário',
  CARTAO_CREDITO: 'no cartão de crédito',
  TRANSFERENCIA: 'via transferência bancária',
  DINHEIRO: 'em dinheiro'
};

export const PERIODICIDADES: PeriodicidadeDasParcelas[] = ['MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];

export const MESES_DA_PERIODICIDADE: Record<PeriodicidadeDasParcelas, number> = {
  MENSAL: 1, BIMESTRAL: 2, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12
};

export const ROTULO_DA_PERIODICIDADE: Record<PeriodicidadeDasParcelas, string> = {
  MENSAL: 'Mensal', BIMESTRAL: 'Bimestral', TRIMESTRAL: 'Trimestral', SEMESTRAL: 'Semestral', ANUAL: 'Anual'
};

/** "parcelas mensais". */
const PERIODICIDADE_NO_PLURAL: Record<PeriodicidadeDasParcelas, string> = {
  MENSAL: 'mensais', BIMESTRAL: 'bimestrais', TRIMESTRAL: 'trimestrais', SEMESTRAL: 'semestrais', ANUAL: 'anuais'
};

export const ROTULO_DO_TIPO: Record<ParteDoPlanoDePagamento['tipo'], string> = {
  UNICA: 'Pagamento único (entrada ou à vista)',
  FIXAS: 'Parcelas fixas',
  VARIAVEIS: 'Parcelas de valor variável'
};

/** Limite de parcelas de uma parte: acima disso e erro de digitacao. */
export const MAXIMO_DE_PARCELAS = 120;

// ---------------------------------------------------------------------------
// Criacao (sempre vazia)
// ---------------------------------------------------------------------------

/**
 * Parte nova, sem forma, valor nem data: o que nao foi combinado nao pode
 * sair no contrato como se tivesse sido.
 */
export function novaParte(tipo: ParteDoPlanoDePagamento['tipo']): ParteDoPlanoDePagamento {
  if (tipo === 'VARIAVEIS') return { id: novoId('pag'), tipo, parcelas: [{}] };
  return { id: novoId('pag'), tipo };
}

export function planoVazio(): PlanoDePagamento {
  return { partes: [] };
}

/** Plano sem nenhuma parte: o mesmo que nao ter plano. */
export function planoInformado(plano?: PlanoDePagamento | null): plano is PlanoDePagamento {
  return !!plano && Array.isArray(plano.partes) && plano.partes.length > 0;
}

// ---------------------------------------------------------------------------
// Valores e datas
// ---------------------------------------------------------------------------

export const emCentavos = (valor: any): number => {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

export const deCentavos = (centavos: number): number => Math.round(centavos) / 100;

/** Data YYYY-MM-DD que existe no calendario (31/02 nao passa). */
export function dataValida(iso: any): boolean {
  const s = String(iso || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Divide um valor em n parcelas iguais ate o centavo; a sobra da divisao vai
 * para a ultima, e a soma fecha com o total.
 */
export function dividirEmParcelas(totalCentavos: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(totalCentavos)) return [];
  const base = Math.floor(totalCentavos / n);
  const lista = Array.from({ length: n }, () => base);
  lista[n - 1] += totalCentavos - base * n;
  return lista;
}

// ---------------------------------------------------------------------------
// Cronograma
// ---------------------------------------------------------------------------

export interface ParcelaDoCronograma {
  /** Numero da parcela no cronograma inteiro, em ordem de vencimento. */
  numero: number;
  /** Quantas parcelas o cronograma tem. */
  total: number;
  parteId: string;
  /** "Entrada", "Parcela 3/12". */
  rotulo: string;
  forma: FinancialPaymentMethod;
  vencimento: string;
  valor: number;
}

/**
 * As parcelas de uma parte, ou null se a parte estiver incompleta. As fixas
 * vencem a cada N meses CONTADOS DO PRIMEIRO vencimento (31/01, 28/02, 31/03),
 * e nao da parcela anterior, que levaria o dia 31 para 28 para sempre.
 */
export function parcelasDaParte(parte: ParteDoPlanoDePagamento): Array<{ vencimento: string; centavos: number }> | null {
  if (!parte?.forma) return null;
  if (parte.tipo === 'UNICA') {
    const c = emCentavos(parte.valor);
    if (!(c > 0) || !dataValida(parte.vencimento)) return null;
    return [{ vencimento: parte.vencimento as string, centavos: c }];
  }
  if (parte.tipo === 'FIXAS') {
    const c = emCentavos(parte.valor);
    const n = Number(parte.quantidade);
    if (!(c > 0) || !Number.isInteger(n) || n < 1 || n > MAXIMO_DE_PARCELAS) return null;
    if (!dataValida(parte.vencimento) || !parte.periodicidade) return null;
    if (c < n) return null; // menos de um centavo por parcela
    const valores = dividirEmParcelas(c, n);
    const meses = MESES_DA_PERIODICIDADE[parte.periodicidade];
    const lista: Array<{ vencimento: string; centavos: number }> = [];
    for (let i = 0; i < n; i++) {
      const venc = i === 0 ? parte.vencimento as string : somarMesesISO(parte.vencimento as string, i * meses);
      if (!venc) return null;
      lista.push({ vencimento: venc, centavos: valores[i] });
    }
    return lista;
  }
  if (parte.tipo === 'VARIAVEIS') {
    const ps = parte.parcelas || [];
    if (ps.length === 0) return null;
    const lista = ps.map((p) => ({ vencimento: String(p?.vencimento || ''), centavos: emCentavos(p?.valor) }));
    if (lista.some((p) => !(p.centavos > 0) || !dataValida(p.vencimento))) return null;
    return lista;
  }
  return null;
}

/**
 * O cronograma do plano: todas as parcelas das partes completas, em ordem de
 * vencimento (no mesmo dia, na ordem das partes).
 */
export function cronogramaDoPlano(plano?: PlanoDePagamento | null): ParcelaDoCronograma[] {
  if (!planoInformado(plano)) return [];
  const brutas: Array<Omit<ParcelaDoCronograma, 'numero' | 'total'> & { ordem: number }> = [];
  plano.partes.forEach((parte, indiceDaParte) => {
    const ps = parcelasDaParte(parte);
    if (!ps) return;
    ps.forEach((p, i) => {
      const rotulo = ps.length === 1
        ? (parte.descricao?.trim() || (parte.tipo === 'UNICA' ? 'Pagamento único' : 'Parcela única'))
        : `${parte.descricao?.trim() ? `${parte.descricao.trim()} — ` : ''}Parcela ${i + 1}/${ps.length}`;
      brutas.push({
        parteId: parte.id,
        rotulo,
        forma: parte.forma as FinancialPaymentMethod,
        vencimento: p.vencimento,
        valor: deCentavos(p.centavos),
        ordem: indiceDaParte * 1000 + i
      });
    });
  });
  brutas.sort((a, b) => (a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : a.ordem - b.ordem));
  return brutas.map(({ ordem, ...p }, i) => ({ ...p, numero: i + 1, total: brutas.length }));
}

/** Soma das partes completas, em reais. */
export function totalDoPlano(plano?: PlanoDePagamento | null): number {
  return deCentavos(cronogramaDoPlano(plano).reduce((s, p) => s + emCentavos(p.valor), 0));
}

// ---------------------------------------------------------------------------
// Validacao
// ---------------------------------------------------------------------------

const nomeDaParte = (parte: ParteDoPlanoDePagamento, i: number) =>
  `Forma ${i + 1}${parte.forma ? ` (${ROTULO_DA_FORMA[parte.forma]}${parte.descricao?.trim() ? `, ${parte.descricao.trim()}` : ''})` : ''}`;

/**
 * O que falta ou esta errado no plano. Lista vazia = plano completo, cuja soma
 * bate com `total` ate o centavo. Sem plano, a unica falta e a do proprio
 * plano.
 */
export function faltasDoPlano(plano: PlanoDePagamento | null | undefined, total: number): string[] {
  if (!planoInformado(plano)) return ['Inclua ao menos uma forma de pagamento.'];
  const falta: string[] = [];

  plano.partes.forEach((parte, i) => {
    const nome = nomeDaParte(parte, i);
    const itens: string[] = [];
    if (!parte.forma) itens.push('a forma de pagamento');

    if (parte.tipo === 'UNICA') {
      if (!(emCentavos(parte.valor) > 0)) itens.push('o valor');
      if (!dataValida(parte.vencimento)) itens.push('a data de vencimento');
    } else if (parte.tipo === 'FIXAS') {
      const n = Number(parte.quantidade);
      if (!(emCentavos(parte.valor) > 0)) itens.push('o valor somado das parcelas');
      if (!Number.isInteger(n) || n < 1 || n > MAXIMO_DE_PARCELAS) itens.push(`o número de parcelas (1 a ${MAXIMO_DE_PARCELAS})`);
      if (!parte.periodicidade) itens.push('a periodicidade');
      if (!dataValida(parte.vencimento)) itens.push('a data do primeiro vencimento');
      if (parte.forma === 'CARTAO_CREDITO' && parte.periodicidade && parte.periodicidade !== 'MENSAL') {
        itens.push('periodicidade mensal (a operadora do cartão repassa as parcelas mês a mês)');
      }
      const c = emCentavos(parte.valor);
      if (c > 0 && Number.isInteger(n) && n > 0 && c < n) itens.push('um valor que dê ao menos R$ 0,01 por parcela');
    } else if (parte.tipo === 'VARIAVEIS') {
      const ps = parte.parcelas || [];
      if (parte.forma === 'CARTAO_CREDITO') {
        itens.push('parcelas fixas: no cartão de crédito as parcelas são iguais');
      }
      if (ps.length === 0) itens.push('ao menos uma parcela');
      ps.forEach((p, j) => {
        const semValor = !(emCentavos(p?.valor) > 0);
        const semData = !dataValida(p?.vencimento);
        if (semValor || semData) {
          itens.push(`na parcela ${j + 1}, ${[semValor && 'o valor', semData && 'a data de vencimento'].filter(Boolean).join(' e ')}`);
        }
      });
    } else {
      itens.push('o tipo (pagamento único, parcelas fixas ou variáveis)');
    }

    if (itens.length > 0) falta.push(`${nome}: falta ${itens.join('; ')}.`);
  });

  // A soma so e conferida com todas as partes completas: com uma incompleta,
  // a diferenca apontada seria a da parte que falta, e nao um erro de conta.
  if (falta.length === 0) {
    const soma = cronogramaDoPlano(plano).reduce((s, p) => s + emCentavos(p.valor), 0);
    const alvo = emCentavos(total);
    if (soma !== alvo) {
      const dif = deCentavos(Math.abs(alvo - soma));
      falta.push(
        `A soma das formas de pagamento (${formatCurrency(deCentavos(soma))}) é diferente do total ` +
        `(${formatCurrency(deCentavos(alvo))}): ${soma < alvo ? 'faltam' : 'sobram'} ${formatCurrency(dif)}.`
      );
    }
  }
  return falta;
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

const valorDe = (centavos: number) => formatCurrency(deCentavos(centavos));

/**
 * Uma parte em uma frase, para a clausula 7 e o PDF da proposta. Parte
 * incompleta devolve ''.
 */
export function descreverParte(parte: ParteDoPlanoDePagamento): string {
  const ps = parcelasDaParte(parte);
  if (!ps || !parte.forma) return '';
  const meio = MEIO_NA_FRASE[parte.forma];
  const soma = ps.reduce((s, p) => s + p.centavos, 0);
  const rotulo = parte.descricao?.trim();

  if (ps.length === 1) {
    const inicio = rotulo ? `${rotulo.toLowerCase()} de ${valorDe(soma)}` : `${valorDe(soma)} em pagamento único`;
    return `${inicio} ${meio}, com vencimento em ${formatDate(ps[0].vencimento)}`;
  }

  const prefixo = rotulo ? `${rotulo.toLowerCase()}: ` : '';
  const periodo = `de ${formatDate(ps[0].vencimento)} a ${formatDate(ps[ps.length - 1].vencimento)}`;
  if (parte.tipo === 'FIXAS' && parte.periodicidade) {
    const plural = PERIODICIDADE_NO_PLURAL[parte.periodicidade];
    const iguais = ps.every((p) => p.centavos === ps[0].centavos);
    const valores = iguais
      ? `de ${valorDe(ps[0].centavos)}`
      : `(${ps.length - 1} de ${valorDe(ps[0].centavos)} e a última de ${valorDe(ps[ps.length - 1].centavos)})`;
    return `${prefixo}${valorDe(soma)} em ${ps.length} parcelas ${plural} ${valores}, ${meio}, com vencimentos ${periodo}`;
  }
  return `${prefixo}${valorDe(soma)} em ${ps.length} parcelas de valores variáveis, ${meio}, com vencimentos ${periodo}, conforme o cronograma`;
}

/** As partes em frases, na ordem do plano (a), b), c)...). */
export function descreverPlano(plano?: PlanoDePagamento | null): string[] {
  if (!planoInformado(plano)) return [];
  return plano.partes.map(descreverParte).filter(Boolean);
}

/** "1ª parcela — 10/10/2026 — R$ 1.000,00 — Pix (Entrada)". */
export function linhaDoCronograma(p: ParcelaDoCronograma): string {
  return `${p.numero}ª parcela — ${formatDate(p.vencimento)} — ${formatCurrency(p.valor)} — ${ROTULO_DA_FORMA[p.forma]} (${p.rotulo})`;
}

// ---------------------------------------------------------------------------
// Recorrencia do contrato
// ---------------------------------------------------------------------------

const RECORRENCIA_DA_PERIODICIDADE: Record<PeriodicidadeDasParcelas, RecurrenceType> = {
  MENSAL: 'MONTHLY', BIMESTRAL: 'CUSTOM', TRIMESTRAL: 'QUARTERLY', SEMESTRAL: 'SEMIANNUAL', ANUAL: 'ANNUAL'
};

/**
 * A recorrencia que o contrato declara, tirada do plano. Era sempre 'ANNUAL',
 * escrito no codigo. Plano misto (entrada mais parcelas mensais) e mensal se
 * as parcelas recorrentes forem todas mensais.
 */
export function recorrenciaDoPlano(plano?: PlanoDePagamento | null): RecurrenceType | undefined {
  if (!planoInformado(plano)) return undefined;
  const cronograma = cronogramaDoPlano(plano);
  if (cronograma.length === 0) return undefined;
  if (cronograma.length === 1) return 'ONE_TIME';
  const recorrentes = plano.partes.filter((p) => p.tipo === 'FIXAS' && Number(p.quantidade) > 1 && p.periodicidade);
  const tipos = new Set(recorrentes.map((p) => RECORRENCIA_DA_PERIODICIDADE[p.periodicidade as PeriodicidadeDasParcelas]));
  return tipos.size === 1 ? [...tipos][0] : 'CUSTOM';
}

// ---------------------------------------------------------------------------
// Contas a receber
// ---------------------------------------------------------------------------

/**
 * As contas a receber das parcelas do contrato que ainda nao estao no
 * Financeiro. Chave da parcela: contract_id + contract_installment. Chamar de
 * novo nao duplica nada; contrato sem plano nao gera conta nenhuma - o valor
 * total nao e uma parcela.
 */
export function contasAReceberDoContrato(
  contrato: Pick<Contract, 'id' | 'contract_number' | 'title' | 'client_id' | 'payment_plan'>,
  opcoes: { organizationId: string; nomeDoCliente: string; existentes: FinancialTransaction[]; agora?: string }
): FinancialTransaction[] {
  const cronograma = cronogramaDoPlano(contrato.payment_plan);
  if (cronograma.length === 0) return [];
  const lancadas = new Set(
    (opcoes.existentes || [])
      .filter((t) => t.contract_id === contrato.id && typeof t.contract_installment === 'number')
      .map((t) => t.contract_installment)
  );
  const mensal = recorrenciaDoPlano(contrato.payment_plan) === 'MONTHLY';
  const agora = opcoes.agora || new Date().toISOString();

  return cronograma
    .filter((p) => !lancadas.has(p.numero))
    .map((p) => ({
      id: novoId('fin-rec'),
      organization_id: opcoes.organizationId,
      type: 'RECEIVABLE' as const,
      status: 'PENDING' as const,
      title: `${contrato.contract_number} — parcela ${p.numero}/${p.total} (${p.rotulo})`,
      description: `Parcela do contrato ${contrato.contract_number} (${contrato.title}), conforme o cronograma da cláusula 7.`,
      client_id: contrato.client_id,
      client_name: opcoes.nomeDoCliente,
      contract_id: contrato.id,
      contract_installment: p.numero,
      category: mensal ? 'MENSALIDADE_SST' as const : 'OUTRAS_RECEITAS' as const,
      category_name: mensal ? 'Mensalidade de Gestão SST' : 'Outros Serviços SST',
      amount: p.valor,
      discount: 0,
      fine_interest: 0,
      final_amount: p.valor,
      due_date: p.vencimento,
      payment_method: p.forma,
      created_at: agora,
      updated_at: agora
    }));
}
