/**
 * Identificacao do empregador, versao do esquema e Id dos eventos do eSocial.
 *
 * Uma regra so para todos os montadores de XML do sistema (S-2210, S-2220,
 * S-2230, S-2240 e S-3000). Antes cada montador tinha a sua copia, e todas
 * erravam do mesmo jeito: <ideEmpregador><nrInsc> saia com o CNPJ de 14
 * posicoes e o namespace era o do leiaute S-1.2.
 *
 * FONTES (texto oficial; nada aqui foi escrito de memoria)
 *
 * [LEIAUTE] Leiautes do eSocial versao S-1.3, cons. ate a NT 07/2026 rev.
 *   https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-v-s-1-3-nt-07-2026-rev-24-09-2026/index.html
 * [MOS] Manual de Orientacao do eSocial S-1.3, cons. ate a NO 11/2026.
 *   https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-11-2026-retificada.pdf
 * [XSD] Esquemas XSD do leiaute S-1.3, pacotes publicados em gov.br/esocial
 *   (2026-07-01_esquemas_xsd_v_s_01_03_00.zip, em producao desde 01/07/2026,
 *   e 2026-10-26_esquemas_xsd_v_s_01_03_00-1.zip, producao em 26/10/2026).
 */

import { validarCNPJ, validarCPF } from '@/lib/validacoesBr';
import type { ESocialEventType } from '@/types';

// ---------------------------------------------------------------------------
// Versao do esquema
// ---------------------------------------------------------------------------

/**
 * Versao do esquema dos eventos. Nos dois pacotes XSD do S-1.3 todos os 50
 * eventos declaram targetNamespace terminado em "v_S_01_03_00" (conferido em
 * evtExpRisco.xsd, evtMonit.xsd, evtCAT.xsd, evtAfastTemp.xsd e
 * evtExclusao.xsd). O codigo usava v_S_01_02_00, do leiaute S-1.2, cujo
 * periodo de convivencia acabou: a folha de rosto do [LEIAUTE] diz "Periodo de
 * convivencia de versoes (S-1.2 e S-1.3): 02/12/2024 a 02/02/2025".
 */
export const VERSAO_DO_ESQUEMA_ESOCIAL = 'v_S_01_03_00';

/** Nome curto do leiaute, para texto de tela. */
export const VERSAO_DO_LEIAUTE_ESOCIAL = 'S-1.3';

/**
 * Elemento raiz de cada evento, que tambem da nome ao XSD e ao namespace.
 * [LEIAUTE], primeira linha do registro de cada evento: S-2210 evtCAT,
 * S-2220 evtMonit, S-2230 evtAfastTemp, S-2240 evtExpRisco, S-3000 evtExclusao.
 */
export const ELEMENTO_DO_EVENTO: Record<ESocialEventType, string> = {
  'S-2210': 'evtCAT',
  'S-2220': 'evtMonit',
  'S-2230': 'evtAfastTemp',
  'S-2240': 'evtExpRisco',
  'S-3000': 'evtExclusao',
};

/** xmlns do elemento <eSocial> do evento, igual ao targetNamespace do XSD dele. */
export function namespaceDoEvento(tipo: ESocialEventType): string {
  return `http://www.esocial.gov.br/schema/evt/${ELEMENTO_DO_EVENTO[tipo]}/${VERSAO_DO_ESQUEMA_ESOCIAL}`;
}

// ---------------------------------------------------------------------------
// Natureza juridica
// ---------------------------------------------------------------------------

/**
 * Naturezas juridicas que informam o CNPJ completo em {ideEmpregador/nrInsc}.
 * [LEIAUTE], S-1000, campo nrInsc: "deve ser informada apenas a raiz/base (8
 * posicoes), exceto se a natureza juridica do declarante for igual a 101-5,
 * 104-0, 107-4, 116-3 ou 134-1, situacao em que o campo deve ser preenchido
 * com o CNPJ completo (14 posicoes)". O [MOS], S-1000, item 7.1, traz a mesma
 * lista.
 */
export const NATUREZAS_COM_CNPJ_COMPLETO: readonly string[] = ['101-5', '104-0', '107-4', '116-3', '134-1'];

/**
 * Codigo da natureza juridica no formato "NNN-D", ou '' quando o texto nao
 * traz codigo.
 *
 * O cadastro guarda o que a consulta de CNPJ devolveu (lib/companyLookup.ts),
 * e esse texto pode vir so com a descricao ("Sociedade Empresaria Limitada").
 * Descricao nao vira codigo aqui: sem a tabela oficial ao lado, casar texto
 * seria adivinhar. Aceita "101-5", "101-5 - Orgao Publico..." e "1015".
 */
export function codigoDaNaturezaJuridica(natureza: string | null | undefined): string {
  const texto = String(natureza ?? '').trim();
  if (!texto) return '';
  const comHifen = texto.match(/(?:^|\D)(\d{3})-(\d)(?!\d)/);
  if (comHifen) return `${comHifen[1]}-${comHifen[2]}`;
  const soDigitos = texto.match(/^(\d{3})(\d)(?!\d)/);
  if (soDigitos) return `${soDigitos[1]}-${soDigitos[2]}`;
  return '';
}

// ---------------------------------------------------------------------------
// ideEmpregador
// ---------------------------------------------------------------------------

/** O que a regra precisa do cadastro do cliente (types/index.ts, Client). */
export interface ClienteParaInscricao {
  document_type?: string;
  document_number?: string;
  natureza_juridica?: string;
  caepf?: string;
  cno?: string;
}

export type InscricaoDoEmpregador =
  | {
      ok: true;
      /** Tabela 05: 1 = CNPJ, 2 = CPF. */
      tpInsc: '1' | '2';
      /** Vai em {ideEmpregador/nrInsc} e no Id: raiz (8), CNPJ completo (14) ou CPF (11). */
      nrInsc: string;
      /** CNPJ de 14 posicoes ou CPF, sem mascara, para os campos que pedem o numero inteiro. */
      documentoCompleto: string;
      /** Lacuna que nao impede o evento mas tem de aparecer para o usuario. '' se nao ha. */
      aviso: string;
    }
  | { ok: false; motivo: string };

/** CNPJ sem mascara e em maiuscula: desde 2026 ele pode ter letras (lib/validacoesBr.ts). */
const cnpjSemMascara = (v: string) => v.replace(/[\s./-]/g, '').toUpperCase();

/**
 * <ideEmpregador> de todo evento, a partir do cadastro do cliente.
 *
 * Nos eventos de SST o [LEIAUTE] manda informar {nrInsc} "de acordo com o tipo
 * de inscricao indicado no campo ideEmpregador/tpInsc e conforme informado em
 * S-1000" (S-2210, S-2220, S-2230, S-2240 e S-3000). E no S-1000:
 *
 *   - tpInsc = 1: "deve ser um numero de CNPJ valido. Neste caso, deve ser
 *     informada apenas a raiz/base (8 posicoes), exceto se a natureza juridica
 *     do declarante for igual a 101-5, 104-0, 107-4, 116-3 ou 134-1 (...) CNPJ
 *     completo (14 posicoes)";
 *   - tpInsc = 2: "deve ser um CPF valido".
 *
 * Os valores validos de tpInsc em ideEmpregador sao so 1 (CNPJ) e 2 (CPF).
 * CAEPF e CNO identificam estabelecimento ou obra: o [MOS] (Cap. I, 7.1) manda
 * usar o CAEPF "como estabelecimento vinculado ao seu CPF" e o CNO "como
 * estabelecimento ou lotacao tributaria, vinculados a um CNPJ ou a um CPF".
 * Cliente cadastrado so com CAEPF ou CNO nao tem a inscricao do empregador:
 * o evento nao e gerado. Antes, o CAEPF saia como CNPJ (tpInsc 1) ou cortado
 * em 11 digitos como se fosse CPF.
 *
 * NATUREZA NAO INFORMADA. A excecao dos 14 digitos depende da natureza
 * juridica, e ela pode estar vazia ou sem codigo. Nesse caso sai a raiz, que e
 * a regra geral (o [MOS], Cap. I, 7.1: "O identificador chave {nrInsc} para as
 * pessoas juridicas e o CNPJ-Raiz/Base de oito posicoes, exceto se a natureza
 * juridica for de administracao publica federal"), mas com aviso: a dispensa
 * da excecao nao se presume em silencio.
 */
export function inscricaoDoEmpregador(cliente: ClienteParaInscricao | null | undefined): InscricaoDoEmpregador {
  if (!cliente) {
    return { ok: false, motivo: 'Cliente do evento não encontrado no cadastro. Sem ele não há empregador a identificar.' };
  }

  const tipo = String(cliente.document_type || '').toUpperCase();
  const bruto = String(cliente.document_number || '');

  if (tipo === 'CAEPF' || tipo === 'CNO') {
    return {
      ok: false,
      motivo: `O documento do cliente é ${tipo}, que identifica estabelecimento ou obra, não o empregador. `
        + 'Em <ideEmpregador> o eSocial só aceita CNPJ (tpInsc 1) ou CPF (tpInsc 2): cadastre o CNPJ ou o CPF do empregador.',
    };
  }

  const cnpj = cnpjSemMascara(bruto);
  const cpf = bruto.replace(/\D/g, '');
  const ehCpf = tipo === 'CPF' || (!tipo && /^\d{11}$/.test(cnpj));
  const ehCnpj = tipo === 'CNPJ' || (!tipo && cnpj.length === 14);

  if (ehCpf) {
    if (!validarCPF(cpf)) {
      return { ok: false, motivo: `CPF do empregador (${bruto || 'vazio'}) inválido no cadastro do cliente. O eSocial exige "um CPF válido".` };
    }
    return { ok: true, tpInsc: '2', nrInsc: cpf, documentoCompleto: cpf, aviso: '' };
  }

  if (ehCnpj) {
    if (!validarCNPJ(cnpj)) {
      return { ok: false, motivo: `CNPJ do empregador (${bruto || 'vazio'}) inválido no cadastro do cliente. O eSocial exige "um número de CNPJ válido".` };
    }
    const natureza = codigoDaNaturezaJuridica(cliente.natureza_juridica);
    if (natureza && NATUREZAS_COM_CNPJ_COMPLETO.includes(natureza)) {
      return { ok: true, tpInsc: '1', nrInsc: cnpj, documentoCompleto: cnpj, aviso: '' };
    }
    const aviso = natureza
      ? ''
      : `Natureza jurídica do cliente ${String(cliente.natureza_juridica || '').trim() ? 'sem o código' : 'não informada'}: `
        + 'o nrInsc do empregador saiu com a raiz do CNPJ (8 posições), regra geral do S-1000. '
        + `Se o cliente for das naturezas ${NATUREZAS_COM_CNPJ_COMPLETO.join(', ')} (administração pública federal), `
        + 'o campo leva o CNPJ completo: confira a natureza jurídica no cadastro antes de transmitir.';
    return { ok: true, tpInsc: '1', nrInsc: cnpj.slice(0, 8), documentoCompleto: cnpj, aviso };
  }

  return {
    ok: false,
    motivo: 'Este cliente não possui CNPJ ou CPF válido cadastrado. O evento do eSocial não pode ser gerado sem a identificação do empregador.',
  };
}

/** Texto seguro dentro de um comentario XML, que nao pode conter "--". */
const textoDeComentario = (t: string) => t.replace(/-{2,}/g, '-').replace(/-$/, '');

/**
 * <ideEmpregador> pronto. A lacuna (aviso ou motivo) vai como comentario ao
 * lado do numero, para quem abrir o XML ver o que falta. Sem `recuo`, sai numa
 * linha so (montadores que escrevem o XML inteiro em uma linha).
 */
export function xmlDoIdeEmpregador(insc: InscricaoDoEmpregador, recuo?: string): string {
  const tp = insc.ok ? insc.tpInsc : '';
  const nr = insc.ok ? insc.nrInsc : '';
  const nota = insc.ok === false ? insc.motivo : insc.aviso;
  const comentario = nota ? `<!-- ${textoDeComentario(nota)} -->` : '';
  if (recuo === undefined) {
    return `<ideEmpregador><tpInsc>${tp}</tpInsc><nrInsc>${nr}</nrInsc>${comentario}</ideEmpregador>`;
  }
  const dentro = `${recuo}  `;
  return `${recuo}<ideEmpregador>\n${dentro}<tpInsc>${tp}</tpInsc>\n${dentro}<nrInsc>${nr}</nrInsc>${comentario}\n${recuo}</ideEmpregador>`;
}

// ---------------------------------------------------------------------------
// Ambiente de trabalho do S-2240 ({infoAmb/tpInsc} e {infoAmb/nrInsc})
// ---------------------------------------------------------------------------

export type InscricaoDoAmbiente =
  | { ok: true; tpInsc: '1' | '3' | '4'; nrInsc: string }
  | { ok: false; motivo: string };

/**
 * Inscricao do lugar onde fica o ambiente de trabalho, no grupo [infoAmb] do
 * S-2240. NAO e a regra do ideEmpregador: o [LEIAUTE] define {infoAmb/tpInsc}
 * com "1 - CNPJ, 3 - CAEPF, 4 - CNO" e {infoAmb/nrInsc} com tamanho "12 ou 14",
 * "Numero de inscricao onde esta localizado o ambiente", que com localAmb = 1
 * "deve ser valido e existente na Tabela de Estabelecimentos (S-1005)". O
 * CNPJ aqui e o completo, nunca a raiz.
 *
 * A ordem CAEPF, CNO, CNPJ e a que o montador ja usava; so o numero mudou de
 * fonte. Empregador pessoa fisica sem CAEPF nem CNO fica sem inscricao valida
 * para o ambiente (CPF nao e valor aceito no campo).
 */
export function inscricaoDoAmbiente(cliente: ClienteParaInscricao | null | undefined): InscricaoDoAmbiente {
  if (!cliente) return { ok: false, motivo: 'Cliente do evento não encontrado no cadastro.' };
  const tipo = String(cliente.document_type || '').toUpperCase();
  const digitos = (v: string | undefined) => String(v || '').replace(/\D/g, '');

  const caepf = digitos(cliente.caepf) || (tipo === 'CAEPF' ? digitos(cliente.document_number) : '');
  if (caepf) return { ok: true, tpInsc: '3', nrInsc: caepf };
  const cno = digitos(cliente.cno) || (tipo === 'CNO' ? digitos(cliente.document_number) : '');
  if (cno) return { ok: true, tpInsc: '4', nrInsc: cno };

  const empregador = inscricaoDoEmpregador(cliente);
  if (empregador.ok === false) return { ok: false, motivo: empregador.motivo };
  if (empregador.tpInsc === '1') return { ok: true, tpInsc: '1', nrInsc: empregador.documentoCompleto };
  return {
    ok: false,
    motivo: 'Empregador pessoa física sem CAEPF nem CNO no cadastro: o ambiente do S-2240 ({infoAmb/tpInsc}) só aceita CNPJ, CAEPF ou CNO.',
  };
}

/** {tpInsc} e {nrInsc} do [infoAmb], ou os dois vazios com o motivo ao lado. */
export function xmlDaInscricaoDoAmbiente(insc: InscricaoDoAmbiente, recuo?: string): string {
  const quebra = recuo === undefined ? '' : `\n${recuo}`;
  const inicio = recuo ?? '';
  if (insc.ok === false) return `${inicio}<tpInsc></tpInsc>${quebra}<nrInsc></nrInsc><!-- ${textoDeComentario(insc.motivo)} -->`;
  return `${inicio}<tpInsc>${insc.tpInsc}</tpInsc>${quebra}<nrInsc>${insc.nrInsc}</nrInsc>`;
}

// ---------------------------------------------------------------------------
// Id do evento
// ---------------------------------------------------------------------------

/**
 * Id do evento - REGRA_VALIDA_ID_EVENTO do [LEIAUTE]: "composta por 36
 * caracteres, conforme o que segue: IDTNNNNNNNNNNNNNNAAAAMMDDHHMMSSQQQQQ".
 * T e o tipo de inscricao do empregador (1 CNPJ, 2 CPF). N e "Numero do CNPJ
 * ou CPF do empregador - Completar com zeros a direita. No caso de pessoas
 * juridicas, o CNPJ informado deve conter 8 ou 14 posicoes de acordo com o
 * enquadramento do contribuinte para preenchimento do campo
 * {ideEmpregador/nrInsc} do evento S-1000, completando-se com zeros a
 * direita". Por isso o Id recebe o MESMO nrInsc do <ideEmpregador>: com a raiz,
 * sao 8 posicoes e seis zeros. AAAAMMDDHHMMSS e o instante da geracao; QQQQQ,
 * o sequencial, "completando com zeros a esquerda".
 *
 * O XSD (tipos.xsd, TS_Id) fixa o formato "ID\d{1}[A-Z0-9]{12}\d{21}": letra so
 * nas 12 primeiras posicoes do numero, que e onde o CNPJ alfanumerico as tem.
 * Por isso a limpeza tira mascara e nao letra.
 */
export function idDoEventoESocial(tpInsc: string, nrInsc: string, geradoEm: Date, sequencial: number): string {
  const d2 = (n: number) => String(n).padStart(2, '0');
  return 'ID'
    + String(tpInsc).slice(0, 1)
    + String(nrInsc || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14).padEnd(14, '0')
    + String(geradoEm.getFullYear()).padStart(4, '0') + d2(geradoEm.getMonth() + 1) + d2(geradoEm.getDate())
    + d2(geradoEm.getHours()) + d2(geradoEm.getMinutes()) + d2(geradoEm.getSeconds())
    + String(sequencial).padStart(5, '0').slice(-5);
}
