/**
 * PDF da proposta comercial.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * A proposta nao podia ser impressa nem exportada: o cliente recebia numero,
 * valor e validade numa mensagem e mais nada. Este gerador monta o documento a
 * partir do registro da proposta, sem acrescentar nada que nao esteja nele.
 *
 * REGRAS
 *
 * 1. Nada inventado. Campo vazio sai omitido ou como "nao informado", nunca com
 *    valor de exemplo. Nenhuma clausula, garantia, prazo ou texto comercial e
 *    escrito aqui: o que o PDF afirma vem dos dados.
 * 2. A condicao de pagamento vem de lib/planoDePagamento.ts (descreverPlano,
 *    cronogramaDoPlano, faltasDoPlano), a mesma regra da clausula 7 do
 *    contrato e das contas a receber do Financeiro. O PDF nao recalcula
 *    parcela nem data: se recalculasse, a proposta poderia dizer uma coisa e o
 *    contrato outra.
 * 3. Plano incompleto, ou que nao soma o total, nao vira cronograma parcial: a
 *    proposta diz que a condicao esta em definicao. Um cronograma pela metade
 *    impresso como "a condicao" seria aceito pelo cliente como combinado.
 * 4. Todo texto passa por paraWinAnsi antes de chegar ao jsPDF. A Helvetica do
 *    jsPDF so desenha WinAnsi; UM caractere de fora (o >= matematico, um
 *    emoji) faz a string inteira sair em UTF-16 e a celula fica ilegivel (veja
 *    o comentario no topo de lib/pdfExportService.ts). O texto digitado pelo
 *    usuario chega aqui com qualquer coisa.
 * 5. Datas: "AAAA-MM-DD" vai direto ao formatDate, sem fuso. Carimbo com hora
 *    (created_at, approved_at, valid_until) e convertido para o dia no
 *    calendario de Brasilia (lib/datas.ts): cortar o ISO em UTC daria o dia
 *    seguinte para o que foi feito entre 21h e 23h59.
 *
 * scripts/verificar-proposta-pdf.mjs gera o PDF e confere cada regra.
 */

import { jsPDF } from 'jspdf';
import type { TextOptionsLight } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CellDef, CellHookData, RowInput, UserOptions } from 'jspdf-autotable';
import type { Client, Organization, Proposal, ProposalItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { dataDoRegistro } from '@/lib/datas';
import { VERSAO_DO_DOCUMENTO } from '@/lib/versaoDoDocumento';
import {
  ROTULO_DA_FORMA,
  cronogramaDoPlano,
  descreverPlano,
  faltasDoPlano,
  planoInformado
} from '@/lib/planoDePagamento';

export interface DadosDaPropostaParaPdf {
  proposal: Proposal;
  client?: Client | null;
  organization?: Organization | null;
}

export type AcaoDoPdfDaProposta = 'baixar' | 'imprimir';

// ---------------------------------------------------------------------------
// Textos fixos (so WinAnsi)
// ---------------------------------------------------------------------------

export const SEM_PLANO_DE_PAGAMENTO = 'Condição de pagamento não definida nesta proposta.';
export const PLANO_EM_DEFINICAO = 'Condição de pagamento em definição.';
const NAO_INFORMADO = 'não informado';
const NAO_INFORMADA = 'não informada';

/**
 * Situacoes que encerram a proposta. Saem no cabecalho para que o PDF de uma
 * proposta recusada, expirada ou cancelada nao circule como se valesse.
 */
const SITUACAO_ENCERRADA: Partial<Record<string, string>> = {
  REJECTED: 'Recusada',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada'
};

// Medidas em milimetros. O rodape ocupa os ultimos 12 mm da pagina; o
// conteudo para 20 mm antes do fim para nao encostar nele.
const MARGEM = 14;
const TOPO_DAS_PAGINAS_SEGUINTES = 16;
const MARGEM_INFERIOR = 20;

type Cor = [number, number, number];
const COR_ESCURA: Cor = [15, 23, 42];
const COR_SECAO: Cor = [30, 41, 59];
const COR_COLUNAS: Cor = [51, 65, 85];
const COR_DESTAQUE: Cor = [79, 70, 229];
const COR_CINZA: Cor = [100, 116, 139];
const COR_CINZA_CLARO: Cor = [148, 163, 184];
const COR_FUNDO_TOTAL: Cor = [241, 245, 249];
const BRANCO: Cor = [255, 255, 255];

// ---------------------------------------------------------------------------
// WinAnsi
// ---------------------------------------------------------------------------

/**
 * Os 27 caracteres acima de U+00FF que a WinAnsi tem (posicoes 0x80 a 0x9F),
 * a mesma tabela que o jsPDF usa na conversao. Do U+0020 ao U+00FF o jsPDF
 * escreve o byte direto; qualquer outro troca a string inteira para UTF-16.
 */
const WINANSI_ACIMA_DO_LATIN1 = new Set<number>([
  0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017d, 0x017e, 0x0192, 0x02c6, 0x02dc,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2020, 0x2021,
  0x2022, 0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122
]);

/**
 * Trocas que preservam o sentido. "Atende >= 20 trabalhadores" diz o mesmo que
 * o usuario digitou; apagar o simbolo mudaria a frase.
 */
const TROCAS: Record<number, string> = {
  0x2264: '<=', 0x2265: '>=', 0x2260: '<>', 0x2248: '~',
  0x2212: '-', 0x2010: '-', 0x2011: '-', 0x2012: '-', 0x2043: '-', 0x2015: '—',
  0x2192: '->', 0x2190: '<-', 0x2194: '<->', 0x21d2: '=>', 0x21d4: '<=>',
  0x2032: "'", 0x2033: '"', 0x201b: "'", 0x201f: '"', 0x02bc: "'", 0x02b9: "'",
  0x2217: '*', 0x2219: '·', 0x22c5: '·', 0x2215: '/', 0x2044: '/', 0x2116: 'Nº',
  0x2028: '\n', 0x2029: '\n'
};

/**
 * Faixas que sao enfeite ou invisiveis: emoji, dingbats, seletores de
 * variacao, o ZWJ que junta emoji compostos. Sem traducao que preserve
 * sentido, saem do texto.
 */
const DESCARTAR: Array<[number, number]> = [
  [0x0300, 0x036f], // acento solto que o NFC nao conseguiu juntar a letra
  [0x200b, 0x200f], // espaco de largura zero, ZWNJ, ZWJ, marcas de direcao
  [0x202a, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
  [0x20d0, 0x20ff], // marcas combinantes de simbolo (tecla do emoji 1)
  [0xfe00, 0xfe0f], // seletores de variacao (emoji colorido)
  [0x2500, 0x259f], // desenho de caixa e blocos
  [0x2600, 0x27bf], // simbolos diversos e dingbats: sol, sinal de conferido, estrela
  [0x2b00, 0x2bff],
  [0x1f000, 0x1faff], // emoji
  [0xe0000, 0xe007f]
];

const cabeNaWinAnsi = (cp: number): boolean =>
  (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || WINANSI_ACIMA_DO_LATIN1.has(cp);

function caractereEmWinAnsi(ch: string): string {
  const cp = ch.codePointAt(0) as number;
  if (ch === '\n') return '\n';
  if (ch === '\t') return ' ';
  if (cabeNaWinAnsi(cp)) return ch;
  if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) return ''; // caractere de controle
  if (TROCAS[cp] !== undefined) return TROCAS[cp];
  if (DESCARTAR.some(([de, ate]) => cp >= de && cp <= ate)) return '';
  // Formas geometricas (quadrado, circulo, losango) sao usadas como marcador
  // de lista: viram o marcador que a WinAnsi tem.
  if (cp >= 0x25a0 && cp <= 0x25ff) return '•';
  // Letra com acento que nao existe pronta no Latin-1 (a com breve, s com
  // virgula), ligadura, espaco especial: a decomposicao de compatibilidade
  // devolve a forma basica.
  const basica = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  if (basica && [...basica].every((c) => cabeNaWinAnsi(c.codePointAt(0) as number))) return basica;
  // O que sobra (outro alfabeto, simbolo sem equivalente) vira "?": fica
  // visivel que havia algo ali, em vez de sumir calado ou quebrar a celula.
  return '?';
}

/**
 * Texto pronto para a Helvetica do jsPDF: so caracteres WinAnsi, quebras de
 * linha preservadas. Exportada para o verificador testar a troca direto.
 */
export function paraWinAnsi(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).normalize('NFC').replace(/\r\n?/g, '\n');
  let saida = '';
  let descartou = false;
  for (const ch of texto) {
    const convertido = caractereEmWinAnsi(ch);
    if (convertido === '') descartou = true;
    saida += convertido;
  }
  // O emoji entre duas palavras sai e deixa dois espacos onde havia um.
  return descartou ? saida.replace(/ {2,}/g, ' ') : saida;
}

// ---------------------------------------------------------------------------
// Leitura dos dados
// ---------------------------------------------------------------------------

/** Campo de texto como veio, aparado e em WinAnsi; ausente vira ''. */
function textoDe(valor: unknown): string {
  if (typeof valor === 'string') return paraWinAnsi(valor.trim()).trim();
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return '';
}

/**
 * Numero gravado. Ausente ou invalido devolve null - e quem chama escreve "nao
 * informado", nunca R$ 0,00 nem NaN.
 */
function comoNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor.trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function dinheiro(valor: unknown): string {
  const n = comoNumero(valor);
  return n === null ? NAO_INFORMADO : formatCurrency(n);
}

function numeroLegivel(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/**
 * Data do documento como dd/mm/aaaa, ou '' se nao houver data utilizavel.
 * "AAAA-MM-DD" e dia de calendario e vai direto ao formatDate. Carimbo com hora
 * e convertido para o dia em Brasilia: o aceite as 22h30 de 05/10 e gravado
 * 2026-10-06T01:30Z, e o dia do aceite e 05/10.
 */
function dataDoDocumento(valor: unknown): string {
  // A regra e a de lib/datas.ts, a mesma da tela e do contrato: os tres
  // mostravam dias diferentes para o registro feito depois das 21h.
  return dataDoRegistro(valor);
}

/** "Aceita em dd/mm/aaaa", ou a situacao que encerra a proposta, ou ''. */
function situacaoDaProposta(proposta: Proposal): string {
  if (proposta.status === 'APPROVED') {
    const dia = dataDoDocumento(proposta.approved_at);
    return dia ? `Aceita em ${dia}` : 'Aceita (data do aceite não registrada)';
  }
  return SITUACAO_ENCERRADA[String(proposta.status)] || '';
}

/** CNPJ, CPF, CAEPF ou CNO: o rotulo segue o documento gravado. */
function rotuloDoDocumento(cliente: Client): string {
  if (cliente.document_type) return cliente.document_type;
  const digitos = String(cliente.document_number || '').replace(/\D/g, '');
  return digitos.length === 11 ? 'CPF' : 'CNPJ';
}

function enderecoDoCliente(cliente: Client): string {
  const rua = [textoDe(cliente.address), textoDe(cliente.neighborhood)].filter(Boolean).join(', ');
  const cidade = [textoDe(cliente.city), textoDe(cliente.state)].filter(Boolean).join('/');
  const cep = textoDe(cliente.zip_code);
  return [rua, cidade, cep ? `CEP ${cep}` : ''].filter(Boolean).join(' - ');
}

const letraDaAlinea = (i: number): string => (i < 26 ? String.fromCharCode(97 + i) : String(i + 1));

// ---------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------

/** doc.text com o texto ja em WinAnsi: nenhuma string chega crua ao jsPDF. */
function escrever(doc: jsPDF, texto: string, x: number, y: number, opcoes?: TextOptionsLight): void {
  doc.text(paraWinAnsi(texto), x, y, opcoes);
}

/**
 * autoTable com as margens do documento e a troca para WinAnsi em toda celula.
 * Os dados ja chegam tratados; o didParseCell e a rede de seguranca para que
 * nenhum caminho esquecido quebre uma celula. Devolve onde a tabela terminou.
 */
function tabela(doc: jsPDF, opcoes: UserOptions): number {
  autoTable(doc, {
    ...opcoes,
    margin: { left: MARGEM, right: MARGEM, top: TOPO_DAS_PAGINAS_SEGUINTES, bottom: MARGEM_INFERIOR },
    didParseCell: (data: CellHookData) => {
      data.cell.text = (data.cell.text || []).map((linha) => paraWinAnsi(linha));
    }
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** Faixa escura com o titulo da secao, ocupando a largura da tabela. */
const tituloDeSecao = (texto: string, colunas: number): CellDef => ({
  content: texto,
  colSpan: colunas,
  styles: { fillColor: COR_SECAO, textColor: BRANCO, fontStyle: 'bold', fontSize: 8 }
});

const rotulo = (texto: string): CellDef => ({ content: texto, styles: { fontStyle: 'bold' } });

/**
 * Linha "Rotulo: valor | Rotulo: valor" so com os pares que tem valor. Par
 * sem valor some: um campo vazio nao vira "-" nem exemplo.
 */
function linhaDePares(pares: Array<[string, string]>): CellDef[] | null {
  const presentes = pares.filter(([, valor]) => valor);
  if (presentes.length === 0) return null;
  if (presentes.length === 1) {
    return [rotulo(presentes[0][0]), { content: presentes[0][1], colSpan: 3 }];
  }
  return [
    rotulo(presentes[0][0]), { content: presentes[0][1] },
    rotulo(presentes[1][0]), { content: presentes[1][1] }
  ];
}

const COLUNAS_DE_PARES: UserOptions['columnStyles'] = {
  0: { cellWidth: 28 },
  1: { cellWidth: 72 },
  2: { cellWidth: 22 },
  3: { cellWidth: 'auto' }
};

/** Quebra de pagina antes de desenhar um bloco que nao pode ficar partido. */
function garantirEspaco(doc: jsPDF, y: number, altura: number): number {
  if (y + altura > doc.internal.pageSize.getHeight() - MARGEM_INFERIOR) {
    doc.addPage();
    return TOPO_DAS_PAGINAS_SEGUINTES + 4;
  }
  return y;
}

function desenharCabecalho(doc: jsPDF, proposta: Proposal, organizacao: Organization | null | undefined): void {
  const largura = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COR_ESCURA);
  doc.rect(0, 0, largura, 28, 'F');

  // Nome de quem emite. Sem organizacao, diz que nao foi informado: um nome
  // padrao no lugar faria o documento parecer emitido por outra empresa.
  const emitente = textoDe(organizacao?.name) || textoDe(organizacao?.legal_name) || 'Emitente não informado';
  doc.setTextColor(...BRANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const linhas = doc.splitTextToSize(emitente, largura - MARGEM * 2 - 62) as string[];
  escrever(doc, linhas.length > 1 ? `${linhas[0].trimEnd()}…` : linhas[0], MARGEM, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COR_CINZA_CLARO);
  escrever(doc, 'PROPOSTA COMERCIAL', MARGEM, 18);

  doc.setTextColor(...BRANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  escrever(doc, textoDe(proposta.proposal_number) || 'Número não informado', largura - MARGEM, 12, { align: 'right' });

  const situacao = situacaoDaProposta(proposta);
  if (situacao) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    escrever(doc, situacao, largura - MARGEM, 18, { align: 'right' });
  }

  doc.setFillColor(...COR_DESTAQUE);
  doc.rect(0, 28, largura, 2, 'F');
}

function tabelaDeIdentificacao(doc: jsPDF, y: number, proposta: Proposal, organizacao: Organization | null | undefined): number {
  const validade = dataDoDocumento(proposta.valid_until);
  const linhas: RowInput[] = [];
  linhas.push(linhaDePares([
    ['Emitente:', textoDe(organizacao?.legal_name) || textoDe(organizacao?.name) || NAO_INFORMADO],
    ['CNPJ:', textoDe(organizacao?.document_number) || NAO_INFORMADO]
  ]) as CellDef[]);
  const contato = linhaDePares([
    ['E-mail:', textoDe(organizacao?.email)],
    ['Telefone:', textoDe(organizacao?.phone)]
  ]);
  if (contato) linhas.push(contato);
  linhas.push(linhaDePares([
    ['Emissão:', dataDoDocumento(proposta.created_at) || NAO_INFORMADA],
    ['Validade:', validade ? `até ${validade}` : NAO_INFORMADA]
  ]) as CellDef[]);

  return tabela(doc, {
    startY: y,
    theme: 'grid',
    head: [[tituloDeSecao('EMITENTE E PROPOSTA', 4)]],
    body: linhas,
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: COLUNAS_DE_PARES
  });
}

function tabelaDoCliente(doc: jsPDF, y: number, cliente: Client | null | undefined): number {
  const linhas: RowInput[] = [];
  if (!cliente) {
    linhas.push([{ content: 'Cliente não informado.', colSpan: 4 }]);
  } else {
    const razao = textoDe(cliente.legal_name);
    const fantasia = textoDe(cliente.trade_name);
    linhas.push(linhaDePares([
      ['Razão social:', razao || 'não informada'],
      [`${rotuloDoDocumento(cliente)}:`, textoDe(cliente.document_number) || NAO_INFORMADO]
    ]) as CellDef[]);
    // Nome fantasia so quando diz algo que a razao social nao diz.
    if (fantasia && fantasia.toLowerCase() !== razao.toLowerCase()) {
      linhas.push(linhaDePares([['Nome fantasia:', fantasia]]) as CellDef[]);
    }
    const endereco = enderecoDoCliente(cliente);
    if (endereco) linhas.push(linhaDePares([['Endereço:', endereco]]) as CellDef[]);
    const contato = linhaDePares([
      ['E-mail:', textoDe(cliente.email)],
      ['Telefone:', textoDe(cliente.phone)]
    ]);
    if (contato) linhas.push(contato);
  }

  return tabela(doc, {
    startY: y,
    theme: 'grid',
    head: [[tituloDeSecao('CLIENTE', 4)]],
    body: linhas,
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: COLUNAS_DE_PARES
  });
}

function tabelaDoObjeto(doc: jsPDF, y: number, proposta: Proposal): number {
  const linhas: RowInput[] = [[rotulo('Título:'), textoDe(proposta.title) || NAO_INFORMADO]];
  const observacoes = textoDe(proposta.description);
  if (observacoes) linhas.push([rotulo('Observações:'), observacoes]);

  return tabela(doc, {
    startY: y,
    theme: 'grid',
    head: [[tituloDeSecao('PROPOSTA', 2)]],
    body: linhas,
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 'auto' } }
  });
}

/** Celula do desconto do item: valor gravado e, se foi em %, o percentual. */
function descontoDoItem(item: ProposalItem): string {
  const valor = comoNumero(item.discount);
  if (valor === null || valor === 0) return '-';
  const percentual = comoNumero(item.discount_value);
  const sufixo = item.discount_type === 'PERCENT' && percentual !== null && percentual > 0
    ? `\n(${numeroLegivel(percentual)}%)`
    : '';
  return `${formatCurrency(valor)}${sufixo}`;
}

function tabelaDeServicos(doc: jsPDF, y: number, proposta: Proposal): number {
  const itens = Array.isArray(proposta.items) ? proposta.items : [];
  const corpo: RowInput[] = itens.length === 0
    ? [[{ content: 'Nenhum serviço registrado nesta proposta.', colSpan: 5 }]]
    : itens.map((item) => {
      const nome = textoDe(item.service_name) || 'Serviço sem nome registrado';
      const descricao = textoDe(item.description);
      const quantidade = comoNumero(item.quantity);
      return [
        descricao ? `${nome}\n${descricao}` : nome,
        // Quantidade ausente sai omitida ("-"): "nao informada" nao cabe na
        // coluna de 14 mm e quebraria no meio da palavra.
        quantidade === null ? '-' : numeroLegivel(quantidade),
        dinheiro(item.unit_price),
        descontoDoItem(item),
        dinheiro(item.total)
      ];
    });

  const direita = { halign: 'right' as const };
  const rodape: RowInput[] = [
    [{ content: 'Subtotal', colSpan: 4, styles: direita }, { content: dinheiro(proposta.subtotal), styles: direita }]
  ];
  // Desconto geral so quando gravado; zero gravado e informacao e sai.
  const desconto = comoNumero(proposta.discount);
  if (desconto !== null) {
    rodape.push([{ content: 'Descontos', colSpan: 4, styles: direita }, { content: formatCurrency(desconto), styles: direita }]);
  }
  rodape.push([
    { content: 'TOTAL', colSpan: 4, styles: { ...direita, fontSize: 9 } },
    { content: dinheiro(proposta.total), styles: { ...direita, fontSize: 9 } }
  ]);

  return tabela(doc, {
    startY: y,
    theme: 'grid',
    head: [
      [tituloDeSecao('SERVIÇOS', 5)],
      ['Serviço', 'Qtd.', 'Valor unitário', 'Desconto', 'Total']
    ],
    body: corpo,
    foot: rodape,
    showFoot: 'lastPage',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: COR_COLUNAS, textColor: BRANCO, fontStyle: 'bold' },
    footStyles: { fillColor: COR_FUNDO_TOTAL, textColor: COR_ESCURA, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 14 },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'right', cellWidth: 28 }
    }
  });
}

/**
 * Condicoes de pagamento. So o plano completo, que soma o total ate o centavo,
 * sai como condicao, com as alineas e o cronograma - os mesmos da clausula 7
 * do contrato. Sem plano ou com plano em aberto, uma frase que diz isso.
 */
function secaoDePagamento(doc: jsPDF, y: number, proposta: Proposal): number {
  const plano = proposta.payment_plan;
  const total = comoNumero(proposta.total);
  const cabecalho: RowInput[] = [[tituloDeSecao('CONDIÇÕES DE PAGAMENTO', 1)]];
  const frase = (texto: string) => tabela(doc, {
    startY: y,
    theme: 'grid',
    head: cabecalho,
    body: [[texto]],
    styles: { fontSize: 8, cellPadding: 2.5 }
  });

  if (!planoInformado(plano)) return frase(SEM_PLANO_DE_PAGAMENTO);

  // Mesma condicao do contrato (clausulaDoPagamento): total positivo e
  // nenhuma falta, o que inclui a soma das parcelas bater com o total.
  const completo = total !== null && total > 0 && faltasDoPlano(plano, total).length === 0;
  const formas = completo ? descreverPlano(plano).map(paraWinAnsi) : [];
  const cronograma = completo ? cronogramaDoPlano(plano) : [];
  if (total === null || !completo || formas.length === 0 || cronograma.length === 0) {
    return frase(PLANO_EM_DEFINICAO);
  }

  const corpo: RowInput[] = [[`Valor total de ${formatCurrency(total)}, pago da seguinte forma:`]];
  formas.forEach((forma, i) => {
    corpo.push([{
      content: `${letraDaAlinea(i)}) ${forma}${i === formas.length - 1 ? '.' : ';'}`,
      styles: { cellPadding: { top: 1, bottom: 1, left: 7, right: 2.5 } }
    }]);
  });
  const observacoes = textoDe(plano.observacoes);
  if (observacoes) corpo.push([`Condição acordada: ${observacoes}`]);

  const fimDasFormas = tabela(doc, {
    startY: y,
    theme: 'plain',
    head: cabecalho,
    body: corpo,
    styles: { fontSize: 8, cellPadding: 2.5 }
  });

  return tabela(doc, {
    startY: fimDasFormas + 2,
    // Cronograma que cabe numa pagina comeca inteiro na proxima, em vez de
    // deixar duas parcelas no pe desta. Um maior que a pagina (mais de ~30
    // linhas de ~6 mm) quebra de qualquer jeito: ai segue onde esta.
    pageBreak: cronograma.length <= 30 ? 'avoid' : 'auto',
    theme: 'grid',
    head: [
      [tituloDeSecao('Cronograma de vencimentos', 5)],
      ['Nº', 'Vencimento', 'Valor', 'Forma', 'Referência']
    ],
    // Cada parcela como cronogramaDoPlano a devolve: numero, vencimento e
    // valor nao sao recalculados aqui.
    body: cronograma.map((p) => [
      String(p.numero),
      formatDate(p.vencimento),
      formatCurrency(p.valor),
      ROTULO_DA_FORMA[p.forma] || String(p.forma),
      paraWinAnsi(p.rotulo)
    ]),
    foot: [[
      { content: 'Total', colSpan: 2 },
      { content: formatCurrency(total), styles: { halign: 'right' } },
      { content: '', colSpan: 2 }
    ]],
    showFoot: 'lastPage',
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: COR_COLUNAS, textColor: BRANCO, fontStyle: 'bold' },
    footStyles: { fillColor: COR_FUNDO_TOTAL, textColor: COR_ESCURA, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'right', cellWidth: 30 },
      3: { cellWidth: 40 },
      4: { cellWidth: 'auto' }
    }
  });
}

function paragrafoDaValidade(doc: jsPDF, yInicial: number, proposta: Proposal): number {
  const y = garantirEspaco(doc, yInicial + 4, 8);
  const validade = dataDoDocumento(proposta.valid_until);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COR_ESCURA);
  escrever(doc, validade ? `Proposta válida até ${validade}.` : 'Validade da proposta não informada.', MARGEM, y);
  return y;
}

/**
 * Aceite em branco, para assinatura no papel. Mesmo com a proposta aceita no
 * sistema o quadro sai vazio: o PDF nao simula uma assinatura que nao foi
 * feita nele.
 */
function blocoDeAceite(doc: jsPDF, yInicial: number, cliente: Client | null | undefined): void {
  const ALTURA_DO_BLOCO = 66;
  let y = garantirEspaco(doc, yInicial + 10, ALTURA_DO_BLOCO);
  const largura = doc.internal.pageSize.getWidth();
  const x = MARGEM;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(x, y - 5, largura - MARGEM, y - 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COR_ESCURA);
  escrever(doc, 'De acordo — CONTRATANTE', x, y);

  const empresa = cliente ? (textoDe(cliente.legal_name) || textoDe(cliente.trade_name)) : '';
  if (empresa) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COR_CINZA);
    const linhas = doc.splitTextToSize(empresa, largura - MARGEM * 2) as string[];
    for (const linha of linhas.slice(0, 2)) {
      y += 4.5;
      escrever(doc, linha, x, y);
    }
  }

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COR_ESCURA);
  doc.setDrawColor(...COR_CINZA);
  const inicioDaLinha = x + 24;
  const campos: Array<[string, number]> = [['Nome:', 112], ['Cargo / CPF:', 112], ['Data:', 40]];
  for (const [campo, comprimento] of campos) {
    escrever(doc, campo, x, y);
    doc.line(inicioDaLinha, y + 0.8, inicioDaLinha + comprimento, y + 0.8);
    y += 10;
  }

  y += 8;
  doc.line(x, y, x + 112, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(...COR_CINZA);
  escrever(doc, 'Assinatura', x, y);
}

/**
 * Rodape de todas as paginas: a mesma logica de applyPageNumbers em
 * lib/pdfExportService.ts, que nao e exportada. O carimbo da versao diz, do
 * PDF na mao, de qual build ele saiu.
 */
function aplicarRodape(doc: jsPDF): void {
  const paginas = doc.getNumberOfPages();
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COR_CINZA_CLARO);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGEM, altura - 12, largura - MARGEM, altura - 12);
    escrever(doc, `PrevSafe – G Monteiro Empreendimentos Ltda  |  ${VERSAO_DO_DOCUMENTO}`, MARGEM, altura - 7);
    escrever(doc, `Página ${i} de ${paginas}`, largura - MARGEM, altura - 7, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Monta o PDF da proposta e o devolve, sem salvar nem abrir nada. E a funcao
 * pura que o verificador testa; exportProposalPdf so decide o destino.
 */
export function montarPdfDaProposta({ proposal, client, organization }: DadosDaPropostaParaPdf): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const numero = textoDe(proposal.proposal_number);
  doc.setProperties({ title: numero ? `Proposta comercial ${numero}` : 'Proposta comercial' });

  desenharCabecalho(doc, proposal, organization);
  let y = tabelaDeIdentificacao(doc, 36, proposal, organization);
  y = tabelaDoCliente(doc, y + 4, client);
  y = tabelaDoObjeto(doc, y + 4, proposal);
  y = tabelaDeServicos(doc, y + 4, proposal);
  y = secaoDePagamento(doc, y + 4, proposal);
  y = paragrafoDaValidade(doc, y + 4, proposal);
  blocoDeAceite(doc, y, client);

  aplicarRodape(doc);
  return doc;
}

/** "proposta-PROP-2026-000123.pdf", sem caractere que o Windows recuse. */
function nomeDoArquivo(proposta: Proposal): string {
  const numero = String(proposta?.proposal_number || '')
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `proposta-${numero || 'sem-numero'}.pdf`;
}

/**
 * Baixa o PDF (padrao) ou o abre numa aba nova pronto para imprimir.
 *
 * Imprimir abre o PDF com autoPrint numa aba: a janela de impressao do
 * navegador abre sozinha. Se o navegador bloquear a aba (window.open devolve
 * null), devolve ok: false com a explicacao, para a tela avisar em vez de o
 * clique nao fazer nada.
 */
export function exportProposalPdf(
  args: DadosDaPropostaParaPdf & { acao?: AcaoDoPdfDaProposta }
): { ok: boolean; mensagem?: string } {
  const acao: AcaoDoPdfDaProposta = args.acao ?? 'baixar';

  let doc: jsPDF;
  try {
    doc = montarPdfDaProposta(args);
  } catch (e) {
    const detalhe = e instanceof Error ? e.message : String(e);
    return { ok: false, mensagem: `Não foi possível montar o PDF da proposta: ${detalhe}` };
  }

  if (acao === 'imprimir') {
    if (typeof window === 'undefined' || typeof window.open !== 'function') {
      return { ok: false, mensagem: 'A impressão só está disponível no navegador.' };
    }
    doc.autoPrint();
    const url = String(doc.output('bloburl'));
    // Sem 'noopener': com ele o window.open devolve null mesmo quando abre, e
    // nao haveria como saber se o pop-up foi bloqueado.
    const janela = window.open(url, '_blank');
    if (!janela) {
      try { URL.revokeObjectURL(url); } catch { /* nada a liberar */ }
      return {
        ok: false,
        mensagem: 'O navegador bloqueou a abertura da aba de impressão. Permita pop-ups para este site e tente de novo, ou baixe o PDF e imprima pelo leitor.'
      };
    }
    // A URL fica viva: revoga-la agora impediria a aba nova de recarregar ou
    // reimprimir o documento. O navegador a libera quando a pagina fecha.
    return { ok: true };
  }

  doc.save(nomeDoArquivo(args.proposal));
  return { ok: true };
}
