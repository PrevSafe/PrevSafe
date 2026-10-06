/**
 * XML dos eventos de SST do eSocial: S-2210, S-2230, S-2240 e S-3000.
 *
 * Uma montagem por evento, usada por todo caminho que gera o evento: a
 * pre-visualizacao do contexto (montarEventoESocial), a CAT, o afastamento e o
 * S-2240 por GHE. Antes cada caminho tinha a sua copia, varias escritas numa
 * linha so, e todas erravam: <ideTrabalhador> no lugar de <ideVinculo>, sem
 * <ideEvento>, <fatRisco>/<codFatRis> no lugar de <agNoc>/<codAgNoc>,
 * <dtIniCondic> no lugar de <dtIniCondicao>, <dscAtiv> dentro de [infoAmb], e
 * o S-2230 com um grupo [infoAtestado] (CID, dias, emitente) que o leiaute
 * S-1.3 nao tem.
 *
 * FONTES: as de lib/esocialEmpregador.ts. Cada campo cita
 *   - a ancora do campo no [LEIAUTE] (o id na pagina oficial, por exemplo
 *     2240_infoExpRisco_agNoc_codAgNoc), com a ocorrencia e a condicao de la;
 *   - a linha do [XSD] do pacote v_S_01_03_00 (evtExpRisco.xsd, evtCAT.xsd,
 *     evtAfastTemp.xsd, evtExclusao.xsd e tipos.xsd), que fixa ordem e tipo.
 *
 * A REGRA: nada vai ao XML sem vir do cadastro. Campo obrigatorio sem dado
 * sai vazio, com o motivo em comentario ao lado, e vira PENDENCIA: o evento
 * nao fica pronto para envio enquanto ela existir. Campo opcional sem dado
 * fica fora. Codigo de tabela do eSocial nao e deduzido de texto.
 *
 * ASSINATURA: o XSD exige <ds:Signature> depois do evento (evtExpRisco.xsd:590,
 * evtCAT.xsd:543, evtAfastTemp.xsd:359, evtExclusao.xsd:98). O PrevSafe nao
 * assina nem transmite. O XML sai sem a assinatura e diz isso em comentario;
 * antes saia um bloco <Signature> com DigestValue e SignatureValue de
 * enfeite, que parecia assinatura de verdade.
 */

import {
  ELEMENTO_DO_EVENTO,
  codigoDaNaturezaJuridica,
  namespaceDoEvento,
  xmlDaInscricaoDoAmbiente,
  xmlDoIdeEmpregador,
  type InscricaoDoAmbiente,
  type InscricaoDoEmpregador,
} from '@/lib/esocialEmpregador';
import { validarCPF } from '@/lib/validacoesBr';
import { CODIGO_AUSENCIA_DE_RISCO, codigoExisteNaTabela24, formatoDoCodigoTabela24 } from '@/lib/tabela24';
import { xmlDoEpcEpi } from '@/lib/esocialDados';
import type {
  ESocialAbsenceData,
  ESocialAmbientRiskData,
  ESocialAmbientRiskFactor,
  ESocialCATData,
  ESocialEventType,
  ESocialExclusionData,
} from '@/types';

// ---------------------------------------------------------------------------
// Comum a todos os eventos
// ---------------------------------------------------------------------------

/**
 * {verProc}: "Informar a versao do aplicativo emissor do evento"
 * ([LEIAUTE] 2240_ideEvento_verProc; tipos.xsd TS_verProc, 1 a 20 caracteres).
 * E a versao do package.json. Os montadores mandavam "PrevSafe-v2.6" e
 * "PrevSafe_SST_v1.0", versoes que o sistema nunca teve.
 */
export const VERSAO_DO_APLICATIVO_EMISSOR = 'PrevSafe-1.0.0';

/** O lugar da <ds:Signature> no XML que o PrevSafe gera. */
export const COMENTARIO_SEM_ASSINATURA =
  '<!-- ds:Signature ausente: este XML não está assinado. O PrevSafe não assina nem transmite; '
  + 'quem transmite assina com o certificado digital do empregador. -->';

export interface MontagemDoEvento {
  xml: string;
  /** O que falta para o evento poder ir ao eSocial. Vazio = nada falta. */
  pendencias: string[];
}

export interface CabecalhoDoEvento {
  /** Atributo Id ja calculado (idDoEventoESocial). Vazio quando nao ha empregador. */
  id: string;
  empregador: InscricaoDoEmpregador;
  retificacao?: boolean;
  reciboRetificado?: string;
  /** 'PRODUCAO' ou 'PRODUCAO_RESTRITA' (ESocialEvent.environment). */
  ambiente?: string;
}

export interface TrabalhadorDoEvento {
  cpf: string;
  matricula: string;
}

/** UFs validas em {ufOC}/{uf} (tipos.xsd TS_uf; [LEIAUTE] 2240_infoExpRisco_respReg_ufOC). */
export const UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

/** tipos.xsd TS_nrRecibo: [1]{1}\.\d{1}\.\d{19}, 23 caracteres. */
const RECIBO = /^1\.\d\.\d{19}$/;

const textoXml = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Comentario XML nao pode conter "--" nem terminar em "-". */
const textoDeComentario = (t: string) => t.replace(/-{2,}/g, '-').replace(/-$/, '');

const limpo = (v: unknown): string => String(v ?? '').trim();

/** Data AAAA-MM-DD valida, ou ''. Aceita carimbo ISO e corta no dia. */
export function dataDoLeiaute(v: unknown): string {
  const m = limpo(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
    ? `${m[1]}-${m[2]}-${m[3]}`
    : '';
}

/** Hora HHMM ("HH:MM" ou "HHMM"). `ate` e a maior hora aceita: 23 (TS_hora) ou 99 (TS_hora_99). */
export function horaDoLeiaute(v: unknown, ate = 23): string {
  const m = limpo(v).match(/^(\d{2}):?(\d{2})$/);
  if (!m || Number(m[1]) > ate || Number(m[2]) > 59) return '';
  return `${m[1]}${m[2]}`;
}

function novoMontador(evento: ESocialEventType) {
  const pendencias: string[] = [];
  const falta = (campo: string, motivo: string) => {
    const linha = `${evento} {${campo}}: ${motivo}`;
    if (!pendencias.includes(linha)) pendencias.push(linha);
  };
  /** Campo obrigatorio: o valor ja pronto, ou vazio com o motivo ao lado e a pendencia. */
  const obrigatorio = (recuo: string, tag: string, valor: string, motivo: string): string => {
    if (valor) return `${recuo}<${tag}>${valor}</${tag}>`;
    falta(tag, motivo);
    return `${recuo}<${tag}></${tag}><!-- ${textoDeComentario(motivo)} -->`;
  };
  /** Campo opcional: so sai com valor. */
  const opcional = (recuo: string, tag: string, valor: string): string =>
    valor ? `${recuo}<${tag}>${valor}</${tag}>` : '';
  const comentario = (recuo: string, texto: string) => `${recuo}<!-- ${textoDeComentario(texto)} -->`;
  /**
   * Texto do cadastro, escapado. Nunca e cortado: acima do tamanho do leiaute
   * vira pendencia, porque cortar mudaria o que o empregador declara.
   */
  const texto = (recuo: string, tag: string, valor: string | undefined, max: number, exigido: boolean, seVazio: string): string => {
    const v = limpo(valor);
    if (!v) return exigido ? obrigatorio(recuo, tag, '', seVazio) : '';
    if (v.length > max) return obrigatorio(recuo, tag, '', `texto com ${v.length} caracteres; o leiaute aceita até ${max}`);
    return `${recuo}<${tag}>${textoXml(v)}</${tag}>`;
  };
  return { pendencias, falta, obrigatorio, opcional, comentario, texto };
}
type Montador = ReturnType<typeof novoMontador>;

/**
 * Envelope <eSocial><evtX Id>...</evtX></eSocial>. Namespace e elemento de
 * lib/esocialEmpregador.ts; sem <ds:Signature> (ver o cabecalho deste arquivo).
 */
function envelope(tipo: ESocialEventType, id: string, corpo: string[]): string {
  const elemento = ELEMENTO_DO_EVENTO[tipo];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<eSocial xmlns="${namespaceDoEvento(tipo)}">`,
    `  <${elemento} Id="${id}">`,
    ...corpo.filter(Boolean),
    `  </${elemento}>`,
    `  ${COMENTARIO_SEM_ASSINATURA}`,
    '</eSocial>',
  ].join('\n');
}

/**
 * [ideEvento]. Nos eventos de trabalhador e o tipo T_ideEvento_trab (tipos.xsd:121):
 * indRetif, nrRecibo (0-1), tpAmb, procEmi, verProc. No S-3000 e
 * T_ideEvento_exclusao (tipos.xsd:174), sem indRetif nem nrRecibo. O S-2230
 * e o S-3000 da pre-visualizacao nao tinham indRetif; os montadores de uma
 * linha nao tinham o grupo.
 *
 * {nrRecibo}: "O preenchimento e obrigatorio se indRetif = [2]"
 * ([LEIAUTE] 2240_ideEvento_nrRecibo). {procEmi} 1, "Aplicativo do
 * empregador": o PrevSafe gera o evento em nome do empregador.
 */
function xmlDoIdeEvento(tipo: ESocialEventType, cab: CabecalhoDoEvento, m: Montador): string {
  const r = '    ';
  const d = '      ';
  const linhas = [`${r}<ideEvento>`];
  if (tipo !== 'S-3000') {
    linhas.push(`${d}<indRetif>${cab.retificacao ? '2' : '1'}</indRetif>`);
    if (cab.retificacao) {
      const recibo = limpo(cab.reciboRetificado);
      linhas.push(RECIBO.test(recibo)
        ? `${d}<nrRecibo>${recibo}</nrRecibo>`
        : m.obrigatorio(d, 'nrRecibo', '', recibo
          ? `recibo "${recibo}" fora do formato do eSocial (1.N. e 19 algarismos)`
          : 'retificação sem o número do recibo do evento retificado'));
    }
  }
  const tpAmb = cab.ambiente === 'PRODUCAO' ? '1' : cab.ambiente === 'PRODUCAO_RESTRITA' ? '2' : '';
  linhas.push(m.obrigatorio(d, 'tpAmb', tpAmb, 'ambiente de envio (produção ou produção restrita) não definido'));
  linhas.push(`${d}<procEmi>1</procEmi>`);
  linhas.push(`${d}<verProc>${VERSAO_DO_APLICATIVO_EMISSOR}</verProc>`);
  linhas.push(`${r}</ideEvento>`);
  return linhas.join('\n');
}

/** [ideEmpregador] pela regra de lib/esocialEmpregador.ts; sem inscricao, pendencia. */
function xmlDoEmpregador(cab: CabecalhoDoEvento, m: Montador): string {
  if (cab.empregador.ok === false) m.falta('ideEmpregador', cab.empregador.motivo);
  return xmlDoIdeEmpregador(cab.empregador, '    ');
}

/**
 * [ideVinculo] (T_ideVinculo_sst, tipos.xsd:864; no S-2230, evtAfastTemp.xsd:35):
 * cpfTrab (1), matricula (0-1), codCateg (0-1). [LEIAUTE]
 * 2240_ideVinculo_codCateg: "Informacao obrigatoria e exclusiva se nao houver
 * preenchimento de matricula" - e so para TSVE sem matricula no S-2300. O
 * cadastro nao tem categoria: sem matricula, o evento fica pendente.
 */
function xmlDoIdeVinculo(trab: TrabalhadorDoEvento, m: Montador): string {
  const d = '      ';
  const cpf = limpo(trab.cpf).replace(/\D/g, '');
  const matricula = limpo(trab.matricula);
  return [
    '    <ideVinculo>',
    validarCPF(cpf)
      ? `${d}<cpfTrab>${cpf}</cpfTrab>`
      : m.obrigatorio(d, 'cpfTrab', '', cpf ? `CPF do trabalhador (${cpf}) inválido` : 'CPF do trabalhador não cadastrado'),
    !matricula
      ? m.obrigatorio(d, 'matricula', '', 'matrícula do trabalhador não cadastrada. Sem ela o leiaute pede {codCateg}, '
        + 'que só vale para TSVE sem matrícula no S-2300, e o cadastro não tem a categoria')
      : matricula.length > 30
        ? m.obrigatorio(d, 'matricula', '', `matrícula com ${matricula.length} caracteres; o leiaute aceita até 30`)
        : `${d}<matricula>${textoXml(matricula)}</matricula>`,
    '    </ideVinculo>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// S-2240 - Condicoes Ambientais do Trabalho - Agentes Nocivos
// ---------------------------------------------------------------------------

/**
 * Codigos em que {dscAgNoc} e obrigatorio ([LEIAUTE]
 * 2240_infoExpRisco_agNoc_dscAgNoc): "Preenchimento obrigatorio se codAgNoc =
 * [01.01.001, 01.02.001, ..., 05.01.001]". Sao os codigos genericos ("e seus
 * compostos", "incluidos por decisao judicial"), em que o codigo nao diz qual
 * agente e.
 */
export const CODIGOS_COM_DSCAGNOC_OBRIGATORIA = new Set([
  '01.01.001', '01.02.001', '01.03.001', '01.04.001', '01.05.001', '01.06.001', '01.07.001',
  '01.08.001', '01.09.001', '01.10.001', '01.12.001', '01.13.001', '01.14.001', '01.15.001',
  '01.16.001', '01.17.001', '01.18.001', '05.01.001',
]);

/**
 * {limTol}: "Preenchimento obrigatorio e exclusivo se tpAval = [1] e codAgNoc =
 * [01.18.001, 02.01.014]" ([LEIAUTE] 2240_infoExpRisco_agNoc_limTol; o [MOS],
 * S-2240, item 7.1, repete: "somente pode ser preenchido para os codigos").
 */
export const CODIGOS_COM_LIMTOL = new Set(['01.18.001', '02.01.014']);

/**
 * {unMed}: os 30 valores validos de [LEIAUTE] 2240_infoExpRisco_agNoc_unMed
 * (evtExpRisco.xsd:183, xs:byte de 1 a 30), com o nome e o simbolo que o
 * leiaute escreve. O inventario guarda a unidade em texto livre ("dB(A)"):
 * ela so vira codigo quando bate com um destes nomes ou simbolos. O que nao
 * bate fica pendente - "IBUTG oC" nao e escolhido por aproximacao.
 */
export const UNIDADES_DE_MEDIDA_DO_S2240: ReadonlyArray<{ codigo: string; nome: string; simbolo?: string }> = [
  { codigo: '1', nome: 'dose diária de ruído' },
  { codigo: '2', nome: 'decibel linear', simbolo: 'dB (linear)' },
  { codigo: '3', nome: 'decibel (C)', simbolo: 'dB(C)' },
  { codigo: '4', nome: 'decibel (A)', simbolo: 'dB(A)' },
  { codigo: '5', nome: 'metro por segundo ao quadrado', simbolo: 'm/s2' },
  { codigo: '6', nome: 'metro por segundo elevado a 1,75', simbolo: 'm/s1,75' },
  { codigo: '7', nome: 'parte de vapor ou gás por milhão de partes de ar contaminado', simbolo: 'ppm' },
  { codigo: '8', nome: 'miligrama por metro cúbico de ar', simbolo: 'mg/m3' },
  { codigo: '9', nome: 'fibra por centímetro cúbico', simbolo: 'f/cm3' },
  { codigo: '10', nome: 'grau Celsius', simbolo: 'ºC' },
  { codigo: '11', nome: 'metro por segundo', simbolo: 'm/s' },
  { codigo: '12', nome: 'porcentual', simbolo: '%' },
  { codigo: '13', nome: 'lux', simbolo: 'lx' },
  { codigo: '14', nome: 'unidade formadora de colônias por metro cúbico', simbolo: 'ufc/m3' },
  { codigo: '15', nome: 'dose diária' },
  { codigo: '16', nome: 'dose mensal' },
  { codigo: '17', nome: 'dose trimestral' },
  { codigo: '18', nome: 'dose anual' },
  { codigo: '19', nome: 'watt por metro quadrado', simbolo: 'W/m2' },
  { codigo: '20', nome: 'ampère por metro', simbolo: 'A/m' },
  { codigo: '21', nome: 'militesla', simbolo: 'mT' },
  { codigo: '22', nome: 'microtesla', simbolo: 'μT' },
  { codigo: '23', nome: 'miliampère', simbolo: 'mA' },
  { codigo: '24', nome: 'quilovolt por metro', simbolo: 'kV/m' },
  { codigo: '25', nome: 'volt por metro', simbolo: 'V/m' },
  { codigo: '26', nome: 'joule por metro quadrado', simbolo: 'J/m2' },
  { codigo: '27', nome: 'milijoule por centímetro quadrado', simbolo: 'mJ/cm2' },
  { codigo: '28', nome: 'milisievert', simbolo: 'mSv' },
  { codigo: '29', nome: 'milhão de partículas por decímetro cúbico', simbolo: 'mppdc' },
  { codigo: '30', nome: 'umidade relativa do ar', simbolo: 'UR (%)' },
];

/**
 * Forma comparavel de uma unidade: sem espacos, minuscula, expoente e grau
 * escritos de um jeito so. "dB(A)" e "db (a)" sao a mesma unidade; "mg/m³" e
 * "mg/m3" tambem. Nao e sinonimo: so muda a grafia.
 */
const grafiaDaUnidade = (u: string) => u
  .normalize('NFC')
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/³/g, '3')
  .replace(/²/g, '2')
  .replace(/°/g, 'º')
  .replace(/µ/g, 'μ');

/** Codigo de {unMed} para a unidade gravada, ou '' quando nao bate com o leiaute. */
export function codigoDaUnidadeDeMedida(unidade: string | undefined): string {
  const g = grafiaDaUnidade(limpo(unidade));
  if (!g) return '';
  const achada = UNIDADES_DE_MEDIDA_DO_S2240.find((u) =>
    grafiaDaUnidade(u.nome) === g || (u.simbolo && grafiaDaUnidade(u.simbolo) === g));
  return achada ? achada.codigo : '';
}

/**
 * Numero de {intConc}/{limTol}: decimal com ponto ([MOS] S-2240, item 3.4: "com
 * a utilizacao de ponto para separacao das casas decimais"), ate 10 digitos
 * com 4 decimais e no maximo 999999.9999 (evtExpRisco.xsd:163-166). Le o
 * numero do inicio do texto ("91.4 dB(A)", "85,0"); `resto` e o que vem
 * depois dele.
 */
export function numeroDoLeiaute(v: unknown): { numero: string; resto: string } {
  const m = limpo(v).match(/^(\d+)(?:[.,](\d+))?\s*(.*)$/);
  if (!m) return { numero: '', resto: limpo(v) };
  const inteiro = m[1].replace(/^0+(?=\d)/, '');
  const decimais = (m[2] || '').replace(/0+$/, '');
  if (inteiro.length > 6 || decimais.length > 4) return { numero: '', resto: m[3] };
  return { numero: decimais ? `${inteiro}.${decimais}` : inteiro, resto: m[3] };
}

export interface ResponsavelPeloRegistroAmbiental {
  nome?: string;
  cpf: string;
  /** 1 CRM, 4 CREA, 9 outros ([LEIAUTE] 2240_infoExpRisco_respReg_ideOC). */
  ideOC: string;
  dscOC?: string;
  nrOC?: string;
  ufOC?: string;
}

export interface EntradaDoS2240 {
  cabecalho: CabecalhoDoEvento;
  trabalhador: TrabalhadorDoEvento;
  dados: ESocialAmbientRiskData | undefined;
  ambiente: InscricaoDoAmbiente;
  responsaveis: ResponsavelPeloRegistroAmbiental[];
}

/**
 * [agNoc] (evtExpRisco.xsd:112-493), na ordem do XSD: codAgNoc, dscAgNoc,
 * tpAval, intConc, limTol, unMed, tecMedicao, nrProcJud, epcEpi. O grupo e o
 * proprio agente, de 1 a 999 ocorrencias; nao ha <fatRisco> dentro dele.
 */
function xmlDoAgenteNocivo(f: ESocialAmbientRiskFactor, dtIni: string, m: Montador): string {
  const r = '        ';
  const d = '          ';
  const formato = formatoDoCodigoTabela24(f.risk_code_table_24);
  const codigo = formato.codigo;
  const nome = limpo(f.description) || limpo(f.risk_code_table_24) || 'sem descrição';
  const L = [`${r}<agNoc>`];

  // codAgNoc: "Deve ser um codigo valido e existente na Tabela 24"
  // ([LEIAUTE] 2240_infoExpRisco_agNoc_codAgNoc; XSD \d{2}\.\d{2}\.\d{3}, evtExpRisco.xsd:127).
  L.push(codigo && codigoExisteNaTabela24(codigo)
    ? `${d}<codAgNoc>${codigo}</codAgNoc>`
    : m.obrigatorio(d, 'codAgNoc', '', `agente "${nome}": o código "${limpo(f.risk_code_table_24)}" não consta na Tabela 24`));

  const ausencia = codigo === CODIGO_AUSENCIA_DE_RISCO;

  // dscAgNoc (0-1, 1 a 100): obrigatorio nos codigos genericos; "Nao informar se
  // codAgNoc = [09.01.001] e dtIniCondicao >= [2024-04-22]". Nos demais e
  // opcional e fica fora: o codigo ja identifica o agente.
  if (CODIGOS_COM_DSCAGNOC_OBRIGATORIA.has(codigo)) {
    const dsc = limpo(f.agent_description) || limpo(f.description);
    L.push(!dsc
      ? m.obrigatorio(d, 'dscAgNoc', '', `agente ${codigo}: o leiaute exige a descrição do agente neste código`)
      : dsc.length > 100
        ? m.obrigatorio(d, 'dscAgNoc', '', `agente ${codigo}: a descrição tem ${dsc.length} caracteres e o leiaute aceita até 100`)
        : `${d}<dscAgNoc>${textoXml(dsc)}</dscAgNoc>`);
  }

  if (!ausencia) {
    // tpAval: "Preenchimento obrigatorio e exclusivo se codAgNoc for diferente
    // de [09.01.001]" (1 quantitativo, 2 qualitativo). A pre-visualizacao
    // decidia pela presenca da intensidade: avaliacao quantitativa sem valor
    // medido saia como "qualitativa". Evento antigo sem o tipo, mas com
    // medicao, e quantitativo - so medicao quantitativa produz numero.
    const tipo = f.evaluation_type || (limpo(f.intensity_concentration) ? 'QUANTITATIVA' : '');
    if (!tipo) {
      L.push(m.obrigatorio(d, 'tpAval', '', `agente ${codigo || nome}: tipo de avaliação (quantitativa ou qualitativa) `
        + 'não registrado no evento; gere o evento de novo a partir do inventário'));
    } else if (tipo === 'QUALITATIVA') {
      L.push(`${d}<tpAval>2</tpAval>`);
    } else {
      L.push(`${d}<tpAval>1</tpAval>`);
      // intConc, unMed e tecMedicao: "Preenchimento obrigatorio e exclusivo se tpAval = [1]".
      const medida = numeroDoLeiaute(f.intensity_concentration);
      const unidadeGravada = limpo(f.measurement_unit) || medida.resto;
      const sobra = medida.resto && grafiaDaUnidade(medida.resto) !== grafiaDaUnidade(unidadeGravada);
      L.push(medida.numero && !sobra
        ? `${d}<intConc>${medida.numero}</intConc>`
        : m.obrigatorio(d, 'intConc', '', limpo(f.intensity_concentration)
          ? `agente ${codigo}: a intensidade "${limpo(f.intensity_concentration)}" não é um número do leiaute (até 6 inteiros e 4 decimais)`
          : `agente ${codigo}: avaliação quantitativa sem valor medido`));
      if (CODIGOS_COM_LIMTOL.has(codigo)) {
        const limite = numeroDoLeiaute(f.limit_tolerance).numero;
        L.push(m.obrigatorio(d, 'limTol', limite, `agente ${codigo}: o leiaute exige o limite de tolerância calculado e ele não está registrado como número`));
      }
      const unMed = codigoDaUnidadeDeMedida(unidadeGravada);
      L.push(m.obrigatorio(d, 'unMed', unMed, unidadeGravada
        ? `agente ${codigo}: a unidade "${unidadeGravada}" não é uma das 30 do leiaute`
        : `agente ${codigo}: unidade de medida não registrada`));
      const tecnica = limpo(f.technique_used);
      L.push(!tecnica
        ? m.obrigatorio(d, 'tecMedicao', '', `agente ${codigo}: técnica de medição não registrada`)
        : tecnica.length > 40
          ? m.obrigatorio(d, 'tecMedicao', '', `agente ${codigo}: a técnica de medição tem ${tecnica.length} caracteres e o leiaute aceita até 40`)
          : `${d}<tecMedicao>${textoXml(tecnica)}</tecMedicao>`);
    }
  }

  // nrProcJud: "Informacao obrigatoria e exclusiva se codAgNoc = [05.01.001]. Se
  // dtIniCondicao < [2024-01-22], o preenchimento e opcional". O evento nao
  // guarda o processo.
  if (codigo === '05.01.001' && (!dtIni || dtIni >= '2024-01-22')) {
    L.push(m.obrigatorio(d, 'nrProcJud', '', 'agente 05.01.001: número do processo administrativo ou judicial que incluiu o agente não registrado'));
  }

  // epcEpi: "N (se codAgNoc = [09.01.001]); O (nos demais casos)" ([LEIAUTE],
  // resumo do S-2240) - e o [MOS], S-2240, item 1.5.
  if (!ausencia) {
    const cas = (f.epi_ca_numbers || []).filter((ca) => limpo(ca));
    const epiUtilizado = f.epi_used ?? cas.length > 0;
    L.push(xmlDoEpcEpi({
      // Eventos gravados antes nao tem epc_implemented: ali o epc_effective
      // era o que decidia o utilizEPC.
      epcImplementado: f.epc_implemented ?? f.epc_effective,
      epcEficaz: f.epc_effective,
      epiUtilizado,
      epiEficaz: f.epi_effective,
      cas,
    }, d));
    if (epiUtilizado) {
      // [epi] e [epiCompl]: "O (se utilizEPI = [2])". O inventario guarda tres
      // dos seis requisitos (uso ininterrupto, troca periodica, higienizacao),
      // o evento nao os carrega, e medProtecao, condFuncto e przValid nao
      // existem no cadastro.
      if (cas.length === 0) m.falta('epi/docAval', `agente ${codigo}: EPI utilizado sem CA ou documento de avaliação registrado`);
      m.falta('epiCompl', `agente ${codigo}: com EPI utilizado o leiaute exige os seis requisitos da NR-06 e da NR-09 `
        + '(medProtecao, condFuncto, usoInint, przValid, periodicTroca, higienizacao), que o evento não registra');
      L.push(m.comentario(d, 'epiCompl ausente: os requisitos da NR-06 e da NR-09 do EPI não estão registrados no evento'));
    }
  }

  L.push(`${r}</agNoc>`);
  return L.join('\n');
}

/**
 * [respReg] (evtExpRisco.xsd:494-567; 1 a 99): cpfResp (1), ideOC, dscOC, nrOC,
 * ufOC (0-1). ideOC, nrOC e ufOC: "Preenchimento obrigatorio se codAgNoc for
 * diferente de [09.01.001]"; dscOC: "obrigatorio e exclusivo se ideOC = [9]".
 */
function xmlDosResponsaveis(lista: ResponsavelPeloRegistroAmbiental[], exigeOrgao: boolean, m: Montador): string {
  const r = '      ';
  const d = '        ';
  if (lista.length === 0) {
    m.falta('respReg', 'nenhum responsável pelos registros ambientais atribuído a este cliente (Engenharia SST > Responsabilidade Técnica)');
    return m.comentario(r, 'respReg ausente: nenhum responsável pelos registros ambientais atribuído a este cliente');
  }
  return lista.slice(0, 99).map((p) => {
    const quem = limpo(p.nome) || 'responsável pelos registros ambientais';
    const cpf = limpo(p.cpf).replace(/\D/g, '');
    const ideOC = ['1', '4', '9'].includes(limpo(p.ideOC)) ? limpo(p.ideOC) : '';
    const dscOC = limpo(p.dscOC);
    const nrOC = limpo(p.nrOC);
    const ufOC = limpo(p.ufOC).toUpperCase();
    const L = [`${r}<respReg>`];
    L.push(validarCPF(cpf)
      ? `${d}<cpfResp>${cpf}</cpfResp>`
      : m.obrigatorio(d, 'cpfResp', '', `${quem}: CPF ${cpf ? 'inválido' : 'não cadastrado'}`));
    L.push(ideOC ? `${d}<ideOC>${ideOC}</ideOC>` : exigeOrgao ? m.obrigatorio(d, 'ideOC', '', `${quem}: conselho de classe não cadastrado`) : '');
    if (ideOC === '9') L.push(m.texto(d, 'dscOC', dscOC, 20, true, `${quem}: sigla do conselho não cadastrada`));
    L.push(m.texto(d, 'nrOC', nrOC, 14, exigeOrgao, `${quem}: número do registro no conselho não cadastrado`));
    L.push(UFS.has(ufOC)
      ? `${d}<ufOC>${ufOC}</ufOC>`
      : exigeOrgao || ufOC ? m.obrigatorio(d, 'ufOC', '', `${quem}: UF do registro no conselho ${ufOC ? `"${ufOC}" inválida` : 'não cadastrada'}`) : '');
    L.push(`${r}</respReg>`);
    return L.filter(Boolean).join('\n');
  }).join('\n');
}

/**
 * S-2240 inteiro (evtExpRisco.xsd:11-589): ideEvento, ideEmpregador,
 * ideVinculo, infoExpRisco { dtIniCondicao, dtFimCondicao?, infoAmb, infoAtiv,
 * agNoc+, respReg+, obs? }.
 */
export function montarXmlDoS2240(e: EntradaDoS2240): MontagemDoEvento {
  const m = novoMontador('S-2240');
  const dados = e.dados;
  const r = '      ';
  const d = '        ';
  const dtIni = dataDoLeiaute(dados?.start_date);
  const fatores = dados?.ambient_risks || [];
  const codigos = fatores.map((f) => formatoDoCodigoTabela24(f.risk_code_table_24).codigo);

  const info: string[] = ['    <infoExpRisco>'];
  // dtIniCondicao (1): [LEIAUTE] 2240_infoExpRisco_dtIniCondicao; evtExpRisco.xsd:41.
  info.push(m.obrigatorio(r, 'dtIniCondicao', dtIni, 'data de início da condição ambiental não informada'));
  // dtFimCondicao (0-1): "Preenchimento obrigatorio e exclusivo para trabalhador
  // avulso" ([LEIAUTE] 2240_infoExpRisco_dtFimCondicao). O cadastro nao tem a
  // categoria do trabalhador; mandar a data para um empregado faria o evento
  // ser recusado.
  if (limpo(dados?.end_date)) {
    info.push(m.comentario(r, 'dtFimCondicao omitido: o campo é exclusivo de trabalhador avulso e o cadastro não tem a categoria'));
  }

  // [infoAmb] (1-9): localAmb, dscSetor, tpInsc, nrInsc (evtExpRisco.xsd:53-97).
  // localAmb 1: o nrInsc e o do proprio empregador (inscricaoDoAmbiente). O
  // [MOS], S-2240, item 2.2, reserva o 2 a cessao de mao de obra, que o
  // sistema nao registra.
  const setor = limpo(dados?.work_environment);
  info.push(`${r}<infoAmb>`);
  info.push(`${d}<localAmb>1</localAmb>`);
  info.push(!setor
    ? m.obrigatorio(d, 'dscSetor', '', 'setor (lugar administrativo do trabalhador) não informado')
    : setor.length > 100
      ? m.obrigatorio(d, 'dscSetor', '', `setor com ${setor.length} caracteres; o leiaute aceita até 100`)
      : `${d}<dscSetor>${textoXml(setor)}</dscSetor>`);
  if (e.ambiente.ok === false) m.falta('infoAmb/nrInsc', e.ambiente.motivo);
  info.push(xmlDaInscricaoDoAmbiente(e.ambiente, d));
  info.push(`${r}</infoAmb>`);

  // [infoAtiv] (1) com dscAtivDes (1, 1 a 999) - irmao de [infoAmb], nao filho.
  // O S-2240 por GHE punha <dscAtiv> dentro de [infoAmb].
  const atividades = limpo(dados?.description_activities);
  info.push(`${r}<infoAtiv>`);
  info.push(!atividades
    ? m.obrigatorio(d, 'dscAtivDes', '', 'atividades desempenhadas não descritas')
    : atividades.length > 999
      ? m.obrigatorio(d, 'dscAtivDes', '', `descrição das atividades com ${atividades.length} caracteres; o leiaute aceita até 999`)
      : `${d}<dscAtivDes>${textoXml(atividades)}</dscAtivDes>`);
  info.push(`${r}</infoAtiv>`);

  // [agNoc] (1-999). "Nao e possivel informar nenhum outro codigo de agente
  // nocivo quando houver o codigo [09.01.001]".
  if (fatores.length === 0) {
    m.falta('agNoc', 'nenhum agente nocivo no evento, nem o código 09.01.001 (ausência de agente nocivo)');
    info.push(m.comentario(r, 'agNoc ausente: nenhum agente nocivo no evento'));
  }
  if (codigos.includes(CODIGO_AUSENCIA_DE_RISCO) && codigos.some((c) => c !== CODIGO_AUSENCIA_DE_RISCO)) {
    m.falta('codAgNoc', 'o código 09.01.001 (ausência de agente nocivo) não pode vir junto de outro agente');
  }
  fatores.slice(0, 999).forEach((f) => info.push(xmlDoAgenteNocivo(f, dtIni, m)));

  const exigeOrgao = codigos.some((c) => c !== CODIGO_AUSENCIA_DE_RISCO);
  info.push(xmlDosResponsaveis(e.responsaveis || [], exigeOrgao, m));
  info.push('    </infoExpRisco>');

  const xml = envelope('S-2240', e.cabecalho.id, [
    xmlDoIdeEvento('S-2240', e.cabecalho, m),
    xmlDoEmpregador(e.cabecalho, m),
    xmlDoIdeVinculo(e.trabalhador, m),
    info.join('\n'),
  ]);
  return { xml, pendencias: m.pendencias };
}

// ---------------------------------------------------------------------------
// S-2210 - Comunicacao de Acidente de Trabalho
// ---------------------------------------------------------------------------

/**
 * Os campos do S-2210 ja no formato do leiaute (codigo, HHMM, S/N). O que o
 * cadastro nao tem fica undefined e vira pendencia na montagem.
 */
export interface DadosDoS2210 {
  dtAcid?: string;
  tpAcid?: string;
  hrAcid?: string;
  hrsTrabAntesAcid?: string;
  tpCat?: string;
  indCatObito?: string;
  dtObito?: string;
  indComunPolicia?: string;
  codSitGeradora?: string;
  iniciatCAT?: string;
  obsCAT?: string;
  ultDiaTrab?: string;
  houveAfast?: string;
  local: {
    tpLocal?: string;
    dscLocal?: string;
    tpLograd?: string;
    dscLograd?: string;
    nrLograd?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    codMunic?: string;
    uf?: string;
    pais?: string;
    codPostal?: string;
    ideLocalAcid?: { tpInsc: string; nrInsc: string };
  };
  codParteAting?: string;
  lateralidade?: string;
  codAgntCausador?: string;
  atestado: {
    dtAtendimento?: string;
    hrAtendimento?: string;
    indInternacao?: string;
    durTrat?: string;
    indAfast?: string;
    dscLesao?: string;
    dscCompLesao?: string;
    diagProvavel?: string;
    codCID?: string;
    observacao?: string;
    nmEmit?: string;
    ideOC?: string;
    nrOC?: string;
    ufOC?: string;
  };
  nrRecCatOrig?: string;
}

const simNao = (v: unknown): string | undefined => (v === true ? 'S' : v === false ? 'N' : undefined);

/** Codigo antes da descricao ("753030000 - Mao" -> "753030000"), sem pontos. */
const codigoAntesDaDescricao = (v: unknown): string =>
  limpo(v).split(/\s+[-–]\s+/)[0].replace(/[.\s]/g, '');

/** CID-10 sem ponto e sem descricao ("S61.0 - Ferimento" -> "S610"). */
export function cidDoLeiaute(v: unknown): string {
  const c = limpo(v).split(/\s+[-–]\s+|\s+/)[0].replace(/\./g, '').toUpperCase();
  return /^[A-Z]\d{2}[0-9A-Z]?$/.test(c) ? c : '';
}

/**
 * O que o cadastro da CAT tem, no formato do leiaute. Campos que o cadastro
 * nao guarda (situacao geradora, iniciativa, ultimo dia trabalhado,
 * endereco do local, lateralidade, duracao do tratamento, CAT de origem)
 * ficam undefined: nao ha de onde tira-los, e nenhum e escolhido aqui.
 *
 * tpAcid: "1 - Tipico 2 - Doenca 3 - Trajeto" ([LEIAUTE] 2210_cat_tpAcid). O
 * montador de uma linha mandava 2 (doenca) para acidente de TRAJETO.
 * tpLocal: 1 estabelecimento do empregador no Brasil, 3 de terceiros, 4 via
 * publica, 6 embarcacao, 9 outros ([LEIAUTE] 2210_cat_localAcidente_tpLocal).
 * Os montadores mandavam 3 para tudo que nao fosse o estabelecimento.
 */
export function dadosDoS2210DaCat(cat: ESocialCATData | undefined): DadosDoS2210 {
  const c = cat || ({} as Partial<ESocialCATData>);
  const tpAcid = ({ TIPICO: '1', DOENCA_OCUPACIONAL: '2', TRAJETO: '3' } as Record<string, string>)[c.accident_type || ''];
  const tpCat = ({ INICIAL: '1', REABERTURA: '2', COMUNICACAO_OBITO: '3' } as Record<string, string>)[c.cat_type || ''];
  const tpLocal = ({ ESTABELECIMENTO_EMPREGADOR: '1', EMPRESA_TERCEIRA: '3', VIA_PUBLICA: '4', EMBARCACAO: '6', OUTROS: '9' } as Record<string, string>)[c.location_type || ''];
  // Houve afastamento: o que o registro afirma; dias de afastamento > 0 tambem
  // afirmam. Zero dias e o valor inicial do formulario e nao afirma nada.
  const afastou = typeof c.caused_absence === 'boolean'
    ? simNao(c.caused_absence)
    : Number(c.days_away) > 0 ? 'S' : undefined;
  const crm = limpo(c.medical_crm).replace(/\D/g, '');
  return {
    dtAcid: limpo(c.accident_date) || undefined,
    tpAcid,
    hrAcid: limpo(c.accident_time) || undefined,
    hrsTrabAntesAcid: limpo(c.hours_worked_before_accident) || undefined,
    tpCat,
    indCatObito: simNao(c.death_occurred),
    dtObito: limpo(c.death_date) || undefined,
    indComunPolicia: simNao(c.police_report),
    houveAfast: afastou,
    local: { tpLocal, dscLocal: limpo(c.location_description) || undefined },
    codParteAting: codigoAntesDaDescricao(c.body_part) || undefined,
    codAgntCausador: codigoAntesDaDescricao(c.accident_agent) || undefined,
    atestado: {
      dtAtendimento: limpo(c.medical_care_date) || undefined,
      hrAtendimento: limpo(c.medical_care_time) || undefined,
      indInternacao: c.treatment_type === 'INTERNACAO' ? 'S' : c.treatment_type === 'AMBULATORIAL' ? 'N' : undefined,
      indAfast: afastou,
      dscLesao: codigoAntesDaDescricao(c.nature_lesion_code) || undefined,
      codCID: limpo(c.cid_code) || undefined,
      nmEmit: limpo(c.medical_cert_issuer) || undefined,
      // O campo do cadastro e o CRM: o emitente e medico (ideOC 1).
      ideOC: crm ? '1' : undefined,
      nrOC: crm || undefined,
      ufOC: limpo(c.medical_uf).toUpperCase() || undefined,
    },
  };
}

export interface EntradaDoS2210 {
  cabecalho: CabecalhoDoEvento;
  trabalhador: TrabalhadorDoEvento;
  cat: DadosDoS2210;
}

/**
 * S-2210 inteiro (evtCAT.xsd:11-541): ideEvento, ideEmpregador, ideVinculo,
 * cat { dtAcid, tpAcid, hrAcid?, hrsTrabAntesAcid?, tpCat, indCatObito,
 * dtObito?, indComunPolicia, codSitGeradora, iniciatCAT, obsCAT?,
 * ultDiaTrab?, houveAfast?, localAcidente, parteAtingida, agenteCausador,
 * atestado, catOrigem? }. A pre-visualizacao tinha <indMorte> no lugar de
 * {indCatObito}, <qtdDiasAfast> (campo que o S-2210 nao tem) e
 * <diagProvavel><codCID> - diagProvavel e texto, irmao de codCID.
 */
export function montarXmlDoS2210(e: EntradaDoS2210): MontagemDoEvento {
  const m = novoMontador('S-2210');
  const c = e.cat;
  const a = c.atestado || {};
  const l = c.local || {};
  const r = '      ';
  const d = '        ';
  const L: string[] = ['    <cat>'];

  const dtAcid = dataDoLeiaute(c.dtAcid);
  L.push(m.obrigatorio(r, 'dtAcid', dtAcid, 'data do acidente não informada'));
  const tpAcid = ['1', '2', '3'].includes(limpo(c.tpAcid)) ? limpo(c.tpAcid) : '';
  L.push(m.obrigatorio(r, 'tpAcid', tpAcid, 'tipo do acidente (típico, doença ou trajeto) não informado'));

  // hrAcid: "obrigatorio se tpAcid = [1] ou se (tpAcid = [3] e dtAcid >=
  // [2022-01-26]). Nao informar se tpAcid = [2]". hrsTrabAntesAcid: idem, com
  // [2022-07-20] ([LEIAUTE] 2210_cat_hrAcid e 2210_cat_hrsTrabAntesAcid).
  const hrAcid = horaDoLeiaute(c.hrAcid, 23);
  const hrsAntes = horaDoLeiaute(c.hrsTrabAntesAcid, 99);
  if (tpAcid !== '2') {
    const exigeHora = tpAcid === '1' || (tpAcid === '3' && (!dtAcid || dtAcid >= '2022-01-26'));
    const exigeHoras = tpAcid === '1' || (tpAcid === '3' && (!dtAcid || dtAcid >= '2022-07-20'));
    L.push(exigeHora || !tpAcid
      ? m.obrigatorio(r, 'hrAcid', hrAcid, limpo(c.hrAcid) ? `hora do acidente "${limpo(c.hrAcid)}" fora do formato HHMM` : 'hora do acidente não informada')
      : m.opcional(r, 'hrAcid', hrAcid));
    L.push(exigeHoras || !tpAcid
      ? m.obrigatorio(r, 'hrsTrabAntesAcid', hrsAntes, limpo(c.hrsTrabAntesAcid) ? `horas trabalhadas antes do acidente "${limpo(c.hrsTrabAntesAcid)}" fora do formato HHMM` : 'horas trabalhadas antes do acidente não informadas')
      : m.opcional(r, 'hrsTrabAntesAcid', hrsAntes));
  }

  const tpCat = ['1', '2', '3'].includes(limpo(c.tpCat)) ? limpo(c.tpCat) : '';
  L.push(m.obrigatorio(r, 'tpCat', tpCat, 'tipo da CAT (inicial, reabertura ou óbito) não informado'));
  // indCatObito: "Se o tpCat for igual a [3], o campo devera sempre ser
  // preenchido com [S]. Se o tpCat for igual a [2], ... com [N]".
  const obito = ['S', 'N'].includes(limpo(c.indCatObito)) ? limpo(c.indCatObito) : '';
  L.push(m.obrigatorio(r, 'indCatObito', obito, 'não informado se houve óbito'));
  if ((tpCat === '3' && obito === 'N') || (tpCat === '2' && obito === 'S')) {
    m.falta('indCatObito', tpCat === '3' ? 'CAT de óbito com "não houve óbito"' : 'CAT de reabertura com "houve óbito"');
  }
  // dtObito: "Preenchimento obrigatorio e exclusivo se indCatObito = [S]".
  if (obito === 'S') L.push(m.obrigatorio(r, 'dtObito', dataDoLeiaute(c.dtObito), 'data do óbito não informada'));
  const policia = ['S', 'N'].includes(limpo(c.indComunPolicia)) ? limpo(c.indComunPolicia) : '';
  L.push(m.obrigatorio(r, 'indComunPolicia', policia, 'não informado se houve comunicação à autoridade policial'));
  // codSitGeradora (Tabela 15, 9 algarismos) e iniciatCAT (1 empregador, 2
  // ordem judicial, 3 orgao fiscalizador): ocorrencia 1, nenhum dos dois no cadastro.
  const sit = limpo(c.codSitGeradora);
  L.push(m.obrigatorio(r, 'codSitGeradora', /^\d{9}$/.test(sit) ? sit : '', 'situação geradora do acidente (Tabela 15) não registrada na CAT'));
  const iniciativa = ['1', '2', '3'].includes(limpo(c.iniciatCAT)) ? limpo(c.iniciatCAT) : '';
  L.push(m.obrigatorio(r, 'iniciatCAT', iniciativa, 'iniciativa da CAT (empregador, ordem judicial ou órgão fiscalizador) não registrada'));
  L.push(m.texto(r, 'obsCAT', c.obsCAT, 999, false, ''));
  // ultDiaTrab e houveAfast: "Preenchimento obrigatorio se dtAcid >= [2023-01-16]".
  const exigeAfast = !dtAcid || dtAcid >= '2023-01-16';
  const ultDia = dataDoLeiaute(c.ultDiaTrab);
  L.push(exigeAfast ? m.obrigatorio(r, 'ultDiaTrab', ultDia, 'último dia trabalhado não registrado na CAT') : m.opcional(r, 'ultDiaTrab', ultDia));
  const houveAfast = ['S', 'N'].includes(limpo(c.houveAfast)) ? limpo(c.houveAfast) : '';
  L.push(exigeAfast ? m.obrigatorio(r, 'houveAfast', houveAfast, 'não informado se houve afastamento') : m.opcional(r, 'houveAfast', houveAfast));

  // [localAcidente] (evtCAT.xsd:182-302).
  const tpLocal = ['1', '2', '3', '4', '5', '6', '9'].includes(limpo(l.tpLocal)) ? limpo(l.tpLocal) : '';
  L.push(`${r}<localAcidente>`);
  L.push(m.obrigatorio(d, 'tpLocal', tpLocal, 'tipo do local do acidente não informado'));
  L.push(m.texto(d, 'dscLocal', l.dscLocal, 255, false, ''));
  L.push(m.texto(d, 'tpLograd', l.tpLograd, 4, false, ''));
  L.push(m.texto(d, 'dscLograd', l.dscLograd, 100, true, 'logradouro do local do acidente não registrado na CAT'));
  L.push(m.texto(d, 'nrLograd', l.nrLograd, 10, true, 'número do logradouro do local do acidente não registrado na CAT ("S/N" quando não houver)'));
  L.push(m.texto(d, 'complemento', l.complemento, 30, false, ''));
  L.push(m.texto(d, 'bairro', l.bairro, 90, false, ''));
  // cep: "obrigatorio se tpLocal = [1, 3, 5]. Nao preencher se tpLocal = [2]";
  // codMunic e uf: "obrigatorio se tpLocal = [1, 3, 4, 5]. Nao preencher se
  // tpLocal = [2]"; pais e codPostal: "obrigatorio se tpLocal = [2]. Nao
  // preencher nos demais casos".
  const cep = limpo(l.cep).replace(/\D/g, '');
  const codMunic = limpo(l.codMunic).replace(/\D/g, '');
  const uf = limpo(l.uf).toUpperCase();
  if (tpLocal !== '2') {
    const cepOk = /^\d{8}$/.test(cep) ? cep : '';
    L.push(['1', '3', '5'].includes(tpLocal) || !tpLocal
      ? m.obrigatorio(d, 'cep', cepOk, 'CEP do local do acidente não registrado na CAT')
      : m.opcional(d, 'cep', cepOk));
    const munOk = /^\d{7}$/.test(codMunic) ? codMunic : '';
    const ufOk = UFS.has(uf) ? uf : '';
    const exigeMun = ['1', '3', '4', '5'].includes(tpLocal) || !tpLocal;
    L.push(exigeMun ? m.obrigatorio(d, 'codMunic', munOk, 'município do local do acidente (código IBGE) não registrado na CAT') : m.opcional(d, 'codMunic', munOk));
    L.push(exigeMun ? m.obrigatorio(d, 'uf', ufOk, 'UF do local do acidente não registrada na CAT') : m.opcional(d, 'uf', ufOk));
  } else {
    L.push(m.obrigatorio(d, 'pais', /^\d{3}$/.test(limpo(l.pais)) ? limpo(l.pais) : '', 'país do local do acidente (Tabela 06) não registrado'));
    L.push(limpo(l.codPostal).length >= 4
      ? m.texto(d, 'codPostal', l.codPostal, 12, true, '')
      : m.obrigatorio(d, 'codPostal', '', 'código postal (4 a 12 caracteres) do local do acidente no exterior não registrado'));
  }
  // [ideLocalAcid]: "O ((se ideEmpregador/tpInsc = [1] e tpLocal = [1, 3])
  // ...)" (resumo do S-2210). tpInsc 1, 3 ou 4; nrInsc de 12 ou 14 posicoes.
  // O estabelecimento do acidente nao e presumido: pode ser filial ou obra.
  const exigeLocal = e.cabecalho.empregador.ok && e.cabecalho.empregador.tpInsc === '1' && ['1', '3'].includes(tpLocal);
  const ideLocal = l.ideLocalAcid;
  if (ideLocal && ['1', '3', '4'].includes(limpo(ideLocal.tpInsc)) && /^(\d{12}|[A-Z0-9]{12}\d{2})$/.test(limpo(ideLocal.nrInsc))) {
    L.push(`${d}<ideLocalAcid>`, `${d}  <tpInsc>${limpo(ideLocal.tpInsc)}</tpInsc>`, `${d}  <nrInsc>${limpo(ideLocal.nrInsc)}</nrInsc>`, `${d}</ideLocalAcid>`);
  } else if (exigeLocal) {
    m.falta('ideLocalAcid', 'inscrição (CNPJ, CAEPF ou CNO) do estabelecimento onde ocorreu o acidente não registrada na CAT');
    L.push(m.comentario(d, 'ideLocalAcid ausente: estabelecimento do acidente não registrado'));
  }
  L.push(`${r}</localAcidente>`);

  // [parteAtingida]: codParteAting (Tabela 13, 9 algarismos) e lateralidade (0 a 3).
  const parte = limpo(c.codParteAting);
  L.push(`${r}<parteAtingida>`);
  L.push(m.obrigatorio(d, 'codParteAting', /^\d{9}$/.test(parte) ? parte : '', parte ? `parte atingida "${parte}" não é um código da Tabela 13 (9 algarismos)` : 'parte do corpo atingida (Tabela 13) não informada'));
  L.push(m.obrigatorio(d, 'lateralidade', ['0', '1', '2', '3'].includes(limpo(c.lateralidade)) ? limpo(c.lateralidade) : '', 'lateralidade da parte atingida não registrada na CAT'));
  L.push(`${r}</parteAtingida>`);

  // [agenteCausador]: codAgntCausador (Tabela 14 ou 15, 9 algarismos).
  const agente = limpo(c.codAgntCausador);
  L.push(`${r}<agenteCausador>`);
  L.push(m.obrigatorio(d, 'codAgntCausador', /^\d{9}$/.test(agente) ? agente : '', agente ? `agente causador "${agente}" não é um código da Tabela 14 (9 algarismos)` : 'agente causador (Tabela 14) não informado'));
  L.push(`${r}</agenteCausador>`);

  // [atestado] (evtCAT.xsd:376-514).
  const i = '          ';
  L.push(`${r}<atestado>`);
  const dtAtend = dataDoLeiaute(a.dtAtendimento);
  L.push(m.obrigatorio(d, 'dtAtendimento', dtAtend, 'data do atendimento médico não informada'));
  const hrAtend = horaDoLeiaute(a.hrAtendimento, 23);
  L.push(m.obrigatorio(d, 'hrAtendimento', hrAtend, 'hora do atendimento médico não informada'));
  L.push(m.obrigatorio(d, 'indInternacao', ['S', 'N'].includes(limpo(a.indInternacao)) ? limpo(a.indInternacao) : '', 'não informado se houve internação'));
  L.push(m.obrigatorio(d, 'durTrat', /^\d{1,4}$/.test(limpo(a.durTrat)) ? limpo(a.durTrat) : '', 'duração estimada do tratamento, em dias, não registrada na CAT'));
  // indAfast: "Se o campo indCatObito for igual a [S], o campo deve sempre ser preenchido com [N]".
  const indAfast = ['S', 'N'].includes(limpo(a.indAfast)) ? limpo(a.indAfast) : '';
  L.push(m.obrigatorio(d, 'indAfast', indAfast, 'não informado se houve afastamento durante o tratamento'));
  if (obito === 'S' && indAfast === 'S') m.falta('indAfast', 'CAT com óbito exige indAfast = N');
  const lesao = limpo(a.dscLesao);
  L.push(m.obrigatorio(d, 'dscLesao', /^\d{9}$/.test(lesao) ? lesao : '', lesao ? `natureza da lesão "${lesao}" não é um código da Tabela 17 (9 algarismos)` : 'natureza da lesão (Tabela 17) não registrada na CAT'));
  L.push(m.texto(d, 'dscCompLesao', a.dscCompLesao, 200, false, ''));
  L.push(m.texto(d, 'diagProvavel', a.diagProvavel, 100, false, ''));
  const cid = cidDoLeiaute(a.codCID);
  L.push(m.obrigatorio(d, 'codCID', cid, limpo(a.codCID) ? `CID "${limpo(a.codCID)}" fora do formato da CID-10` : 'CID do diagnóstico não informado'));
  L.push(m.texto(d, 'observacao', a.observacao, 255, false, ''));
  // [emitente]: nmEmit (2 a 70), ideOC (1 CRM, 2 CRO, 3 RMS), nrOC (1 a 14),
  // ufOC: "Preenchimento obrigatorio se ideOC = [1, 2]".
  const nmEmit = limpo(a.nmEmit);
  const ideOC = ['1', '2', '3'].includes(limpo(a.ideOC)) ? limpo(a.ideOC) : '';
  const nrOC = limpo(a.nrOC);
  const ufOC = limpo(a.ufOC).toUpperCase();
  L.push(`${d}<emitente>`);
  L.push(nmEmit.length === 1
    ? m.obrigatorio(i, 'nmEmit', '', 'nome do emitente do atestado com 1 caractere; o leiaute pede de 2 a 70')
    : m.texto(i, 'nmEmit', nmEmit, 70, true, 'nome do médico ou dentista que emitiu o atestado não informado'));
  L.push(m.obrigatorio(i, 'ideOC', ideOC, 'conselho do emitente do atestado não informado'));
  L.push(m.texto(i, 'nrOC', nrOC, 14, true, 'número do registro do emitente do atestado não informado'));
  if (ideOC !== '3') L.push(m.obrigatorio(i, 'ufOC', UFS.has(ufOC) ? ufOC : '', 'UF do registro do emitente do atestado não informada'));
  L.push(`${d}</emitente>`);
  L.push(`${r}</atestado>`);

  // [catOrigem]: "O (se tpCat for igual a [2, 3])" (resumo do S-2210).
  if (tpCat === '2' || tpCat === '3') {
    const orig = limpo(c.nrRecCatOrig);
    L.push(`${r}<catOrigem>`);
    L.push(m.obrigatorio(d, 'nrRecCatOrig', RECIBO.test(orig) ? orig : '', 'recibo da CAT anterior (reabertura ou óbito) não registrado'));
    L.push(`${r}</catOrigem>`);
  }
  L.push('    </cat>');

  const xml = envelope('S-2210', e.cabecalho.id, [
    xmlDoIdeEvento('S-2210', e.cabecalho, m),
    xmlDoEmpregador(e.cabecalho, m),
    xmlDoIdeVinculo(e.trabalhador, m),
    L.filter(Boolean).join('\n'),
  ]);
  return { xml, pendencias: m.pendencias };
}

// ---------------------------------------------------------------------------
// S-2230 - Afastamento Temporario
// ---------------------------------------------------------------------------

export interface DadosDoS2230 {
  dtIniAfast?: string;
  codMotAfast?: string;
  infoMesmoMtv?: string;
  tpAcidTransito?: string;
  observacao?: string;
  dtTermAfast?: string;
}

/**
 * O que o cadastro do afastamento tem, no formato do leiaute.
 *
 * O S-2230 do leiaute S-1.3 nao tem CID, dias de afastamento nem emitente
 * do atestado ([LEIAUTE] 2230_*; evtAfastTemp.xsd:59-354): o grupo
 * [infoAtestado] que os montadores escreviam nao existe mais. Esses dados
 * ficam no PrevSafe e nao vao ao eSocial - o CID, alem de tudo, e dado de
 * saude. A pre-visualizacao ainda inventava o que faltava: inicio em
 * 2026-08-15, motivo 01, CID M54.5, 5 dias, "Dr. Ortopedista", CRM 77890/SP.
 *
 * tpAcidTransito (1 atropelamento, 2 colisao, 3 outros) nao sai: o cadastro so
 * diz se foi acidente de transito, nao qual - e o campo e opcional.
 * dtTermAfast nao sai: end_date e a previsao de retorno; o termino real e
 * informado em outro S-2230, quando o trabalhador volta.
 */
export function dadosDoS2230DoAfastamento(abs: ESocialAbsenceData | undefined): DadosDoS2230 {
  const motivo = limpo(abs?.reason_code_table_18).match(/^\d{2}(?!\d)/);
  return {
    dtIniAfast: limpo(abs?.start_date) || undefined,
    codMotAfast: motivo ? motivo[0] : limpo(abs?.reason_code_table_18) || undefined,
    observacao: limpo(abs?.observation) || undefined,
  };
}

export interface EntradaDoS2230 {
  cabecalho: CabecalhoDoEvento;
  trabalhador: TrabalhadorDoEvento;
  afastamento: DadosDoS2230;
  /** Natureza juridica do empregador (cadastro do cliente), para os motivos 14 e 22. */
  naturezaJuridica?: string;
  /** Ha outro afastamento do mesmo trabalhador, pelo mesmo motivo, nos 60 dias anteriores. */
  afastamentoAnteriorNoMesmoMotivo?: boolean;
}

/**
 * S-2230 (evtAfastTemp.xsd:11-358): ideEvento, ideEmpregador, ideVinculo,
 * infoAfastamento { iniAfastamento { dtIniAfast, codMotAfast, infoMesmoMtv?,
 * tpAcidTransito?, observacao?, perAquis?, infoCessao?, infoMandSind?,
 * infoMandElet? }, infoRetif?, fimAfastamento? }.
 */
export function montarXmlDoS2230(e: EntradaDoS2230): MontagemDoEvento {
  const m = novoMontador('S-2230');
  const a = e.afastamento;
  const r = '      ';
  const d = '        ';
  const L: string[] = ['    <infoAfastamento>', `${r}<iniAfastamento>`];
  const dtIni = dataDoLeiaute(a.dtIniAfast);
  L.push(m.obrigatorio(d, 'dtIniAfast', dtIni, 'data de início do afastamento não informada'));
  // codMotAfast: Tabela 18, 2 algarismos (tipos.xsd TS_codMotAfast, \d{2}).
  const motivo = /^\d{2}$/.test(limpo(a.codMotAfast)) ? limpo(a.codMotAfast) : '';
  L.push(m.obrigatorio(d, 'codMotAfast', motivo, limpo(a.codMotAfast)
    ? `motivo "${limpo(a.codMotAfast)}" não é um código da Tabela 18 (2 algarismos)`
    : 'motivo do afastamento (Tabela 18) não informado'));
  // infoMesmoMtv: a partir de [2026-10-26], "obrigatorio e exclusivo se
  // codMotAfast = [01, 03] e se existir para o mesmo contrato do trabalhador
  // outro afastamento anterior dentro do periodo de 60 (sessenta) dias com o
  // mesmo codigo" (evtAfastTemp.xsd do pacote de 26/10/2026, linhas 84-102).
  const mesmo = ['S', 'N'].includes(limpo(a.infoMesmoMtv)) ? limpo(a.infoMesmoMtv) : '';
  if (mesmo && ['01', '03'].includes(motivo)) {
    L.push(`${d}<infoMesmoMtv>${mesmo}</infoMesmoMtv>`);
  } else if (['01', '03'].includes(motivo) && dtIni >= '2026-10-26' && e.afastamentoAnteriorNoMesmoMotivo) {
    L.push(m.obrigatorio(d, 'infoMesmoMtv', '', 'há afastamento anterior pelo mesmo motivo nos últimos 60 dias: informe se decorre da mesma doença'));
  }
  // tpAcidTransito: "Somente pode ser preenchido se codMotAfast = [01, 03]".
  if (['1', '2', '3'].includes(limpo(a.tpAcidTransito)) && ['01', '03'].includes(motivo)) {
    L.push(`${d}<tpAcidTransito>${limpo(a.tpAcidTransito)}</tpAcidTransito>`);
  }
  // observacao: "O preenchimento e obrigatorio se codMotAfast = [21]".
  L.push(m.texto(d, 'observacao', a.observacao, 255, motivo === '21', 'motivo 21 exige a observação que explicita o afastamento'));
  // Grupos que dependem do motivo (resumo do S-2230) e que o cadastro nao guarda.
  const natureza = codigoDaNaturezaJuridica(e.naturezaJuridica);
  if (motivo === '15') m.falta('perAquis', 'férias (motivo 15): o período aquisitivo não está registrado no afastamento');
  if (motivo === '14') {
    m.falta('infoCessao', 'cessão (motivo 14): CNPJ do cessionário e ônus da cessão não registrados');
    if (natureza.startsWith('1')) m.falta('codMotAfast', 'administração pública (natureza 1XX-X) não pode informar o motivo 14');
  }
  if (motivo === '24') m.falta('infoMandSind', 'mandato sindical (motivo 24): CNPJ do sindicato e ônus da remuneração não registrados');
  if (motivo === '22' && (natureza.startsWith('1') || natureza === '201-1' || natureza === '203-8')) {
    m.falta('infoMandElet', 'mandato eletivo (motivo 22) em órgão público: CNPJ do órgão do mandato não registrado');
  }
  L.push(`${r}</iniAfastamento>`);
  // fimAfastamento (0-1): so com o termino real.
  const termino = dataDoLeiaute(a.dtTermAfast);
  if (termino) L.push(`${r}<fimAfastamento>`, `${d}<dtTermAfast>${termino}</dtTermAfast>`, `${r}</fimAfastamento>`);
  L.push('    </infoAfastamento>');

  const xml = envelope('S-2230', e.cabecalho.id, [
    xmlDoIdeEvento('S-2230', e.cabecalho, m),
    xmlDoEmpregador(e.cabecalho, m),
    xmlDoIdeVinculo(e.trabalhador, m),
    L.join('\n'),
  ]);
  return { xml, pendencias: m.pendencias };
}

// ---------------------------------------------------------------------------
// S-3000 - Exclusao de Eventos
// ---------------------------------------------------------------------------

export interface EntradaDoS3000 {
  cabecalho: CabecalhoDoEvento;
  exclusao: ESocialExclusionData | undefined;
  cpfTrabalhador: string;
}

/**
 * S-3000 (evtExclusao.xsd:11-97): ideEvento (sem indRetif), ideEmpregador,
 * infoExclusao { tpEvento, nrRecEvt, ideTrabalhador? }.
 *
 * tpEvento e nrRecEvt tem ocorrencia 1. A pre-visualizacao mandava "S-2240"
 * e o recibo "1.2.202600.0000000000000000000-00" quando nao os sabia -
 * excluiria um evento que ninguem escolheu (e o recibo nem tinha o formato
 * de tipos.xsd TS_nrRecibo).
 *
 * [ideTrabalhador]: "O (se tpEvento corresponder a um dos eventos nao
 * periodicos (S-2190 a S-2420, S-8200 ou S-8299) ou um dos eventos periodicos
 * (S-1200 a S-1210)" ([LEIAUTE], resumo do S-3000).
 */
export function montarXmlDoS3000(e: EntradaDoS3000): MontagemDoEvento {
  const m = novoMontador('S-3000');
  const r = '      ';
  const tipo = limpo(e.exclusao?.target_event_type);
  const tipoOk = /^S-\d{4}$/.test(tipo) ? tipo : '';
  const recibo = limpo(e.exclusao?.target_receipt_number);
  const L: string[] = ['    <infoExclusao>'];
  L.push(m.obrigatorio(r, 'tpEvento', tipoOk, 'tipo do evento a excluir não informado'));
  L.push(m.obrigatorio(r, 'nrRecEvt', RECIBO.test(recibo) ? recibo : '', recibo
    ? `recibo "${recibo}" fora do formato do eSocial (1.N. e 19 algarismos)`
    : 'recibo do evento a excluir não informado'));
  const n = Number(tipoOk.slice(2));
  const exigeTrabalhador = !tipoOk || (n >= 2190 && n <= 2420) || n === 8200 || n === 8299 || (n >= 1200 && n <= 1210);
  if (exigeTrabalhador) {
    const cpf = limpo(e.cpfTrabalhador).replace(/\D/g, '');
    L.push(`${r}<ideTrabalhador>`);
    L.push(validarCPF(cpf)
      ? `${r}  <cpfTrab>${cpf}</cpfTrab>`
      : m.obrigatorio(`${r}  `, 'cpfTrab', '', cpf ? `CPF do trabalhador (${cpf}) inválido` : 'CPF do trabalhador do evento excluído não informado'));
    L.push(`${r}</ideTrabalhador>`);
  }
  L.push('    </infoExclusao>');

  const xml = envelope('S-3000', e.cabecalho.id, [
    xmlDoIdeEvento('S-3000', e.cabecalho, m),
    xmlDoEmpregador(e.cabecalho, m),
    L.join('\n'),
  ]);
  return { xml, pendencias: m.pendencias };
}
