/**
 * Tabela 24 do eSocial - Agentes Nocivos e Atividades - Aposentadoria Especial.
 *
 * O QUE ESTA TABELA E, E O QUE ELA NAO E
 *
 * Ela lista os agentes do Anexo IV do Decreto 3.048/1999 - os que dao direito
 * a APOSENTADORIA ESPECIAL. Nao e um catalogo geral de riscos ocupacionais.
 *
 * Essa distincao muda o modelo do sistema. Risco ergonomico e risco de
 * acidente (queda em altura, maquina sem protecao, eletricidade, espaco
 * confinado) entram no inventario do PGR pela NR-01, mas NAO TEM CODIGO AQUI,
 * porque nao ensejam aposentadoria especial. Frio e radiacao nao-ionizante
 * tambem nao constam. Um risco do PGR sem codigo da Tabela 24 e a situacao
 * NORMAL, nao um cadastro incompleto.
 *
 * OS GRUPOS NAO SAO OS DO PGR
 *
 *   01 = QUIMICOS        (nao fisicos)
 *   02 = FISICOS         (nao quimicos)
 *   03 = BIOLOGICOS
 *   04 = ASSOCIACAO de agentes fisicos, quimicos e biologicos (mineracao)
 *   05 = OUTROS agentes, incluidos por decisao judicial ou administrativa
 *   09 = AUSENCIA de agente nocivo
 *
 * Nao ha grupo ergonomico nem de acidentes. A versao anterior deste arquivo
 * trazia um mapa de grupos escrito de memoria, com 01 como "Fisico", 02 como
 * "Quimico", 04 como "Ergonomico" e 05 como "Acidentes" - os quatro errados.
 * Esse mapa foi substituido pelos grupos do PDF.
 *
 * FONTE
 *
 * Transcricao integral da Tabela 24 publicada pelo eSocial, conferida linha a
 * linha contra o PDF. 92 agentes. Os nomes sao os da publicacao: onde ela traz
 * "tranques de esgoto" ou "3-poxipro-pano", o texto fica como esta la, porque
 * e a denominacao publicada que vale perante o governo.
 *
 * A numeracao oficial tem buracos (01.19.020 e 01.19.037 nao existem). Eles
 * continuam buracos aqui - preenche-los seria inventar agente.
 *
 * NAO EDITE A MAO. Regenere a partir da fonte oficial.
 */

export interface AgenteTabela24 {
  nome: string;
  /** Grupo do PDF: QUIMICOS, FISICOS, BIOLOGICOS, ASSOCIACAO..., OUTROS, AUSENCIA... */
  grupo: string;
  /** Subtitulo dentro do grupo (RUIDO, VIBRACOES, RADIACOES IONIZANTES...). */
  subgrupo: string;
}

/** Os 92 agentes da Tabela 24, indexados pelo codigo. */
export const TABELA_24: Record<string, AgenteTabela24> = {
  '01.01.001': { nome: 'Arsênio e seus compostos', grupo: 'QUÍMICOS', subgrupo: 'ARSÊNIO E SEUS COMPOSTOS' },
  '01.02.001': { nome: 'Asbestos (ou amianto)', grupo: 'QUÍMICOS', subgrupo: 'ASBESTOS' },
  '01.03.001': { nome: 'Benzeno e seus compostos tóxicos (exceto os abaixo especificados, que constam expressamente no Anexo IV do Decreto 3.048/1999)', grupo: 'QUÍMICOS', subgrupo: 'BENZENO E SEUS COMPOSTOS TÓXICOS' },
  '01.03.002': { nome: 'Estireno (vinilbenzeno)', grupo: 'QUÍMICOS', subgrupo: 'BENZENO E SEUS COMPOSTOS TÓXICOS' },
  '01.04.001': { nome: 'Berílio e seus compostos tóxicos', grupo: 'QUÍMICOS', subgrupo: 'BERÍLIO E SEUS COMPOSTOS TÓXICOS' },
  '01.05.001': { nome: 'Bromo e seus compostos tóxicos', grupo: 'QUÍMICOS', subgrupo: 'BROMO E SEUS COMPOSTOS TÓXICOS' },
  '01.06.001': { nome: 'Cádmio e seus compostos tóxicos', grupo: 'QUÍMICOS', subgrupo: 'CÁDMIO E SEUS COMPOSTOS TÓXICOS' },
  '01.07.001': { nome: 'Carvão mineral e seus derivados', grupo: 'QUÍMICOS', subgrupo: 'CARVÃO MINERAL E SEUS DERIVADOS' },
  '01.08.001': { nome: 'Chumbo e seus compostos tóxicos', grupo: 'QUÍMICOS', subgrupo: 'CHUMBO E SEUS COMPOSTOS TÓXICOS' },
  '01.09.001': { nome: 'Cloro e seus compostos tóxicos (exceto os abaixo especificados, que constam expressamente no Anexo IV do Decreto 3.048/1999)', grupo: 'QUÍMICOS', subgrupo: 'CLORO E SEUS COMPOSTOS TÓXICOS' },
  '01.09.002': { nome: 'Metileno-ortocloroanilina, MOCA® (4,4\'-metileno-bis-(2-cloroanilina), MBOCA®)', grupo: 'QUÍMICOS', subgrupo: 'CLORO E SEUS COMPOSTOS TÓXICOS' },
  '01.09.003': { nome: 'Bis (cloro metil) éter, clorometileter, (éter bis (clorometílico) ou éter metílico de clorometila), bisclorometil', grupo: 'QUÍMICOS', subgrupo: 'CLORO E SEUS COMPOSTOS TÓXICOS' },
  '01.09.004': { nome: 'Biscloroetileter (éter dicloroetílico)', grupo: 'QUÍMICOS', subgrupo: 'CLORO E SEUS COMPOSTOS TÓXICOS' },
  '01.09.005': { nome: 'Clorambucil (cloroambucil)', grupo: 'QUÍMICOS', subgrupo: 'CLORO E SEUS COMPOSTOS TÓXICOS' },
  '01.09.006': { nome: 'Cloropreno', grupo: 'QUÍMICOS', subgrupo: 'CLORO E SEUS COMPOSTOS TÓXICOS' },
  '01.10.001': { nome: 'Cromo e seus compostos tóxicos', grupo: 'QUÍMICOS', subgrupo: 'CROMO E SEUS COMPOSTOS TÓXICOS' },
  '01.11.001': { nome: 'Dissulfeto de carbono', grupo: 'QUÍMICOS', subgrupo: 'DISSULFETO DE CARBONO' },
  '01.12.001': { nome: 'Fósforo e seus compostos tóxicos', grupo: 'QUÍMICOS', subgrupo: 'FÓSFORO E SEUS COMPOSTOS TÓXICOS' },
  '01.13.001': { nome: 'Iodo', grupo: 'QUÍMICOS', subgrupo: 'IODO' },
  '01.14.001': { nome: 'Manganês e seus compostos', grupo: 'QUÍMICOS', subgrupo: 'MANGANÊS E SEUS COMPOSTOS' },
  '01.15.001': { nome: 'Mercúrio e seus compostos', grupo: 'QUÍMICOS', subgrupo: 'MERCÚRIO E SEUS COMPOSTOS' },
  '01.16.001': { nome: 'Níquel e seus compostos tóxicos', grupo: 'QUÍMICOS', subgrupo: 'NÍQUEL E SEUS COMPOSTOS TÓXICOS' },
  '01.17.001': { nome: 'Petróleo, xisto betuminoso, gás natural e seus derivados', grupo: 'QUÍMICOS', subgrupo: 'PETRÓLEO, XISTO BETUMINOSO, GÁS NATURAL E SEUS DERIVADOS' },
  '01.18.001': { nome: 'Sílica livre', grupo: 'QUÍMICOS', subgrupo: 'SÍLICA LIVRE' },
  '01.19.001': { nome: 'Butadieno-estireno', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.002': { nome: 'Acrilonitrila', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.003': { nome: '1-3-butadieno', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.004': { nome: 'Mercaptanos (tióis)', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.005': { nome: 'n-hexano', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.006': { nome: 'Diisocianato de tolueno (TDI)', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.007': { nome: 'Aminas aromáticas', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.008': { nome: 'Aminobifenila (4-aminodifenil)', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.009': { nome: 'Auramina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.010': { nome: 'Azatioprina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.011': { nome: '1-4-butanodiol', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.012': { nome: 'Dimetanosulfonato (MIRELAN)', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.013': { nome: 'Ciclofosfamida', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.014': { nome: 'Dietiletil-bestrol', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.015': { nome: 'Acronitrila', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.016': { nome: 'Nitronaftilamina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.017': { nome: '4-dimetil-aminoazobenzeno', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.018': { nome: 'Benzopireno', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.019': { nome: 'Beta-pbiscloromeropiolactona (beta-propiolactona)', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.021': { nome: 'Dianizidina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.022': { nome: 'Dietilsulfato', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.023': { nome: 'Dimetilsulfato', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.024': { nome: 'Etilenoamina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.025': { nome: 'Etilenotiureia', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.026': { nome: 'Fenacetina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.027': { nome: 'Iodeto de metila', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.028': { nome: 'Etilnitrosureia', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.029': { nome: 'Nitrosamina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.030': { nome: 'Ortotoluidina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.031': { nome: 'Oximetalona (oxime-talona)', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.032': { nome: 'Procarbazina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.033': { nome: 'Propanosultona', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.034': { nome: 'Óxido de etileno', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.035': { nome: 'Estilbenzeno', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.036': { nome: 'Creosoto', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.038': { nome: 'Benzidina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.039': { nome: 'Betanaftilamina', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.040': { nome: '1-cloro-2,4-nitrodifenil', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '01.19.041': { nome: '3-poxipro-pano', grupo: 'QUÍMICOS', subgrupo: 'OUTRAS SUBSTÂNCIAS QUÍMICAS' },
  '02.01.001': { nome: 'Ruído', grupo: 'FÍSICOS', subgrupo: 'RUÍDO' },
  '02.01.002': { nome: 'Vibrações localizadas (mão-braço)', grupo: 'FÍSICOS', subgrupo: 'VIBRAÇÕES' },
  '02.01.003': { nome: 'Vibração de corpo inteiro (aceleração resultante de exposição normalizada - aren)', grupo: 'FÍSICOS', subgrupo: 'VIBRAÇÕES' },
  '02.01.004': { nome: 'Vibração de corpo inteiro (Valor da Dose de Vibração Resultante - VDVR)', grupo: 'FÍSICOS', subgrupo: 'VIBRAÇÕES' },
  '02.01.005': { nome: 'Trabalhos com perfuratrizes e marteletes pneumáticos', grupo: 'FÍSICOS', subgrupo: 'VIBRAÇÕES' },
  '02.01.006': { nome: 'Radiações ionizantes', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.007': { nome: 'Extração e beneficiamento de minerais radioativos', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.008': { nome: 'Atividades em minerações com exposição ao radônio', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.009': { nome: 'Realização de manutenção e supervisão em unidades de extração, tratamento e beneficiamento de minerais radioativos com exposição às radiações ionizantes', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.010': { nome: 'Operações com reatores nucleares ou com fontes radioativas', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.011': { nome: 'Trabalhos realizados com exposição aos raios Alfa, Beta, Gama e X, aos nêutrons e às substâncias radioativas para fins industriais, terapêuticos e diagnósticos', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.012': { nome: 'Fabricação e manipulação de produtos radioativos', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.013': { nome: 'Pesquisas e estudos com radiações ionizantes em laboratórios', grupo: 'FÍSICOS', subgrupo: 'RADIAÇÕES IONIZANTES' },
  '02.01.014': { nome: 'Trabalhos com exposição ao calor acima dos limites de tolerância estabelecidos na NR-15, da Portaria 3.214/1978', grupo: 'FÍSICOS', subgrupo: 'TEMPERATURAS ANORMAIS' },
  '02.01.015': { nome: 'Pressão atmosférica anormal', grupo: 'FÍSICOS', subgrupo: 'PRESSÃO ATMOSFÉRICA ANORMAL' },
  '02.01.016': { nome: 'Trabalhos em caixões ou câmaras hiperbáricas', grupo: 'FÍSICOS', subgrupo: 'PRESSÃO ATMOSFÉRICA ANORMAL' },
  '02.01.017': { nome: 'Trabalhos em tubulões ou túneis sob ar comprimido', grupo: 'FÍSICOS', subgrupo: 'PRESSÃO ATMOSFÉRICA ANORMAL' },
  '02.01.018': { nome: 'Operações de mergulho com o uso de escafandros ou outros equipamentos', grupo: 'FÍSICOS', subgrupo: 'PRESSÃO ATMOSFÉRICA ANORMAL' },
  '03.01.001': { nome: 'Trabalhos em estabelecimentos de saúde com contato com pacientes portadores de doenças infectocontagiosas ou com manuseio de materiais contaminados', grupo: 'BIOLÓGICOS', subgrupo: 'BIOLÓGICOS' },
  '03.01.002': { nome: 'Trabalhos com animais infectados para tratamento ou para o preparo de soro, vacinas e outros produtos', grupo: 'BIOLÓGICOS', subgrupo: 'BIOLÓGICOS' },
  '03.01.003': { nome: 'Trabalhos em laboratórios de autópsia, de anatomia e anátomo-histologia', grupo: 'BIOLÓGICOS', subgrupo: 'BIOLÓGICOS' },
  '03.01.004': { nome: 'Trabalho de exumação de corpos e manipulação de resíduos de animais deteriorados', grupo: 'BIOLÓGICOS', subgrupo: 'BIOLÓGICOS' },
  '03.01.005': { nome: 'Trabalhos em galerias, fossas e tranques de esgoto', grupo: 'BIOLÓGICOS', subgrupo: 'BIOLÓGICOS' },
  '03.01.006': { nome: 'Esvaziamento de biodigestores', grupo: 'BIOLÓGICOS', subgrupo: 'BIOLÓGICOS' },
  '03.01.007': { nome: 'Coleta e industrialização do lixo', grupo: 'BIOLÓGICOS', subgrupo: 'BIOLÓGICOS' },
  '04.01.001': { nome: 'Mineração subterrânea cujas atividades sejam exercidas afastadas das frentes de produção', grupo: 'ASSOCIAÇÃO DE AGENTES NOCIVOS FÍSICOS, QUÍMICOS E BIOLÓGICOS', subgrupo: 'ASSOCIAÇÃO DE AGENTES NOCIVOS FÍSICOS, QUÍMICOS E BIOLÓGICOS' },
  '04.01.002': { nome: 'Trabalhos em atividades permanentes no subsolo de minerações subterrâneas em frente de produção', grupo: 'ASSOCIAÇÃO DE AGENTES NOCIVOS FÍSICOS, QUÍMICOS E BIOLÓGICOS', subgrupo: 'ASSOCIAÇÃO DE AGENTES NOCIVOS FÍSICOS, QUÍMICOS E BIOLÓGICOS' },
  '05.01.001': { nome: 'Agentes nocivos não constantes no Anexo IV do Decreto 3.048/1999 e incluídos por força de decisão judicial ou administrativa', grupo: 'OUTROS AGENTES NOCIVOS', subgrupo: 'OUTROS AGENTES NOCIVOS' },
  '09.01.001': { nome: 'Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999', grupo: 'AUSÊNCIA DE AGENTES NOCIVOS OU ATIVIDADES ESPECIAIS', subgrupo: 'AUSÊNCIA DE AGENTES NOCIVOS OU ATIVIDADES ESPECIAIS' },
};

export const TOTAL_AGENTES_TABELA_24 = Object.keys(TABELA_24).length;

export const FUNDAMENTACAO_TABELA_24 =
  'Tabela 24 do eSocial - Agentes Nocivos e Atividades (Anexo IV do Decreto 3.048/1999).';

/**
 * Grupos da Tabela 24, pelos dois primeiros digitos.
 *
 * Extraidos do PDF, nao supostos. Note que 01 e QUIMICO e 02 e FISICO - o
 * inverso do que o inventario de riscos da NR-01 costuma usar, e o inverso do
 * que a versao anterior deste arquivo afirmava.
 */
export const GRUPOS_TABELA_24: Record<string, string> = {
  '01': 'Químicos',
  '02': 'Físicos',
  '03': 'Biológicos',
  '04': 'Associação de agentes nocivos físicos, químicos e biológicos',
  '05': 'Outros agentes nocivos (por decisão judicial ou administrativa)',
  '09': 'Ausência de agentes nocivos ou atividades especiais',
};

/**
 * Ausencia de agente nocivo ou de atividades do Anexo IV.
 *
 * E o que se declara no S-2240 quando o trabalhador nao esta exposto a nenhum
 * agente da tabela - inclusive quando o inventario do PGR tem riscos
 * ergonomicos ou de acidentes, que nao constam aqui.
 */
export const CODIGO_AUSENCIA_DE_RISCO = '09.01.001';

export interface ResultadoFormatoTabela24 {
  valido: boolean;
  /** Codigo normalizado NN.NN.NNN. Vazio quando nao da para normalizar. */
  codigo: string;
  grupo?: string;
  motivo?: string;
}

/**
 * Confere o FORMATO do codigo e normaliza para NN.NN.NNN.
 *
 * Aceita com ou sem pontos e ignora um sufixo descritivo, porque e assim que
 * os codigos costumam estar gravados. Nao diz se o codigo EXISTE - para isso e
 * `consultarAgente`.
 */
export function formatoDoCodigoTabela24(valor: string | undefined | null): ResultadoFormatoTabela24 {
  const bruto = (valor || '').trim();

  if (!bruto) {
    return { valido: false, codigo: '', motivo: 'Informe o código da Tabela 24 do eSocial.' };
  }

  const antesDaSeparacao = bruto.split(/\s+[-\u2013]\s+/)[0].trim();
  const digitos = antesDaSeparacao.replace(/\D/g, '');

  if (digitos.length !== 7) {
    return {
      valido: false,
      codigo: '',
      motivo:
        `"${bruto}" não tem a forma de um código da Tabela 24. ` +
        'São 7 dígitos, no formato NN.NN.NNN — por exemplo 02.01.001 (Ruído).',
    };
  }

  const codigo = `${digitos.slice(0, 2)}.${digitos.slice(2, 4)}.${digitos.slice(4)}`;
  const grupo = GRUPOS_TABELA_24[digitos.slice(0, 2)];

  if (!grupo) {
    return {
      valido: false,
      codigo,
      motivo:
        `O grupo "${digitos.slice(0, 2)}" não existe na Tabela 24. ` +
        `Os grupos são: ${Object.entries(GRUPOS_TABELA_24)
          .map(([numero, nome]) => `${numero} (${nome})`)
          .join(', ')}.`,
    };
  }

  return { valido: true, codigo, grupo };
}

/** O agente oficial, ou null quando o codigo nao consta na tabela. */
export function consultarAgente(
  codigo: string | undefined | null
): (AgenteTabela24 & { codigo: string }) | null {
  const formato = formatoDoCodigoTabela24(codigo);
  if (!formato.codigo) return null;
  const agente = TABELA_24[formato.codigo];
  if (!agente) return null;
  return { codigo: formato.codigo, ...agente };
}

/** true somente quando o codigo consta na Tabela 24. */
export function codigoExisteNaTabela24(codigo: string | undefined | null): boolean {
  return consultarAgente(codigo) !== null;
}

function achatar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Busca por codigo, por nome do agente ou por subgrupo.
 *
 * Ordena por relevancia: codigo exato, depois nome que COMECA com o termo,
 * depois nome que o contem, depois o subgrupo. Sem isso, "ruido" devolveria
 * antes os agentes cujo subgrupo e RUIDO do que o proprio "Ruido".
 */
export function buscarAgentes(
  termo: string,
  limite = 40
): Array<AgenteTabela24 & { codigo: string }> {
  const bruto = (termo || '').trim();
  if (!bruto) return [];

  const alvo = achatar(bruto);
  const somenteDigitos = bruto.replace(/\D/g, '');

  const exatos: Array<AgenteTabela24 & { codigo: string }> = [];
  const comecam: Array<AgenteTabela24 & { codigo: string }> = [];
  const contem: Array<AgenteTabela24 & { codigo: string }> = [];
  const porSubgrupo: Array<AgenteTabela24 & { codigo: string }> = [];

  for (const codigo of Object.keys(TABELA_24)) {
    const agente = TABELA_24[codigo];
    const item = { codigo, ...agente };
    const nomeAchatado = achatar(agente.nome);

    if (somenteDigitos.length === 7 && codigo.replace(/\D/g, '') === somenteDigitos) {
      exatos.push(item);
      continue;
    }
    if (somenteDigitos && codigo.replace(/\D/g, '').includes(somenteDigitos)) {
      comecam.push(item);
      continue;
    }
    if (nomeAchatado.startsWith(alvo)) {
      comecam.push(item);
      continue;
    }
    if (nomeAchatado.includes(alvo)) {
      contem.push(item);
      continue;
    }
    if (achatar(agente.subgrupo).includes(alvo) || achatar(agente.grupo).includes(alvo)) {
      porSubgrupo.push(item);
    }
  }

  const porCodigo = (a: { codigo: string }, b: { codigo: string }) => a.codigo.localeCompare(b.codigo);
  comecam.sort(porCodigo);
  contem.sort(porCodigo);
  porSubgrupo.sort(porCodigo);

  return [...exatos, ...comecam, ...contem, ...porSubgrupo].slice(0, limite);
}

/**
 * Codigos repetidos num conjunto de riscos.
 *
 * Repetir NAO e necessariamente erro: "Ruido continuo" e "Ruido de impacto"
 * sao dois agentes do PGR e um unico codigo da Tabela 24 (02.01.001). O que e
 * erro e repetir entre agentes que nao tem relacao - o catalogo tinha
 * 05.01.001 em "Risco de Queda em Altura" e em "Ausencia de Fatores de Risco".
 * Por isso isto devolve uma lista para a tela mostrar, nao um bloqueio.
 */
export function codigosDuplicados(
  itens: Array<{ code_table_24?: string; name?: string }>
): Array<{ codigo: string; nomes: string[] }> {
  const porCodigo = new Map<string, string[]>();

  itens.forEach((item) => {
    const codigo = formatoDoCodigoTabela24(item?.code_table_24).codigo;
    if (!codigo) return;
    const nomes = porCodigo.get(codigo) || [];
    nomes.push(item?.name || 'sem nome');
    porCodigo.set(codigo, nomes);
  });

  return [...porCodigo.entries()]
    .filter(([, nomes]) => nomes.length > 1)
    .map(([codigo, nomes]) => ({ codigo, nomes }));
}
