/**
 * Gera lib/catalogoDeRiscosDaListagem.ts a partir da listagem de riscos do
 * usuario (docs/fontes/listagem-de-riscos.txt).
 *
 *   node scripts/gerar-catalogo-da-listagem.mjs             grava o arquivo e imprime o relatorio
 *   node scripts/gerar-catalogo-da-listagem.mjs --conferir  so compara com o arquivo gravado
 *
 * POR QUE UM GERADOR
 *
 * A listagem tem 910 riscos. Escrever 910 objetos a mao seria escrever 910
 * chances de erro de digitacao num limite de tolerancia - e o limite vai para
 * o PGR do cliente. O gerador le a fonte, falha alto em qualquer linha que nao
 * entenda e grava um arquivo que o verificador
 * (scripts/verificar-catalogo-listagem.mjs) regenera e compara.
 *
 * COMO A LINHA E LIDA
 *
 * O texto extraido do PDF perde as colunas vazias, entao as linhas tem numero
 * variavel de palavras. A forma e:
 *
 *   <nome><grupo> [meio] [unidade] Qualitativo|Quantitativo LT Teto NA min max
 *   [casas] periodicidade efeito [NEN] nocivo pcmso ppra [codigo - nome]
 *
 * O grupo as vezes vem colado ao nome ("derivadosQuimico") e o nome pode
 * conter "Quimicos", entao o gerador experimenta TODA posicao de grupo e exige
 * que exatamente uma produza uma linha completa. Nenhuma, ou mais de uma, e
 * erro: a geracao para e mostra a linha. Nada e adivinhado.
 *
 * Saida: 0 gerou (ou, com --conferir, o arquivo esta em dia), 1 falhou.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CAMINHOS = {
  fonte: 'docs/fontes/listagem-de-riscos.txt',
  tabela24: 'lib/tabela24.ts',
  curados: 'lib/occupationalRisksCatalogData.ts',
  saida: 'lib/catalogoDeRiscosDaListagem.ts',
};

/** Data da listagem: o PDF foi entregue pelo usuario em 08/10/2026. */
export const DATA_DA_LISTAGEM = '2026-10-08T00:00:00Z';

// ---------------------------------------------------------------------------
// Vocabulario da fonte. Tudo fora destas listas faz a geracao falhar.
// ---------------------------------------------------------------------------

const GRUPOS = {
  'Químico': 'QUÍMICO',
  'Físico': 'FÍSICO',
  'Biológico': 'BIOLÓGICO',
  'Ergonômico': 'ERGONÔMICO',
  'Acidentes': 'ACIDENTES',
};
const INESPECIFICO = 'Inespecífico';
const RE_GRUPO = /(Químico|Físico|Biológico|Ergonômico|Acidentes|Inespecífico)(?= )/g;

/**
 * "Inespecifico" nao e grupo do PGR. Cada linha com esse grupo e mapeada pelo
 * NOME, e um nome novo com esse grupo faz a geracao falhar. Mapeamento
 * confirmado pelo usuario em 08/10/2026: as duas de mineracao (04.01.001 e
 * 04.01.002, associacao de agentes) ficam em FISICO, a manipulacao de
 * alimentos em BIOLOGICO e a ausencia de agente nocivo em AUSENCIA_RISCO.
 */
export const GRUPO_DOS_INESPECIFICOS = {
  'Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999': 'AUSÊNCIA_RISCO',
  'Mineração subterrânea cujas atividades sejam exercidas afastadas das frentes de produção': 'FÍSICO',
  'Trabalhos em atividades permanentes no subsolo de minerações subterrâneas em frente de produção': 'FÍSICO',
  'Trabalho com Manipulação de Alimentos': 'BIOLÓGICO',
};

/** Meio de propagacao como a fonte escreve -> como o catalogo guarda. */
const MEIOS = {
  'Ar e contato': 'Ar e contato',
  'Ar e Contato': 'Ar e contato',
  'Ar': 'Ar',
  'Contato': 'Contato',
};

/** Unidades como a fonte escreve. A normalizacao e de lib/limitesDoCatalogo.ts, ao montar o item. */
const UNIDADES = ['ppm', 'mg/m³', 'mg/m3', 'm/s²', 'm/s1,75', 'Milisievert (mSv)', '°C', 'dB(A)', 'dB(C)'];

const AVALIACOES = { Qualitativo: 'QUALITATIVA', Quantitativo: 'QUANTITATIVA' };

/**
 * Correcoes evidentes da fonte. Cada uma tem de encontrar exatamente o valor
 * "de" na linha do nome indicado; se a fonte mudar e a correcao nao casar
 * mais, a geracao falha em vez de corrigir outra coisa.
 */
export const CORRECOES_DA_LISTAGEM = [
  {
    nome: 'Agentes biológicos (bactérias, vírus, fungos e outros)',
    campo: 'group',
    de: 'FÍSICO',
    para: 'BIOLÓGICO',
    motivo: 'A listagem classifica como Físico um agente que o próprio nome declara biológico.',
  },
  {
    nome: 'Acidente de trânsito',
    campo: 'propagation_paths',
    de: 'Acidente de trânsito',
    para: '',
    motivo: 'A listagem repete o nome do risco na coluna do meio de propagação.',
  },
  {
    nome: 'Acidente de trânsito',
    campo: 'standard_unit',
    de: 'Acidente de trânsito',
    para: '',
    motivo: 'A listagem repete o nome do risco na coluna da unidade de medida.',
  },
];

/** Texto da nota dos itens dos quais o 09.01.001 foi retirado. Vai para a tela. */
export const NOTA_AUSENCIA_RETIRADA =
  'A listagem trazia 09.01.001, retirado aqui: esse código declara que o trabalhador não tem agente nocivo, ' +
  'não é propriedade de um risco, e o S-2240 o recusa junto de outro agente.';

/**
 * Termos do Anexo IV procurados nos nomes das linhas SEM codigo, so para o
 * relatorio: sao candidatas a codigo, e a decisao e do usuario. Nada muda no
 * catalogo por causa desta lista. Halogenios e fosforo so pela palavra do
 * elemento solta ("de cloro", nao "cloreto" nem "1-cloro-"): pelo radical,
 * dezenas de compostos organicos entrariam, e "compostos toxicos" pede
 * julgamento. Pelo mesmo motivo "silicato" nao e silica e
 * "hexaclorobutadieno" nao e butadieno.
 */
const TERMOS_DO_ANEXO_IV = [
  [/arsen|arsin/, '01.01.001'],
  [/asbest|amianto/, '01.02.001'],
  [/(?<!soluve(?:l|is) em )benzen/, '01.03.001'],
  [/(?<![a-z])estireno/, '01.03.002'],
  [/berili/, '01.04.001'],
  [/(?:^|[\s(])bromo(?=$|[\s)])/, '01.05.001'],
  [/cadmi/, '01.06.001'],
  [/carvao|hulha/, '01.07.001'],
  [/chumbo/, '01.08.001'],
  [/(?:^|[\s(])cloro(?=$|[\s)])/, '01.09.001'],
  [/crom(o|at|it|ic|il)/, '01.10.001'],
  [/(?:^|[\s(])fosforo(?=$|[\s)])/, '01.12.001'],
  [/(?:^|[\s(])iodo(?=$|[\s)])/, '01.13.001'],
  [/manganes/, '01.14.001'],
  [/mercurio/, '01.15.001'],
  [/niquel/, '01.16.001'],
  [/petrole|xisto|gas natural|oleos? minera|graxas? minera/, '01.17.001'],
  [/(?<![a-z])silica(?![a-z])/, '01.18.001'],
  [/(?<![a-z])butadieno/, '01.19.001/01.19.003'],
  [/acrilonitrila/, '01.19.002'],
  [/mercaptan/, '01.19.004'],
  [/nitrosamin/, '01.19.029'],
  [/benzidin/, '01.19.038'],
  [/creosot/, '01.19.036'],
  [/ruido/, '02.01.001'],
  [/vibra/, '02.01.002 a 02.01.004'],
  [/(?<!nao )ionizant|radioativ|\bradio-\d|radonio|torio|uranio|plutonio/, '02.01.006 a 02.01.013'],
  [/calor\b/, '02.01.014'],
];

// ---------------------------------------------------------------------------
// Utilitarios
// ---------------------------------------------------------------------------

export class ErroDaListagem extends Error {}

export const achatar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Nome para comparar com os curados: sem acento, sem caixa, sem espacos. */
export const nomeNormalizado = (s) => achatar(s).replace(/\s+/g, '');

/** Id estavel: deriva so do nome, nunca da posicao na listagem. */
export const idDoNome = (s) => `risk-lst-${achatar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

/** "1,480.000" -> 1480. A fonte usa virgula de milhar e ponto decimal. */
const numero = (txt) => Number(txt.replace(/,/g, ''));

const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const RE_CAUDA = new RegExp(
  String.raw`^(${NUM}) (Sim|Não) (${NUM}) (${NUM}) (${NUM}) (?:(\d+) )?(\d+) (Não Aplica|Leve|Moderado) ` +
    String.raw`(?:(Sim|Não) )?(Sim|Não) (Sim|Não) (Sim|Não)(?: (\d{2}\.\d{2}\.\d{3}) - (\S.*))?$`
);

// ---------------------------------------------------------------------------
// Leitura das entradas
// ---------------------------------------------------------------------------

export function lerEntradas(raiz = RAIZ) {
  const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
  return { fonte: ler(CAMINHOS.fonte), tabela24: ler(CAMINHOS.tabela24), curados: ler(CAMINHOS.curados) };
}

/** Codigos e nomes da Tabela 24, lidos do literal de lib/tabela24.ts. */
function lerTabela24(texto) {
  const tabela = {};
  for (const m of texto.matchAll(/^\s*'(\d{2}\.\d{2}\.\d{3})': \{ nome: '((?:[^'\\]|\\.)*)'/gm)) {
    tabela[m[1]] = m[2].replace(/\\(.)/g, '$1');
  }
  const ausencia = texto.match(/export const CODIGO_AUSENCIA_DE_RISCO = '(\d{2}\.\d{2}\.\d{3})'/)?.[1];
  if (Object.keys(tabela).length === 0 || !ausencia || !tabela[ausencia]) {
    throw new ErroDaListagem(`não foi possível ler a Tabela 24 de ${CAMINHOS.tabela24}`);
  }
  return { tabela, ausencia };
}

/** id, codigo e nome de cada item curado, bloco a bloco. */
function lerCurados(texto) {
  const curados = [];
  for (const bloco of texto.split(/\r?\n {2}\{\r?\n/).slice(1)) {
    const corpo = bloco.split(/\r?\n {2}\}/)[0];
    const campo = (nome) => corpo.match(new RegExp(String.raw`^ {4}${nome}: '((?:[^'\\]|\\.)*)'`, 'm'))?.[1]?.replace(/\\(.)/g, '$1');
    const id = campo('id');
    const name = campo('name');
    if (!id || !name) throw new ErroDaListagem(`item curado sem id ou nome em ${CAMINHOS.curados}`);
    curados.push({ id, name, code_table_24: campo('code_table_24') || '' });
  }
  if (curados.length === 0) throw new ErroDaListagem(`nenhum item curado lido de ${CAMINHOS.curados}`);
  return curados;
}

// ---------------------------------------------------------------------------
// Leitura de uma linha
// ---------------------------------------------------------------------------

/** Meio e unidade que sobram entre o grupo e a avaliacao. null quando nao ha leitura unica. */
function partirMeioEUnidade(texto, nome) {
  const daCorrecao = (campo) => CORRECOES_DA_LISTAGEM.filter((c) => c.nome === nome && c.campo === campo).map((c) => c.de);
  const meios = [...Object.keys(MEIOS), ...daCorrecao('propagation_paths')];
  const unidades = [...UNIDADES, ...daCorrecao('standard_unit')];
  const leituras = [];
  for (const meio of ['', ...meios]) {
    let resto;
    if (meio === '') resto = texto;
    else if (texto === meio) resto = '';
    else if (texto.startsWith(`${meio} `)) resto = texto.slice(meio.length + 1);
    else continue;
    if (resto === '' || unidades.includes(resto)) leituras.push({ meio, unidade: resto });
  }
  return leituras.length === 1 ? leituras[0] : null;
}

/** O que vem depois do grupo. null quando nao casa com a forma da linha. */
function lerDepoisDoGrupo(nome, resto) {
  const a = resto.match(/^(?:(.*?) )?(Qualitativo|Quantitativo) (.*)$/);
  if (!a) return null;
  const meioEUnidade = partirMeioEUnidade(a[1] || '', nome);
  if (!meioEUnidade) return null;
  const c = a[3].match(RE_CAUDA);
  if (!c) return null;
  return {
    meioFonte: meioEUnidade.meio,
    unidadeFonte: meioEUnidade.unidade,
    avaliacaoFonte: a[2],
    limite: numero(c[1]),
    teto: c[2] === 'Sim',
    nivelDeAcao: numero(c[3]),
    faixaMinima: numero(c[4]),
    faixaMaxima: numero(c[5]),
    casas: c[6] === undefined ? null : Number(c[6]),
    efeitoFonte: c[8],
    codigoFonte: c[13] || '',
    nomeDoCodigoFonte: c[14] || '',
  };
}

function lerLinha(linha, numeroDaLinha) {
  const falhar = (motivo) => {
    throw new ErroDaListagem(`linha ${numeroDaLinha} da fonte ${motivo}:\n  ${linha}`);
  };
  const leituras = [];
  for (const m of linha.matchAll(RE_GRUPO)) {
    const colado = m.index > 0 && linha[m.index - 1] !== ' ';
    const nome = colado ? linha.slice(0, m.index) : linha.slice(0, m.index).replace(/ $/, '');
    if (!nome.trim()) continue;
    const resto = lerDepoisDoGrupo(nome, linha.slice(m.index + m[1].length + 1));
    if (resto) leituras.push({ nome, grupoFonte: m[1], colado, ...resto });
  }
  if (leituras.length === 0) falhar('não casa com a forma esperada (nome, grupo, meio, unidade, avaliação, limites, código)');
  if (leituras.length > 1) falhar(`tem ${leituras.length} leituras possíveis (${leituras.map((l) => `"${l.nome}"`).join(', ')})`);
  const r = leituras[0];
  if (r.nome !== r.nome.trim() || /\s{2}/.test(r.nome)) falhar('tem espaço sobrando no nome');
  // A faixa e descartada porque e sempre 0. Se um dia nao for, descartar seria perder dado.
  if (r.faixaMinima !== 0 || r.faixaMaxima !== 0) falhar('tem faixa mínima/máxima diferente de 0, que o gerador descartaria');
  if (r.teto && !(r.limite > 0)) falhar('marca "valor teto" sem limite de tolerância');
  return { ...r, linha: numeroDaLinha };
}

// ---------------------------------------------------------------------------
// Geracao
// ---------------------------------------------------------------------------

export function gerar({ fonte, tabela24, curados: textoDosCurados }) {
  const { tabela, ausencia } = lerTabela24(tabela24);
  const curados = lerCurados(textoDosCurados);
  const curadoPorNome = new Map(curados.map((c) => [nomeNormalizado(c.name), c]));

  const linhas = fonte.split(/\r?\n/).map((texto, i) => ({ texto, numero: i + 1 }))
    .filter(({ texto }) => texto.trim() && !texto.startsWith('#'));

  const aplicadas = new Map(CORRECOES_DA_LISTAGEM.map((c) => [c, 0]));
  const registros = [];
  const deduplicadas = [];
  const ids = new Map(curados.map((c) => [c.id, c.name]));
  const relatorio = {
    linhasLidas: linhas.length, coladas: [], divergenciasDeNome: [], ausenciaRetirada: [],
    quantitativoSemLimite: [], qualitativoComUnidade: [], unidadeSemMeio: [],
  };

  for (const { texto, numero: n } of linhas) {
    const r = lerLinha(texto, n);
    const falhar = (motivo) => {
      throw new ErroDaListagem(`linha ${n} da fonte ${motivo}:\n  ${texto}`);
    };

    let group;
    if (r.grupoFonte === INESPECIFICO) {
      group = GRUPO_DOS_INESPECIFICOS[r.nome];
      if (!group) falhar('tem grupo "Inespecífico" e o nome não está em GRUPO_DOS_INESPECIFICOS');
    } else {
      group = GRUPOS[r.grupoFonte];
    }

    const registro = {
      linha: n,
      id: idDoNome(r.nome),
      nome: r.nome,
      group,
      propagation_paths: MEIOS[r.meioFonte] ?? r.meioFonte,
      standard_unit: r.unidadeFonte,
      avaliacao: AVALIACOES[r.avaliacaoFonte],
      limite: r.limite > 0 ? r.limite : null,
      teto: r.teto,
      nivelDeAcao: r.nivelDeAcao > 0 ? r.nivelDeAcao : null,
      casas: r.casas,
      efeito: r.efeitoFonte === 'Não Aplica' ? '' : r.efeitoFonte,
      codigo: r.codigoFonte,
      ausenciaRetirada: false,
    };

    for (const c of CORRECOES_DA_LISTAGEM.filter((x) => x.nome === r.nome)) {
      if (registro[c.campo] !== c.de) falhar(`não traz "${c.de}" em ${c.campo}, que a correção esperava (a fonte mudou?)`);
      registro[c.campo] = c.para;
      aplicadas.set(c, aplicadas.get(c) + 1);
    }

    // Codigo: tem de existir. 09.01.001 so na linha da ausencia.
    if (registro.codigo) {
      if (!tabela[registro.codigo]) falhar(`traz o código ${registro.codigo}, que não existe na Tabela 24`);
      const oficial = tabela[registro.codigo].replace(/[^0-9A-Za-zÀ-ÿ]/g, '').toLowerCase();
      if (r.nomeDoCodigoFonte.replace(/[^0-9A-Za-zÀ-ÿ]/g, '').toLowerCase() !== oficial) {
        relatorio.divergenciasDeNome.push({ linha: n, codigo: registro.codigo, fonte: r.nomeDoCodigoFonte, oficial: tabela[registro.codigo] });
      }
    }
    if (registro.group === 'AUSÊNCIA_RISCO' && registro.codigo !== ausencia) falhar(`é ausência de risco sem o código ${ausencia}`);
    if (registro.codigo === ausencia && registro.group !== 'AUSÊNCIA_RISCO') {
      registro.codigo = '';
      registro.ausenciaRetirada = true;
      relatorio.ausenciaRetirada.push(r.nome);
    }

    if (r.colado) relatorio.coladas.push(r.nome);
    if (registro.avaliacao === 'QUANTITATIVA' && registro.limite === null) relatorio.quantitativoSemLimite.push(r.nome);
    if (registro.avaliacao === 'QUALITATIVA' && registro.standard_unit) relatorio.qualitativoComUnidade.push(r.nome);
    if (registro.standard_unit && !registro.propagation_paths) relatorio.unidadeSemMeio.push(r.nome);

    const curado = curadoPorNome.get(nomeNormalizado(r.nome));
    if (curado) {
      deduplicadas.push({
        linha: n,
        nome: r.nome,
        id_curado: curado.id,
        motivo: `Mesmo nome do item curado ${curado.id} ("${curado.name}"), ignorando acento, caixa e espaços: o item curado já representa este risco.`,
      });
      continue;
    }

    if (ids.has(registro.id)) falhar(`gera o id ${registro.id}, que já é de "${ids.get(registro.id)}"`);
    ids.set(registro.id, r.nome);
    registros.push(registro);
  }

  for (const [c, vezes] of aplicadas) {
    if (vezes !== 1) {
      throw new ErroDaListagem(`a correção de ${c.campo} em "${c.nome}" foi aplicada ${vezes} vez(es), e não 1 (a fonte mudou?)`);
    }
  }

  // Relatorio: so lista, nao muda nada.
  const curadosPorCodigo = new Map();
  curados.filter((c) => c.code_table_24).forEach((c) => {
    curadosPorCodigo.set(c.code_table_24, [...(curadosPorCodigo.get(c.code_table_24) || []), c.name]);
  });
  relatorio.quaseDuplicatas = registros
    .filter((r) => r.codigo && curadosPorCodigo.has(r.codigo))
    .map((r) => ({ nome: r.nome, codigo: r.codigo, curados: curadosPorCodigo.get(r.codigo) }));
  relatorio.candidatasACodigo = registros
    .filter((r) => !r.codigo && r.group !== 'AUSÊNCIA_RISCO')
    .map((r) => ({ nome: r.nome, codigos: [...new Set(TERMOS_DO_ANEXO_IV.filter(([re]) => re.test(achatar(r.nome))).map(([, c]) => c))] }))
    .filter((c) => c.codigos.length > 0);
  relatorio.itens = registros.length;
  relatorio.deduplicadas = deduplicadas;
  relatorio.correcoes = CORRECOES_DA_LISTAGEM;

  return { ts: escreverTs(registros, deduplicadas, linhas.length), registros, deduplicadas, relatorio };
}

// ---------------------------------------------------------------------------
// Escrita do .ts
// ---------------------------------------------------------------------------

const aspas = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const num = (n) => (n === null ? 'null' : String(n));

function escreverTs(registros, deduplicadas, totalDeLinhas) {
  const tupla = (r) => `  [${[
    aspas(r.id), aspas(r.nome), aspas(r.group), aspas(r.propagation_paths), aspas(r.standard_unit), aspas(r.avaliacao),
    num(r.limite), r.teto ? 1 : 0, num(r.nivelDeAcao), num(r.casas), aspas(r.efeito), aspas(r.codigo), r.ausenciaRetirada ? 1 : 0,
  ].join(', ')}],`;

  const objeto = (o) => `  { ${Object.entries(o).map(([k, v]) => `${k}: ${aspas(v)}`).join(', ')} },`;

  return `/**
 * CATALOGO DE RISCOS DA LISTAGEM DO USUARIO
 *
 * NAO EDITE A MAO. Regenere com node scripts/gerar-catalogo-da-listagem.mjs
 * (e confira com node scripts/verificar-catalogo-listagem.mjs).
 *
 * Fonte: ${CAMINHOS.fonte} - o texto do PDF "Riscos Ocupacionais.pdf"
 * entregue pelo usuario em 08/10/2026, uma linha por risco. ${totalDeLinhas} linhas: ${registros.length} viram
 * itens aqui e ${deduplicadas.length} ${deduplicadas.length === 1 ? 'ficou' : 'ficaram'} de fora por duplicar um item curado
 * (LINHAS_DEDUPLICADAS_DA_LISTAGEM).
 *
 * O QUE CADA ITEM TRAZ - SO O QUE A LISTAGEM DIZ
 *
 * Nome (o da fonte, sem mudar nem corrigir grafia), grupo, meio de
 * propagacao, unidade, tipo de avaliacao, limite de tolerancia, valor teto,
 * nivel de acao, casas decimais, classificacao do efeito e codigo da Tabela
 * 24. Fonte geradora, efeito a saude, EPC, EPI, exames, severidade,
 * probabilidade, insalubridade, periculosidade e aposentadoria especial ficam
 * AUSENTES: a listagem nao os traz, e inventa-los poria no PGR do cliente uma
 * afirmacao que ninguem fez.
 *
 * LIMITES. A listagem escreve 0 quando o agente nao tem valor fixo (silica,
 * calor, frio, ruido de impacto). 0 vira campo AUSENTE, nunca 0: "0 mg/m³" no
 * PGR diria que qualquer exposicao ultrapassa o limite. O texto do limite sai
 * de textoDoLimite (lib/limitesDoCatalogo.ts) ao carregar o modulo, para o
 * numero e o texto nunca divergirem. "1,480.000" na fonte e 1480: virgula de
 * milhar, ponto decimal.
 *
 * O QUE A LISTAGEM TRAZ E FICA DE FORA, E POR QUE
 *
 *   - Valor minimo e maximo da faixa: sempre 0 nas ${totalDeLinhas} linhas (o gerador
 *     falha se um dia nao for, em vez de descartar dado).
 *   - Periodicidade da medicao: e plano de monitoramento, nao propriedade do
 *     agente; o catalogo nao tem campo para ela.
 *   - Usa NEN, PCMSO, PPRA: marcadores do sistema de origem, sem campo
 *     correspondente no catalogo.
 *   - Nocivo - PPP: diverge do eSocial. O S-2240 declara so os agentes da
 *     Tabela 24; "nocivo" e consequencia do codigo, nao uma marca a parte.
 *
 * CODIGO DA TABELA 24
 *
 * Todo codigo da fonte existe em lib/tabela24.ts (senao a geracao falha) e
 * fica como a fonte traz - inclusive Defensivos agricolas -> 01.12.001. A
 * excecao e 09.01.001: a fonte o pos em ${registros.filter((r) => r.ausenciaRetirada).length} riscos de acidente, ergonomicos e
 * outros. Ele fica SO no item "Ausencia de agente nocivo...", porque declara
 * que o TRABALHADOR nao tem agente nocivo - nao e propriedade de um risco - e
 * o S-2240 recusa 09.01.001 junto de qualquer outro agente (ver
 * lib/esocialEventos.ts, montagem de [agNoc]). Nos demais ele e retirado e a
 * esocial_enquadramento_nota diz por que. Risco sem codigo e o estado normal
 * (ver o cabecalho de lib/tabela24.ts).
 *
 * GRUPO "INESPECIFICO"
 *
 * Nao e grupo do PGR. As ${Object.keys(GRUPO_DOS_INESPECIFICOS).length} linhas com ele foram mapeadas pelo nome
 * (GRUPO_DOS_INESPECIFICOS), por decisao do usuario em 08/10/2026: a
 * ausencia de agente nocivo em AUSENCIA_RISCO, as duas de mineracao
 * (04.01.001 e 04.01.002) em FISICO e a manipulacao de alimentos em
 * BIOLOGICO.
 *
 * CORRECOES E DUPLICATAS
 *
 * As correcoes evidentes da fonte estao em CORRECOES_DA_LISTAGEM. Uma linha
 * so e dada como duplicata de um item curado quando o nome e igual ignorando
 * acento, caixa e espacos; parecido nao basta.
 *
 * ID. 'risk-lst-' + o nome sem acento, em minusculas, com '-' no lugar do que
 * nao for letra ou digito. Deriva so do nome, entao e o mesmo a cada
 * regeneracao; dois nomes com o mesmo id fazem a geracao falhar.
 */
import type { OccupationalRiskCatalogItem, RiskCategoryType, RiskEvaluationType } from '@/types';
import { normalizarUnidade, textoDoLimite } from '@/lib/limitesDoCatalogo';

export interface CorrecaoDaListagem {
  nome: string;
  campo: 'group' | 'propagation_paths' | 'standard_unit';
  de: string;
  para: string;
  motivo: string;
}

export const CORRECOES_DA_LISTAGEM: CorrecaoDaListagem[] = [
${CORRECOES_DA_LISTAGEM.map(objeto).join('\n')}
];

export const GRUPO_DOS_INESPECIFICOS: Record<string, RiskCategoryType> = {
${Object.entries(GRUPO_DOS_INESPECIFICOS).map(([k, v]) => `  ${aspas(k)}: ${aspas(v)},`).join('\n')}
};

export const LINHAS_DEDUPLICADAS_DA_LISTAGEM: Array<{ nome: string; id_curado: string; motivo: string }> = [
${deduplicadas.map(({ nome, id_curado, motivo }) => objeto({ nome, id_curado, motivo })).join('\n')}
];

/** Linhas de risco da fonte: itens + deduplicadas. */
export const TOTAL_DE_LINHAS_DA_LISTAGEM = ${totalDeLinhas};

export const NOTA_AUSENCIA_RETIRADA =
  ${aspas(NOTA_AUSENCIA_RETIRADA)};

const DATA_DA_LISTAGEM = ${aspas(DATA_DA_LISTAGEM)};

type Linha = [
  id: string,
  nome: string,
  grupo: RiskCategoryType,
  meio: string,
  /** Como a fonte escreve; normalizada ao montar. '' quando nao ha. */
  unidade: string,
  avaliacao: RiskEvaluationType,
  /** null quando a fonte traz 0 (sem valor fixo). */
  limite: number | null,
  teto: 0 | 1,
  nivelDeAcao: number | null,
  /** null quando a fonte nao informa. */
  casas: number | null,
  /** '' quando a fonte traz "Nao Aplica". */
  efeito: string,
  codigo: string,
  /** 1 quando a fonte trazia 09.01.001 e ele foi retirado. */
  ausenciaRetirada: 0 | 1,
];

const LINHAS: Linha[] = [
${registros.map(tupla).join('\n')}
];

function montar([
  id, name, group, meio, unidade, evaluation_type, limite, teto, nivelDeAcao, casas, efeito, codigo, ausenciaRetirada,
]: Linha): OccupationalRiskCatalogItem {
  const item: OccupationalRiskCatalogItem = {
    id,
    name,
    group,
    propagation_paths: meio,
    evaluation_type,
    recommended_epis: [],
    suggested_exams_pcmso: [],
    catalog_source: 'LISTAGEM',
    is_system_default: true,
    status: 'ACTIVE',
    created_at: DATA_DA_LISTAGEM,
    updated_at: DATA_DA_LISTAGEM,
  };
  const standardUnit = normalizarUnidade(unidade);
  if (standardUnit) item.standard_unit = standardUnit;
  if (codigo) item.code_table_24 = codigo;
  if (ausenciaRetirada === 1) item.esocial_enquadramento_nota = NOTA_AUSENCIA_RETIRADA;
  if (limite !== null) {
    item.tolerance_limit_value = limite;
    item.tolerance_limit_reference = textoDoLimite(limite, unidade, teto === 1);
    if (teto === 1) item.tolerance_limit_is_ceiling = true;
  }
  if (nivelDeAcao !== null) {
    item.action_level_value = nivelDeAcao;
    item.action_level_reference = textoDoLimite(nivelDeAcao, unidade);
  }
  if (casas !== null) item.measurement_decimal_places = casas;
  if (efeito) item.effect_classification = efeito;
  return item;
}

export const RISCOS_DA_LISTAGEM: OccupationalRiskCatalogItem[] = LINHAS.map(montar);
`;
}

// ---------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------

function imprimirRelatorio(r) {
  const lista = (titulo, itens, fmt = (x) => x) => {
    console.log(`\n${titulo} (${itens.length})`);
    itens.forEach((x) => console.log(`  - ${fmt(x)}`));
  };
  console.log(`\nlinhas de risco lidas: ${r.linhasLidas}`);
  console.log(`itens gerados: ${r.itens}`);
  lista('deduplicadas com item curado', r.deduplicadas, (d) => `linha ${d.linha}: ${d.nome} -> ${d.id_curado}`);
  lista('correções aplicadas', r.correcoes, (c) => `${c.nome}: ${c.campo} "${c.de}" -> "${c.para}"`);
  console.log(`\n09.01.001 retirado de ${r.ausenciaRetirada.length} linhas`);
  lista('quase-duplicatas (código em comum com item curado)', r.quaseDuplicatas, (q) => `${q.nome} [${q.codigo}] ~ ${q.curados.join(' | ')}`);
  lista('candidatas a código (termo do Anexo IV no nome, sem código)', r.candidatasACodigo, (c) => `${c.nome} [${c.codigos.join(', ')}]`);
  lista('código com denominação diferente da Tabela 24', r.divergenciasDeNome, (d) => `linha ${d.linha} ${d.codigo}: "${d.fonte}" (oficial: "${d.oficial}")`);
  lista('grupo colado ao nome', r.coladas);
  lista('quantitativo sem limite de tolerância', r.quantitativoSemLimite);
  lista('qualitativo com unidade', r.qualitativoComUnidade);
  lista('unidade sem meio de propagação', r.unidadeSemMeio);
}

function principal() {
  const conferir = process.argv.includes('--conferir');
  let resultado;
  try {
    resultado = gerar(lerEntradas());
  } catch (e) {
    console.error(`\nFALHA NA GERACAO — nada foi gravado.\n${e.message}`);
    process.exit(1);
  }
  const destino = path.join(RAIZ, CAMINHOS.saida);
  if (conferir) {
    const atual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') : '';
    if (atual !== resultado.ts) {
      console.error(`${CAMINHOS.saida} NÃO está em dia com ${CAMINHOS.fonte}. Regenere.`);
      process.exit(1);
    }
    console.log(`${CAMINHOS.saida} está em dia com ${CAMINHOS.fonte}.`);
    return;
  }
  // O working tree do repositorio e CRLF (core.autocrlf=true), como os vizinhos.
  fs.writeFileSync(destino, resultado.ts.replace(/\n/g, '\r\n'));
  console.log(`gravado ${CAMINHOS.saida}`);
  imprimirRelatorio(resultado.relatorio);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
