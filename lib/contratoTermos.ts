/**
 * Minuta de contrato de prestacao de servicos de SST.
 *
 * O texto anterior era uma linha unica - "Contrato padrao de assessoria SST em
 * conformidade com as Normas Regulamentadoras do MTE" - que nao define objeto,
 * prazo, preco, responsabilidade tecnica nem limite de responsabilidade. Em
 * assessoria de SST esse ultimo ponto e o que mais importa: a NR-01 poe o dever
 * de implementar as medidas e de responder perante a fiscalizacao no empregador,
 * nao em quem elabora os programas. Sem clausula dizendo isso, a discussao sobra
 * para a contratada.
 *
 * ATENCAO: isto e uma MINUTA PADRAO, ponto de partida para o contrato. Nao
 * substitui revisao juridica. Valores, prazos, indice de reajuste, multa e foro
 * sao decisoes comerciais de quem contrata - por isso ficam interpolados e
 * editaveis, e nao fixos no texto.
 */

import { Client, Contract, Organization, PlanoDePagamento, Proposal } from '@/types';
import { formatCurrency, formatDate } from './utils';
import { dataDoRegistro } from './datas';
import {
  cronogramaDoPlano,
  descreverPlano,
  faltasDoPlano,
  linhaDoCronograma,
  planoInformado
} from './planoDePagamento';

export interface DadosDaMinuta {
  client?: Client | null;
  organization?: Organization | null;
  proposal?: Proposal | null;
  titulo?: string;
  valorTotal?: number;
  inicioVigencia?: string;
  fimVigencia?: string;
  /** Mantido por compatibilidade: a clausula 7 sai do plano, e nao daqui. */
  recorrencia?: Contract['recurrence'];
  /**
   * Plano de pagamento do contrato. Sem ele, vale o da proposta. Era a
   * recorrencia - 'ANNUAL' por padrao - que escrevia "parcelas anuais".
   */
  plano?: PlanoDePagamento | null;
}

const TITULO_DA_CLAUSULA_7 = 'CLÁUSULA 7ª — DO VALOR E DA FORMA DE PAGAMENTO';
const INICIO_DA_CLAUSULA_7 = /CL[ÁA]USULA 7[ªa]/;
const INICIO_DA_CLAUSULA_8 = /CL[ÁA]USULA 8[ªa]/;

/**
 * Clausula 7 inteira, do titulo ao 7.5. Com o plano completo e somando o
 * total, ela traz as formas (alineas) e o cronograma (7.2). Sem plano, ou com
 * plano incompleto, a forma de pagamento fica entre colchetes: lacuna visivel,
 * como as outras da minuta, e nunca uma periodicidade presumida.
 */
export function clausulaDoPagamento(valorTotal: number | undefined, plano?: PlanoDePagamento | null): string {
  const valor = typeof valorTotal === 'number' && valorTotal > 0 ? formatCurrency(valorTotal) : '[valor]';
  const completo = planoInformado(plano)
    && typeof valorTotal === 'number' && valorTotal > 0
    && faltasDoPlano(plano, valorTotal).length === 0;

  let formaECronograma: string;
  if (completo) {
    const partes = descreverPlano(plano);
    const alineas = partes.map((p, i) => `${String.fromCharCode(97 + i)}) ${p}${i === partes.length - 1 ? '.' : ';'}`);
    const obs = plano?.observacoes?.trim();
    formaECronograma =
      `7.1. Valor total de ${valor}, pago da seguinte forma:\n${alineas.join('\n')}` +
      `${obs ? `\nCondição acordada: ${obs}` : ''}\n` +
      `7.2. Cronograma de vencimentos:\n${cronogramaDoPlano(plano).map(linhaDoCronograma).join('\n')}`;
  } else {
    formaECronograma =
      `7.1. Valor total de ${valor}, [forma de pagamento — defina o plano de pagamento na proposta ou no contrato].\n` +
      '7.2. Vencimentos: [cronograma de pagamento].';
  }

  return `${TITULO_DA_CLAUSULA_7}
${formaECronograma}
7.3. Atraso superior a 30 (trinta) dias faculta à CONTRATADA suspender os serviços, mediante aviso prévio de 5 (cinco) dias úteis, sem prejuízo da cobrança.
7.4. Reajuste anual pelo [índice de reajuste — ex.: IPCA/IBGE], ou por outro índice que venha a substituí-lo.
7.5. Serviços não previstos na Cláusula 1ª serão orçados à parte.`;
}

/**
 * Troca so a clausula 7 de uma minuta ja editada, preservando o resto do
 * texto. null quando a minuta nao tem as clausulas 7 e 8 para delimitar o
 * trecho - ai a troca e manual.
 */
export function substituirClausulaDoPagamento(termos: string, novaClausula: string): string | null {
  const texto = String(termos || '');
  const i7 = texto.search(INICIO_DA_CLAUSULA_7);
  if (i7 < 0) return null;
  const resto = texto.slice(i7 + 1);
  const rel8 = resto.search(INICIO_DA_CLAUSULA_8);
  if (rel8 < 0) return null;
  const i8 = i7 + 1 + rel8;
  return `${texto.slice(0, i7)}${novaClausula.trimEnd()}\n\n${texto.slice(i8)}`;
}

/**
 * A clausula 7 da minuta reflete o plano? Devolve o que nao confere: cada
 * parcela (data e valor) e o total tem de estar escritos nela. A assinatura
 * usa isto - o Financeiro lanca as parcelas do plano, e o texto assinado tem
 * de dizer o mesmo.
 */
export function divergenciasDaClausulaDoPagamento(
  termos: string,
  plano: PlanoDePagamento | null | undefined,
  valorTotal: number
): string[] {
  if (!planoInformado(plano)) return [];
  const texto = String(termos || '');
  const i7 = texto.search(INICIO_DA_CLAUSULA_7);
  if (i7 < 0) return ['A minuta não tem a Cláusula 7ª, onde a forma de pagamento é escrita.'];
  const rel8 = texto.slice(i7 + 1).search(INICIO_DA_CLAUSULA_8);
  const trecho = rel8 < 0 ? texto.slice(i7) : texto.slice(i7, i7 + 1 + rel8);

  const problemas: string[] = [];
  if (!trecho.includes(formatCurrency(valorTotal))) {
    problemas.push(`A Cláusula 7ª não traz o valor total de ${formatCurrency(valorTotal)}.`);
  }
  cronogramaDoPlano(plano).forEach((p) => {
    if (!trecho.includes(linhaDoCronograma(p))) {
      problemas.push(`A Cláusula 7ª não traz a ${p.numero}ª parcela do plano (${formatDate(p.vencimento)}, ${formatCurrency(p.valor)}).`);
    }
  });
  return problemas;
}

/** Lista os servicos da proposta aceita, para a clausula do objeto. */
export function resumirServicos(proposal?: Proposal | null): string {
  const itens = proposal?.items || [];
  if (itens.length === 0) return '';

  return itens
    .map((item) => {
      const quantidade = item.quantity > 1 ? ` (${item.quantity}x)` : '';
      const valor = item.total ? ` — ${formatCurrency(item.total)}` : '';
      return `  • ${item.service_name}${quantidade}${valor}`;
    })
    .join('\n');
}

/**
 * Monta a minuta. Tudo o que e conhecido entra preenchido; o que nao for
 * conhecido vira um campo entre colchetes, visivel, para ser completado antes
 * da assinatura. Deixar em branco esconderia a lacuna.
 */
export function montarTermosDoContrato(dados: DadosDaMinuta = {}): string {
  const { client, organization, proposal } = dados;

  const contratada = organization?.legal_name || organization?.name || '[CONTRATADA]';
  const cnpjContratada = organization?.document_number || '[CNPJ da contratada]';
  const contratante = client?.legal_name || client?.trade_name || '[CONTRATANTE]';
  const cnpjContratante = client?.document_number || '[CNPJ do contratante]';

  const valorTotal = typeof dados.valorTotal === 'number' && dados.valorTotal > 0
    ? dados.valorTotal
    : (proposal?.total || undefined);
  const plano = planoInformado(dados.plano) ? dados.plano : (proposal?.payment_plan || null);

  const inicio = dados.inicioVigencia ? formatDate(dados.inicioVigencia) : '[data de início]';
  const fim = dados.fimVigencia ? formatDate(dados.fimVigencia) : '[data de término]';

  const servicos = resumirServicos(proposal);
  const origem = proposal
    ? `A presente contratação decorre da Proposta Comercial ${proposal.proposal_number}` +
      `${proposal.approved_at ? `, aceita pela CONTRATANTE em ${dataDoRegistro(proposal.approved_at)}` : ''}` +
      ', que integra este instrumento para todos os fins.'
    : '';

  const grauDeRisco = client?.risk_degree
    ? `Grau de Risco ${client.risk_degree}`
    : '[grau de risco a informar]';
  const cnae = client?.main_cnae || '[CNAE a informar]';

  const responsavel = organization?.technical_responsible_name
    ? `${organization.technical_responsible_name}` +
      `${organization.technical_responsible_title ? `, ${organization.technical_responsible_title}` : ''}` +
      `${organization.technical_responsible_council ? `, ${organization.technical_responsible_council}` : ''}`
    : '[responsável técnico — informe em Configurações da Empresa]';

  const medico = organization?.pcmso_physician_name
    ? `${organization.pcmso_physician_name}` +
      `${organization.pcmso_physician_crm ? `, ${organization.pcmso_physician_crm}` : ''}`
    : '[médico coordenador do PCMSO — informe em Configurações da Empresa]';

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SEGURANÇA E SAÚDE NO TRABALHO

CONTRATADA: ${contratada}, inscrita no CNPJ sob o nº ${cnpjContratada}.
CONTRATANTE: ${contratante}, inscrita no CNPJ sob o nº ${cnpjContratante}.
${origem ? `\n${origem}\n` : ''}
CLÁUSULA 1ª — DO OBJETO
Prestação de serviços técnicos especializados em Segurança e Saúde no Trabalho, compreendendo a elaboração, a implantação documental e a gestão continuada dos programas e laudos exigidos pelas Normas Regulamentadoras do Ministério do Trabalho e Emprego, observados o CNAE ${cnae} e o ${grauDeRisco} da CONTRATANTE, conforme o Anexo I da NR-04.
${servicos ? `\nServiços contratados:\n${servicos}\n` : ''}
CLÁUSULA 2ª — DA RESPONSABILIDADE TÉCNICA
Os trabalhos serão conduzidos sob responsabilidade técnica de ${responsavel}, com emissão de Anotação de Responsabilidade Técnica (ART) quando exigida pelo conselho profissional. A coordenação do PCMSO cabe a ${medico}, nos termos da NR-07 e das resoluções do Conselho Federal de Medicina.

CLÁUSULA 3ª — DAS OBRIGAÇÕES DA CONTRATADA
3.1. Elaborar os documentos contratados de acordo com as Normas Regulamentadoras vigentes, com base nas informações prestadas e nas condições de trabalho verificadas.
3.2. Realizar as avaliações de campo necessárias, com instrumentos calibrados e metodologia técnica aplicável.
3.3. Entregar os documentos nos prazos das Ordens de Serviço vinculadas a este contrato.
3.4. Orientar a CONTRATANTE quanto às medidas de prevenção e quanto aos prazos legais aplicáveis, inclusive os eventos de SST do eSocial (S-2210, S-2220 e S-2240).
3.5. Manter sigilo sobre toda informação a que tiver acesso, na forma da Cláusula 8ª.

CLÁUSULA 4ª — DAS OBRIGAÇÕES DA CONTRATANTE
4.1. Fornecer, em tempo hábil, dados cadastrais dos trabalhadores, relação de funções, setores, jornada e histórico de afastamentos.
4.2. Permitir o acesso dos profissionais da CONTRATADA aos locais de trabalho, inclusive para avaliações ambientais.
4.3. Comunicar previamente alterações de layout, processo produtivo, maquinário ou quadro funcional que afetem os documentos vigentes.
4.4. Custear exames ocupacionais, Equipamentos de Proteção Individual e as medidas de controle indicadas, que não estão incluídos no valor deste contrato salvo previsão expressa.
4.5. Implementar as medidas de prevenção recomendadas nos documentos entregues.

CLÁUSULA 5ª — DOS LIMITES DA RESPONSABILIDADE
5.1. A CONTRATADA responde pela qualidade técnica dos documentos que elabora.
5.2. A obrigação de implementar as medidas de prevenção e de manter o ambiente de trabalho em conformidade é do empregador, nos termos da NR-01 e do art. 157 da CLT, permanecendo com a CONTRATANTE perante a fiscalização do trabalho e perante terceiros.
5.3. A CONTRATADA não responde por dados incorretos ou incompletos informados pela CONTRATANTE, nem por consequências da não implementação das medidas recomendadas.

CLÁUSULA 6ª — DO PRAZO E DA VIGÊNCIA
Vigência de ${inicio} a ${fim}, renovável mediante termo aditivo. Documentos com validade legal própria — PGR, PCMSO, LTCAT, laudos de insalubridade e periculosidade — observam os prazos das respectivas Normas Regulamentadoras, independentemente da vigência deste contrato.

${clausulaDoPagamento(valorTotal, plano)}

CLÁUSULA 8ª — DA CONFIDENCIALIDADE E DA PROTEÇÃO DE DADOS (LGPD)
8.1. As partes obrigam-se a manter sigilo sobre as informações trocadas, durante a vigência e após o seu término.
8.2. No tratamento de dados pessoais, a CONTRATANTE atua como controladora e a CONTRATADA como operadora, nos termos da Lei nº 13.709/2018, limitando-se a CONTRATADA a tratar os dados para a execução deste contrato.
8.3. Dados de saúde são dados pessoais sensíveis. Prontuários e resultados de exames ocupacionais são protegidos por sigilo médico, cabendo seu acesso ao médico coordenador do PCMSO, e não serão compartilhados com a CONTRATANTE além do que consta do Atestado de Saúde Ocupacional.
8.4. Encerrado o contrato, a CONTRATADA manterá os documentos pelos prazos legais de guarda — 20 (vinte) anos para os registros do PCMSO, na forma da NR-07.

CLÁUSULA 9ª — DA PROPRIEDADE DOS DOCUMENTOS
Os documentos entregues e pagos são de propriedade da CONTRATANTE, que poderá apresentá-los à fiscalização, ao sindicato e ao Poder Judiciário. A metodologia, os modelos e as ferramentas da CONTRATADA permanecem de sua titularidade.

CLÁUSULA 10ª — DA RESCISÃO
10.1. Rescisão imotivada por qualquer das partes mediante aviso prévio de 30 (trinta) dias.
10.2. Rescisão imediata por descumprimento de cláusula, não sanado em 15 (quinze) dias após notificação.
10.3. A rescisão não afasta o pagamento dos serviços já executados.

CLÁUSULA 11ª — DAS PENALIDADES
Descumprimento de obrigação contratual sujeita a parte infratora à multa de [percentual — ex.: 10%] sobre o valor do contrato, sem prejuízo das perdas e danos.

CLÁUSULA 12ª — DO FORO
Fica eleito o foro da comarca de ${client?.city || '[comarca]'}${client?.state ? `/${client.state}` : ''}, com renúncia a qualquer outro.

---
MINUTA PADRÃO. Revise com assessoria jurídica antes da assinatura e preencha os campos entre colchetes. Índice de reajuste, percentual de multa, cronograma de pagamento e foro são decisões comerciais desta contratação.`;
}

/** Usado quando nao ha cliente nem proposta: a minuta em branco, com lacunas visiveis. */
export const TERMOS_PADRAO_EM_BRANCO = montarTermosDoContrato();
