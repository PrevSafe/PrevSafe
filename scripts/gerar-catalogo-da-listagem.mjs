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
  // Radioativos: o codigo atribuido pelo usuario (02.01.006, radiacoes
  // ionizantes) e do grupo dos agentes fisicos na Tabela 24.
  ...[
    'Plutônio',
    'Rádio-224 e seus produtos de decaimento',
    'Rádio-226 e seus produtos de decaimento',
    'Rádio-228 e seus produtos de decaimento',
    'Radônio-222 e seus produtos de decaimento',
    'Tório-232 e seus produtos de decaimento',
    'Urânio (natural) compostos solúveis e insolúveis',
  ].map((nome) => ({
    nome,
    campo: 'group',
    de: 'QUÍMICO',
    para: 'FÍSICO',
    motivo: 'Radioativo: recebeu 02.01.006 (radiações ionizantes), código do grupo dos agentes físicos na Tabela 24, por decisão do usuário em 09/10/2026.',
  })),
  // Qualitativos na listagem que tem limite no Quadro n. 1 do Anexo 11: viram
  // quantitativos, com o limite em CORRECOES_PELA_NR15.
  { nome: 'Arsina', campo: 'evaluation_type', de: 'QUALITATIVA', para: 'QUANTITATIVA', motivo: 'A NR-15 (Anexo 11, Quadro n. 1) fixa limite para o agente; correção pedida pelo usuário em 09/10/2026.' },
  { nome: 'Arsina', campo: 'standard_unit', de: '', para: 'mg/m³', motivo: 'Unidade da coluna mg/m3 do Quadro n. 1, de onde vem o limite.' },
  { nome: 'Dietilamina', campo: 'evaluation_type', de: 'QUALITATIVA', para: 'QUANTITATIVA', motivo: 'A NR-15 (Anexo 11, Quadro n. 1) fixa limite para o agente; correção pedida pelo usuário em 09/10/2026.' },
  { nome: 'Dietilamina', campo: 'standard_unit', de: '', para: 'mg/m³', motivo: 'Unidade da coluna mg/m3 do Quadro n. 1, de onde vem o limite.' },
  { nome: 'Dicloreto de propileno (1,2-Dicloropropano)', campo: 'evaluation_type', de: 'QUALITATIVA', para: 'QUANTITATIVA', motivo: 'A NR-15 (Anexo 11, Quadro n. 1) fixa limite para o agente; correção pedida pelo usuário em 09/10/2026.' },
  { nome: 'Dicloreto de propileno (1,2-Dicloropropano)', campo: 'standard_unit', de: '', para: 'mg/m³', motivo: 'Unidade da coluna mg/m3 do Quadro n. 1, de onde vem o limite.' },
];

/** Texto da nota dos itens dos quais o 09.01.001 foi retirado. Vai para a tela. */
export const NOTA_AUSENCIA_RETIRADA =
  'A listagem trazia 09.01.001, retirado aqui: esse código declara que o trabalhador não tem agente nocivo, ' +
  'não é propriedade de um risco, e o S-2240 o recusa junto de outro agente.';

/**
 * DUPLICATAS DE ITENS CURADOS. Linha da listagem -> id do item curado que ela
 * repete no MESMO nivel de detalhe. Decisao do usuario em 09/10/2026.
 *
 * O item continua gerado, mas sai com status INACTIVE e duplicate_of_id:
 * assim o seletor nao oferece o mesmo risco duas vezes, o usuario ainda pode
 * reativa-lo na tela, e a desativacao chega as organizacoes que ja gravaram o
 * catalogo - a carga troca pela versao do codigo todo item da listagem que
 * ninguem editou (created_at === updated_at, que o gerador mantem).
 *
 * Ficam ATIVOS de proposito, por serem MAIS detalhados que o curado: Silica
 * livre cristalizada - poeira respiravel e - poeira total (o risk-cat-09 nao
 * separa a fracao), as duas Vibracoes de corpo inteiro, aren e VDVR (o
 * risk-cat-04 junta as duas), os tres Fumos metalicos especificos - Cobre,
 * Manganes e Ferro (so o "Fumos metalicos" generico repete o risk-cat-08) - e
 * Petroleo, xisto betuminoso, gas natural e seus derivados (agente mais amplo
 * que os oleos e graxas do risk-cat-12).
 *
 * Nome exato da fonte. Nome que nao virar item, ou id que nao for de um item
 * curado, faz a geracao falhar mostrando o nome.
 */
export const DUPLICATAS_DE_CURADOS = {
  'Ruído impulsivo ou de impacto': 'risk-cat-02',
  'Trabalhos com exposição ao calor nos termos da NR-15, da Portaria 3.214/1978': 'risk-cat-03',
  'Vibrações localizadas (mão-braço)': 'risk-cat-05',
  'Radiações não ionizantes': 'risk-cat-06',
  'Frio': 'risk-cat-07',
  'Fumos metálicos': 'risk-cat-08',
  'Óleos e Graxas Minerais (Hidrocarbonetos Aromáticos)': 'risk-cat-12',
  'Microrganismos Patogênicos': 'risk-cat-13',
  'Agentes biológicos (bactérias, vírus, fungos e outros)': 'risk-cat-13',
  'Trabalhos em estabelecimentos de saúde com contato com pacientes portadores de doenças infectocontagiosas ou com manuseio de materiais contaminados': 'risk-cat-13',
  'Trabalhos em galerias, fossas e tranques de esgoto': 'risk-cat-14',
  'Levantamento e transporte manual de cargas ou volumes': 'risk-cat-15',
  'Trabalho em posturas incômodas ou pouco confortáveis por longos períodos': 'risk-cat-16',
  'Exigência de posturas inadequadas': 'risk-cat-16',
  'Frequente execução de movimentos repetitivos': 'risk-cat-17',
  'Trabalho em Altura': 'risk-cat-18',
  'Queda com diferença de nível': 'risk-cat-18',
  'Máquinas e equipamentos sem proteção': 'risk-cat-19',
  'Condições ou procedimentos que possam provocar contato com eletricidade': 'risk-cat-20',
  'Trabalho em Espaço Confinado': 'risk-cat-21',
  'Projeção de partículas': 'risk-cat-23',
  'Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999': 'risk-cat-25',
};

/**
 * Codigos da Tabela 24 que a listagem nao traz e que o usuario atribuiu em
 * 09/10/2026, sobre a sugestao pelo nome (composto do elemento ou agente que
 * o Anexo IV lista). So os de confianca alta: os derivados do benzeno, o BHC,
 * a diclorobenzidina, a perclorometil mercaptana e os tres falsos positivos
 * continuam sem codigo, porque o enquadramento deles e duvidoso. Quando a
 * substancia cabe em dois codigos, o principal vai no item e o outro, na
 * nota. A geracao falha se o nome nao existir na fonte, se a linha ja tiver
 * codigo ou se o codigo nao existir na Tabela 24.
 *
 * Nome -> [codigo, complemento da nota].
 */
export const CODIGOS_ATRIBUIDOS_PELO_USUARIO = {
  '1-Butanotiol (n-Butil mercaptana)': ['01.19.004'],
  '2-Metilciclopentadienil manganês tricarbonila': ['01.14.001'],
  '4-(metilnitrosamino)-1-(3-piridil)1-butanona (NNK)': ['01.19.029'],
  'Ácido crômico (névoa)': ['01.10.001'],
  'Alcatrão de hulha, produtos voláteis como aerossóis solúveis em benzeno (breu de alcatrão de hulha)': ['01.07.001'],
  'Arseneto de gálio': ['01.01.001'],
  'Arsina': ['01.01.001'],
  'Chumbo tetraetila': ['01.08.001'],
  'Chumbo tetrametila': ['01.08.001'],
  'Cloreto de cromila': ['01.10.001', 'Também 01.09.001 (cloro e seus compostos tóxicos).'],
  'Clorodifenil (42% de Cloro)': ['01.09.001'],
  'Clorodifenil (54% de Cloro)': ['01.09.001'],
  'Cromato de cálcio': ['01.10.001'],
  'Cromato de chumbo': ['01.08.001', 'Também 01.10.001 (cromo e seus compostos tóxicos).'],
  'Cromato de estrôncio': ['01.10.001'],
  'Cromato de terc-butila': ['01.10.001'],
  'Cromatos de zinco': ['01.10.001'],
  'Cromita - processamento do minério (cromato)': ['01.10.001'],
  'Destilação do alcatrão de hulha': ['01.07.001'],
  'Ruído impulsivo ou de impacto': ['02.01.001'],
  'Dióxido de cloro': ['01.09.001'],
  'Dodecil mercaptana': ['01.19.004'],
  'Etil mercaptana (Etanotiol)': ['01.19.004'],
  'Fenil mercaptana': ['01.19.004'],
  'Gás natural e seus derivados': ['01.17.001'],
  'GLP (gás liquefeito do petróleo)': ['01.17.001'],
  'Metil mercaptana (metanotiol)': ['01.19.004'],
  'Óleo mineral, excluídos os fluídos de trabalho com metais - Puro, alta e severamente refinado': ['01.17.001'],
  'Óleo mineral, excluídos os fluídos de trabalho com metais - Refinação fraca ou média': ['01.17.001'],
  'Oxicloreto de fósforo': ['01.12.001', 'Também 01.09.001 (cloro e seus compostos tóxicos).'],
  'Pentacloreto de fósforo': ['01.12.001', 'Também 01.09.001 (cloro e seus compostos tóxicos).'],
  'Pentafluoreto de bromo': ['01.05.001'],
  'Pentassulfeto de fósforo': ['01.12.001'],
  'Plutônio': ['02.01.006'],
  'Rádio-224 e seus produtos de decaimento': ['02.01.006'],
  'Rádio-226 e seus produtos de decaimento': ['02.01.006'],
  'Rádio-228 e seus produtos de decaimento': ['02.01.006'],
  'Radônio-222 e seus produtos de decaimento': ['02.01.006', 'Se a exposição for em mineração, 02.01.008.'],
  'Sulfeto de níquel': ['01.16.001'],
  'Tório-232 e seus produtos de decaimento': ['02.01.006'],
  'Tricloreto de fósforo': ['01.12.001', 'Também 01.09.001 (cloro e seus compostos tóxicos).'],
  'Trifluoreto de cloro': ['01.09.001'],
  'Urânio (natural) compostos solúveis e insolúveis': ['02.01.006'],
  'Xisto betuminoso e seus derivados': ['01.17.001'],
  'Óleos e Graxas Minerais (Hidrocarbonetos Aromáticos)': ['01.17.001'],
  'Fumos metálicos (Manganês)': ['01.14.001'],
};

const NOTA_DO_CODIGO_ATRIBUIDO =
  'Código atribuído pelo usuário em 09/10/2026, sobre sugestão pelo nome: a listagem não traz código.';
export const notaDoCodigoAtribuido = (complemento) =>
  (complemento ? `${NOTA_DO_CODIGO_ATRIBUIDO} ${complemento}` : NOTA_DO_CODIGO_ATRIBUIDO);

/**
 * Conferencia com a ACGIH (NR-09, item 9.6.1.1), pedida pelo usuario em
 * 11/10/2026, nos agentes que a NR-15 nao fixa. So o que as paginas publicas
 * da ACGIH mostram (docs/fontes/acgih-consulta-2026-10.txt): cadmio e acido
 * nitrico mudam; acido fosforico confere. 0 em "acgih" e "sai": o acido
 * nitrico nao tem mais TLV-TWA, e nivel de acao sem limite de jornada seria
 * inventado.
 */
export const CORRECOES_PELA_ACGIH = [
  { nome: 'Cádmio e seus compostos tóxicos', campo: 'tolerance_limit_value', listagem: 0.039, acgih: 0.01 },
  { nome: 'Cádmio e seus compostos tóxicos', campo: 'action_level_value', listagem: 0.019, acgih: 0.005 },
  { nome: 'Ácido nítrico', campo: 'tolerance_limit_value', listagem: 1.56, acgih: 0.025 },
  { nome: 'Ácido nítrico', campo: 'action_level_value', listagem: 0.78, acgih: 0 },
];

/**
 * Os 15 de confianca baixa (decisao do usuario em 11/10/2026): o codigo fica
 * VAZIO, para preenchimento manual, e o item diz a sugestao pelo nome.
 * Nome -> codigos sugeridos.
 */
export const CODIGO_A_DEFINIR = {
  '1,2,4-Triclorobenzeno': ['01.03.001', '01.09.001'],
  '3,3’-Dicloro-benzidina (Diclorobenzidina)': ['01.19.007'],
  'BHC (hexacloreto de benzeno ou hexaclorobenzeno)': ['01.09.001'],
  'Cloreto de fenila (clorobenzeno)': ['01.03.001', '01.09.001'],
  'Dinitrobenzeno, todos os isômeros': ['01.03.001'],
  'Divinil benzeno': ['01.03.001'],
  'Isopropil benzeno (cumeno)': ['01.03.001'],
  'Nitrobenzeno': ['01.03.001'],
  'o-Diclorobenzeno': ['01.03.001', '01.09.001'],
  'p-Diclorobenzeno': ['01.03.001', '01.09.001'],
  'Pentacloronitrobenzeno': ['01.03.001', '01.09.001'],
  'Perclorometil mercaptana': ['01.19.004', '01.09.001'],
  'p-Nitroclorobenzeno': ['01.03.001', '01.09.001'],
  'Triclorometil benzeno': ['01.03.001', '01.09.001'],
  'Trimetil benzeno (mistura de isômeros)': ['01.03.001'],
};

/**
 * Linha da listagem que repete outra da propria listagem: nome -> nome do
 * item que fica. Sai INACTIVE, como as duplicatas de curados.
 */
export const DUPLICATAS_NA_LISTAGEM = {
  // "Diclorofluormetano" e outro composto; o "(freon 12)" e os numeros da
  // linha (3.860 e 1.930 mg/m3) sao do Diclorodifluormetano, que a listagem
  // ja traz e que a NR-15 marca como valor teto.
  'Diclorofluormetano (freon 12)': 'Diclorodifluormetano',
};

/**
 * Limite que a listagem pos no agente errado: o numero e o de outro agente do
 * Quadro n. 1. Limite e nivel de acao saem, e o item fica sem valor fixo.
 * Nome -> [agente a quem o numero pertence, linha em docs/fontes/nr15-anexo11.txt].
 */
export const LIMITES_DE_OUTRO_AGENTE = {
  'Dietanolamina': ['Dietil amina', 338],
};

/**
 * De onde vem o limite que a NR-15 nao fixa, para o texto do limite dizer
 * isso em vez de parecer norma. Na falta de limite na NR-15, a NR-09 (item
 * 9.6.1.1, docs/fontes/nr09-nivel-de-acao.txt) manda usar a ACGIH; o valor da
 * listagem nao foi conferido contra ela.
 */
const SEM_LIMITE_NA_NR15 = 'listagem; a NR-15 não fixa limite';
const ASFIXIANTE_SIMPLES = 'listagem; NR-15, Anexo 11: asfixiante simples, oxigênio mínimo de 18% em volume';
export const ORIGEM_DO_LIMITE = {
  'Cádmio e seus compostos tóxicos': 'ACGIH, vigente em 10/2026: TLV-TWA como Cd, partículas totais; fração respirável 0,002 mg/m³; A2',
  'Acetato de vinila': SEM_LIMITE_NA_NR15,
  'Ácido fosfórico': 'ACGIH, vigente em 10/2026: TLV-TWA; TLV-STEL 3 mg/m³',
  'Ácido nítrico': 'ACGIH, vigente em 10/2026: TLV-STEL, fração inalável e vapor; sem TLV-TWA nem nível de ação',
  'Madeira, poeiras - Todas as outras espécies': SEM_LIMITE_NA_NR15,
  'Etileno': ASFIXIANTE_SIMPLES,
  'Propileno': ASFIXIANTE_SIMPLES,
  'Óxido nitroso': ASFIXIANTE_SIMPLES,
  'Radiações ionizantes': 'listagem; NR-15, Anexo 5: limites da CNEN-NN-3.01',
};

// ---------------------------------------------------------------------------
// Conferencia com a NR-15 (texto oficial guardado em docs/fontes/)
// ---------------------------------------------------------------------------

/**
 * POR QUE. O limite da listagem vai para o PGR e para o laudo de
 * insalubridade, entao tem de ser o da norma - e norma nunca de memoria. Os
 * itens abaixo foram conferidos, um a um, contra o Quadro n. 1 do Anexo 11 da
 * NR-15 vigente, extraido do PDF oficial do MTE para
 * docs/fontes/nr15-anexo11.txt (URL, data, versao e comando no cabecalho de
 * la), e a vibracao contra o Anexo 8 (docs/fontes/nr15-trechos.txt). O
 * verificador rele esses textos por um caminho proprio e prova cada numero,
 * cada grau e cada linha citada.
 *
 * CONFERIDO = o nome da listagem, ou um sinonimo que ela da entre
 * parenteses, e o nome de um agente do Quadro - ou de um "vide" do proprio
 * Quadro -, ignorando acento, caixa e pontuacao; e a unidade e uma das colunas
 * do Quadro (ppm ou mg/m3, ate 48 h/semana). Grafia diferente ("Cloropreno" x
 * "Cloroprene"), nome mais amplo ("Chumbo e seus compostos toxicos" x
 * "Chumbo"), gas que o Quadro so da como "asfixiante simples" e agente fora
 * do Quadro NAO contam: ficam sem fonte e sem grau, para o usuario decidir.
 * Uma excecao, anotada: "Alcool etilico (etanol)" casa pelo nome principal; o
 * "etanol" do parentese cai no "Etanol (vide acetaldeido)" do Quadro, que e
 * erro da propria norma.
 *
 * O item conferido ganha o texto do limite com a fonte ("78 ppm (NR-15,
 * Anexo 11)") e a insalubridade que a norma da ao agente: o adicional do grau
 * da coluna "Grau de insalubridade" (NR-15, itens 15.2.1 a 15.2.3) e a base
 * legal. Nao e invencao: e o que a norma diz desse agente acima do limite.
 *
 * NIVEL DE ACAO. A NR-09, item 9.6.1 b), manda usar para agente quimico a
 * metade do limite da NR-15: a geracao falha se um item conferido no Anexo 11
 * nao tiver nivel de acao = limite / 2. Na vibracao o nivel vem do Anexo I da
 * NR-09 (itens 5.2.2 e 5.3.2), e o verificador o confere no texto.
 */
export const FONTE_ANEXO_11 = 'NR-15, Anexo 11';
export const FONTE_ANEXO_8 = 'NR-15, Anexo 8';

/** Grau da norma -> adicional de insalubridade (NR-15, itens 15.2.1 a 15.2.3). */
export const ADICIONAL_DO_GRAU = { 'máximo': '40%', 'médio': '20%', 'mínimo': '10%' };

/**
 * Nome na listagem -> [agente como o Quadro n. 1 o escreve, grau, linha do
 * agente em docs/fontes/nr15-anexo11.txt, e 'pele' quando o agente tem "+"
 * na coluna "Absorcao tambem p/pele"]. A marca vira skin_absorption true; os
 * conferidos sem ela, false.
 */
const CONFERIDOS_NO_ANEXO_11 = [
  ['Estireno (vinilbenzeno)', 'Estireno', 'médio', 366],
  ['Dissulfeto de carbono', 'Dissulfeto de carbono', 'máximo', 362, 'pele'],
  ['Acrilonitrila', 'Acrilonitrila', 'máximo', 168, 'pele'],
  ['1-3-butadieno', '1,3 Butadieno', 'médio', 227],
  ['Diisocianato de tolueno (TDI)', '2,4 Diisocianato de tolueno (TDI)', 'máximo', 342],
  ['Óxido de etileno', 'Óxido de etileno', 'máximo', 522],
  ['Estilbenzeno (etilbenzeno)', 'Etilbenzeno', 'médio', 397],
  ['Dimetilamina', 'Dimetilamina', 'médio', 348],
  ['1,1,1 Tricloroetano (Metilclorofórmio)', 'Metilclorofórmio', 'médio', 483],
  ['1,1,2-Tricloro-1,2,2-trifluoretano (freon 113)', '1,1,2 Tricloro-1,2,2 trifluoretano', 'médio', 597],
  ['1,1,2-Tricloroetano (Tricloreto de vinila)', '1,1,2 Tricloroetano', 'médio', 589, 'pele'],
  ['1,1-Dicloro-1-nitroetano', '1,1 Dicloro-1-nitroetano', 'máximo', 332],
  ['1,1-Dicloroetano', '1,1 Dicloroetano', 'médio', 318],
  ['1,2 Dicloroetano (Dicloreto de etileno)', '1,2 Dicloroetano', 'máximo', 320],
  ['1,2 Dicloroetileno', '1,2 Dicloroetileno', 'médio', 326],
  ['1,2,3-Tricloropropano', '1,2,3 Tricloropropano', 'máximo', 595],
  ['1,2-Dibramoetano (dibrometo de etileno)', '1,2-Dibramoetano', 'médio', 312, 'pele'],
  ['1-Butanotiol (n-Butil mercaptana)', 'n-Butil mercaptana', 'médio', 245],
  ['1-Cloro-1-nitropropano', '1-Cloro 1-nitropropano', 'máximo', 297],
  ['1-Nitropropano', '1 - Nitropropano', 'médio', 518],
  ['2-Butóxi etanol (EGBE) (butil cellosolve) (éter monobutílico do etileno glicol)', 'Butil cellosolve', 'médio', 243, 'pele'],
  ['2-Etoxietanol (cellosolve ou Éter monoetílico do etileno glicol)', '2-Etoxietanol', 'médio', 409, 'pele'],
  ['2-Nitropropano', '2 - Nitropropano', 'médio', 520],
  ['Acetaldeído (aldeído acético)', 'Acetaldeído', 'máximo', 126],
  ['Acetato de 2-etoxi etila (Acetato de cellosolve ou Acetato de éter monoetílico de etilenoglicol)', 'Acetato de cellosolve', 'médio', 128, 'pele'],
  ['Acetato de etila', 'Acetato de etila', 'mínimo', 136],
  ['Acetona (propanona)', 'Acetona', 'mínimo', 144],
  ['Acetonitrila (cianeto de metila)', 'Acetonitrila', 'máximo', 146],
  ['Ácido acético (ácido etanoico)', 'Ácido acético', 'médio', 148],
  ['Ácido cianídrico (cianeto de hidrogênio, gás cianídrico)', 'Ácido cianídrico', 'máximo', 150, 'pele'],
  ['Ácido clorídrico (cloreto de hidrogênio, gás clorídrico)', 'Ácido clorídrico', 'máximo', 152],
  ['Ácido crômico (névoa)', 'Ácido crômico (névoa)', 'máximo', 154],
  ['Ácido fluorídrico', 'Ácido fluorídrico', 'máximo', 158],
  ['Ácido metanoico (ácido fórmico)', 'Ácido fórmico', 'médio', 160],
  ['Acrilato de metila', 'Acrilato de metila', 'máximo', 166, 'pele'],
  ['Álcool etílico (etanol)', 'Álcool etílico', 'mínimo', 180],
  ['Álcool furfurílico', 'Álcool furfurílico', 'médio', 182, 'pele'],
  ['Álcool isoamílico', 'Álcool isoamílico', 'mínimo', 170],
  ['Álcool isobutílico (isobutanol)', 'Álcool isobutílico', 'médio', 174],
  ['Álcool isopropílico (isopropanol ou 2-propanol)', 'Álcool isopropílico', 'médio', 192, 'pele'],
  ['Álcool metil amílico (metil isobutilcarbinol)', 'Metil isobutilcarbinol', 'máximo', 489, 'pele'],
  ['Álcool metílico (metanol)', 'Álcool metílico', 'máximo', 188, 'pele'],
  ['Álcool n-butílico (n-butanol)', 'Álcool n-butílico', 'máximo', 172, 'pele'],
  ['Álcool n-propílico (n-propanol)', 'Álcool n-propílico', 'médio', 190, 'pele'],
  ['Álcool sec-butílico (sec-butanol)', 'Álcool sec-butílico (2-butanol)', 'médio', 176],
  ['Álcool terc-butílico', 'Álcool terc-butílico', 'médio', 178],
  ['Amônia (gás amoníaco)', 'Amônia', 'médio', 198],
  ['Anidro sulfuroso (dióxido de enxofre)', 'Dióxido de enxofre', 'máximo', 358],
  ['Anilina', 'Anilina', 'máximo', 204, 'pele'],
  ['Brometo de etila (bromoetano)', 'Brometo de etila', 'máximo', 213],
  ['Brometo de metila (bromometano)', 'Brometo de metila', 'máximo', 215, 'pele'],
  ['Cianogênio', 'Cianogênio', 'máximo', 259],
  ['Ciclohexano', 'Ciclohexano', 'médio', 261],
  ['Ciclohexanol', 'Ciclohexanol', 'máximo', 263],
  ['Ciclohexilamina', 'Ciclohexilamina', 'máximo', 265, 'pele'],
  ['Cloreto de etila (cloroetano)', 'Cloreto de etila', 'médio', 269],
  ['Cloreto de fenila (clorobenzeno)', 'Clorobenzeno', 'médio', 285],
  ['Cloreto de metila', 'Cloreto de metila', 'máximo', 275],
  ['Cloreto de vinila (cloroetílico)', 'Cloreto de vinila', 'máximo', 279],
  ['Cloreto de vinilideno (1,1-Dicloreotileno)', 'Cloreto de vinilideno', 'máximo', 281],
  ['Clorobromometano', 'Clorobromometano', 'máximo', 287],
  ['Clorodifluormetano (freon 22)', 'Clorodifluometano (freon 22)', 'mínimo', 293],
  ['Clorofórmio (Triclorometano)', 'Clorofórmio', 'máximo', 295],
  ['Decaborano', 'Decaborano', 'máximo', 304, 'pele'],
  ['Demeton (Systox)', 'Demeton', 'máximo', 306, 'pele'],
  ['Diborano', 'Diborano', 'máximo', 310],
  ['Diclorodifluormetano', 'Diclorodifluormetano (freon 12)', 'mínimo', 316],
  ['Diclorometano (Cloreto de metileno)', 'Cloreto de metileno', 'máximo', 277],
  ['Diclorotetrafluoretano (freon 114)', 'Diclorotetrafluoretano (freon 114)', 'mínimo', 336],
  ['Dietil éter (Éter etílico)', 'Éter etílico', 'médio', 380],
  ['Diisopropilamina', 'Diisopropilamina', 'máximo', 344, 'pele'],
  ['Dimetilacetamida (N,N-Dimetilacetamida)', 'Dimetilacetamida', 'máximo', 346, 'pele'],
  ['Dióxido de carbono (gás carbônico)', 'Dióxido de carbono', 'mínimo', 354],
  ['Dióxido de cloro', 'Dióxido de cloro', 'máximo', 356],
  ['Dióxido de nitrogênio', 'Dióxido de nitrogênio', 'máximo', 360],
  ['Éter monometílico do etileno glicol (metil cellosolve ou 2-Metoxi etanol (EGME))', 'Metil cellosolve', 'máximo', 479, 'pele'],
  ['Etil mercaptana (Etanotiol)', 'Etil mercaptana', 'médio', 405],
  ['Etilamina', 'Etilamina', 'máximo', 394],
  ['Etilenoimina', 'Etilenoimina', 'máximo', 403, 'pele'],
  ['Fenol', 'Fenol', 'máximo', 411, 'pele'],
  ['Fluortriclorometano (triclorofluormetano ou freon 11)', 'Fluortriclorometano (freon 11)', 'médio', 413],
  ['Formaldeído (formol ou Aldeído fórmico)', 'Formaldeído (formol)', 'máximo', 415],
  ['Fosfina (fosfamina)', 'Fosfina (fosfamina)', 'máximo', 417],
  ['Fosgênio (cloreto de carbonila)', 'Fosgênio', 'máximo', 419],
  ['Hidrazina (diamina)', 'Hidrazina', 'máximo', 451, 'pele'],
  ['Hidreto de antimônio (Estibina)', 'Estibina', 'máximo', 364],
  ['Isopropil benzeno (cumeno)', 'Cumeno', 'máximo', 302, 'pele'],
  ['Isopropilamina', 'Isopropilamina', 'médio', 461],
  ['Metacrilato de metila', 'Metacrilato de metila', 'mínimo', 469],
  ['Metil demeton', 'Metil demeton', 'máximo', 485, 'pele'],
  ['Metil etil cetona (MEK) (Butanona)', 'metil etil cetona', 'médio', 487],
  ['Metil mercaptana (metanotiol)', 'Metil mercaptana (metanotiol)', 'médio', 492],
  ['Metilamina', 'Metilamina', 'máximo', 477],
  ['Metilciclohexanol', 'Metil ciclohexanol', 'médio', 481],
  ['Monometil hidrazina (metil hidrazina)', 'Monometil hidrazina', 'máximo', 498, 'pele'],
  ['Monóxido de carbono', 'Monóxido de carbono', 'máximo', 500],
  ['n-Butano', 'n-Butano', 'médio', 229],
  ['n-Butilamina', 'n-Butilamina', 'máximo', 241, 'pele'],
  ['Negro de fumo', 'Negro de fumo(1)', 'máximo', 502],
  ['n-Etil morfolina', 'n-Etil morfolina', 'médio', 407, 'pele'],
  ['Nitrato de n-propila', 'Nitrato de n-propila', 'máximo', 512],
  ['Nitroetano', 'Nitroetano', 'médio', 514],
  ['Nitrometano', 'Nitrometano', 'máximo', 516],
  ['n-Pentano', 'n-Pentano', 'mínimo', 534],
  ['o-Diclorobenzeno', 'o-Diclorobenzeno', 'máximo', 314],
  ['Óxido nítrico', 'Óxido nítrico (NO)', 'máximo', 526],
  ['Ozona (ozônio)', 'Ozona', 'máximo', 530],
  ['Pentaborano', 'Pentaborano', 'máximo', 532],
  ['Percloroetileno (Tetracloroetileno)', 'Percloroetíleno', 'médio', 536, 'pele'],
  ['Piridina', 'Piridina', 'médio', 538],
  ['Propileno imina', 'Propileno imina', 'máximo', 550, 'pele'],
  ['Sulfeto de hidrogênio (Gás sulfídrico)', 'Gás sulfídrico', 'máximo', 445],
  ['Tetrabrometo de acetileno (1,1,2,2-Tetrabromoetano)', '1,1,2,2,Tetrabromoetano', 'médio', 560],
  ['Tetracloreto de carbono', 'Tetracloreto de carbono', 'máximo', 562, 'pele'],
  ['Tetracloroetano (1,1,2,2-Tetracloroetano)', 'Tetracloroetano', 'máximo', 564, 'pele'],
  ['Tetrahidrofurano', 'Tetrahidrofurano', 'máximo', 570],
  ['Tolueno (toluol)', 'Tolueno (toluol)', 'médio', 572, 'pele'],
  ['Tribromometano (Bromofórmio)', 'Bromofórmio', 'médio', 221, 'pele'],
  ['Tricloroetileno', 'Tricloroetileno', 'máximo', 591],
  ['Trietilamina', 'Trietilamina', 'máximo', 601],
  ['Xileno (xilol)', 'Xileno (xilol)', 'médio', 607, 'pele'],
  // Conferidos a pedido do usuario em 09/10/2026, com o nome do Quadro
  // diferente do da listagem: mesmo agente, mesma linha, mesmo numero (ou o
  // numero corrigido em CORRECOES_PELA_NR15). O sinonimo esta escrito no
  // verificador, que nao aceita nome diferente sem ele.
  ['Cloro e seus compostos tóxicos (exceto os abaixo especificados, que constam expressamente no Anexo IV do Decreto 3.048/1999)', 'Cloro', 'máximo', 283],
  ['Bromo e seus compostos tóxicos', 'Bromo', 'máximo', 217],
  ['Chumbo e seus compostos tóxicos', 'Chumbo', 'máximo', 253],
  ['Cloropreno', 'Cloroprene', 'máximo', 299, 'pele'],
  ['Biscloroetileter (éter dicloroetílico)', 'Éter decloroetílico', 'máximo', 378, 'pele'],
  ['1,1-Dimetil hidrazina', 'l,l Dimetil hidrazina', 'máximo', 352, 'pele'],
  ['Etilenoamina', 'Etilenoimina', 'máximo', 403, 'pele'],
  ['Dimetilformamida (N,N Dimetilformamida)', 'Dimetiformamida', 'médio', 350],
  ['Dimetilsulfato', 'Sulfato de dimetila', 'máximo', 552, 'pele'],
  ['Dietilamina', 'Dietil amina', 'médio', 338],
  ['Arsina', 'Arsina (arsenamina)', 'máximo', 209],
  ['Dicloreto de propileno (1,2-Dicloropropano)', '1,2 Dicloropropano', 'máximo', 334],
];

/**
 * Vibracao, conferida no Anexo 8 da NR-15: nome na listagem -> [parametro,
 * linha do limite em docs/fontes/nr15-trechos.txt]. Grau medio para todos
 * (Anexo 8, item 2.3).
 */
const CONFERIDOS_NO_ANEXO_8 = [
  ['Vibrações localizadas (mão-braço)', 'VMB: aren', 227],
  ['Vibração de corpo inteiro (aceleração resultante de exposição normalizada - aren)', 'VCI: aren', 231],
  ['Vibração de corpo inteiro (Valor da Dose de Vibração Resultante - VDVR)', 'VCI: VDVR', 232],
];

export const CONFERIDOS_NA_NR15 = [
  ...CONFERIDOS_NO_ANEXO_11.map(([nome, agente, grau, linha, marca]) => {
    if (marca !== undefined && marca !== 'pele') throw new Error(`CONFERIDOS_NO_ANEXO_11: "${nome}" tem a marca "${marca}"; a unica e 'pele'`);
    return { nome, fonte: FONTE_ANEXO_11, agente, grau, linha, pele: marca === 'pele' };
  }),
  ...CONFERIDOS_NO_ANEXO_8.map(([nome, agente, linha]) => ({ nome, fonte: FONTE_ANEXO_8, agente, grau: 'médio', linha })),
];

/**
 * CORRECOES PELA NR-15. Onde a listagem diverge da norma sem ambiguidade
 * (mesmo agente, mesma unidade), vale a norma - e a correcao fica aqui, nunca
 * na fonte do usuario. listagem = o que a fonte traz (0 e "sem valor fixo");
 * norma = o valor do Quadro n. 1; linha = a do agente em
 * docs/fontes/nr15-anexo11.txt. O nivel de acao corrigido e a metade do limite
 * corrigido (NR-09, item 9.6.1 b). Cada correcao tem de achar exatamente o
 * valor "listagem" no item; se a fonte mudar, a geracao falha em vez de
 * corrigir outra coisa.
 *
 * Casas decimais: a listagem registra sempre ao menos as casas do limite e do
 * nivel de acao (142 de 142 itens com limite). Quando o valor corrigido pede
 * mais casas (0,02; 0,75; 0,004), elas sobem junto - senao a medicao seria
 * registrada com menos precisao que o proprio limite. O relatorio lista quais.
 */
export const CORRECOES_PELA_NR15 = [
  { nome: '1,1-Dicloro-1-nitroetano', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 332 },
  { nome: 'Ácido clorídrico (cloreto de hidrogênio, gás clorídrico)', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 152 },
  { nome: 'Ácido crômico (névoa)', campo: 'tolerance_limit_value', listagem: 0, norma: 0.04, anexo: 'NR-15, Anexo 11', linha: 154 },
  { nome: 'Ácido crômico (névoa)', campo: 'action_level_value', listagem: 0, norma: 0.02, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Ácido fluorídrico', campo: 'tolerance_limit_value', listagem: 2, norma: 1.5, anexo: 'NR-15, Anexo 11', linha: 158 },
  { nome: 'Ácido fluorídrico', campo: 'action_level_value', listagem: 1, norma: 0.75, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Ácido metanoico (ácido fórmico)', campo: 'tolerance_limit_value', listagem: 1.5, norma: 7, anexo: 'NR-15, Anexo 11', linha: 160 },
  { nome: 'Ácido metanoico (ácido fórmico)', campo: 'action_level_value', listagem: 0.75, norma: 3.5, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Álcool n-butílico (n-butanol)', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 172 },
  { nome: 'Cloreto de vinila (cloroetílico)', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 279 },
  { nome: 'Demeton (Systox)', campo: 'tolerance_limit_value', listagem: 0.1, norma: 0.08, anexo: 'NR-15, Anexo 11', linha: 306 },
  { nome: 'Demeton (Systox)', campo: 'action_level_value', listagem: 0.05, norma: 0.04, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Diborano', campo: 'tolerance_limit_value', listagem: 0.1, norma: 0.08, anexo: 'NR-15, Anexo 11', linha: 310 },
  { nome: 'Diborano', campo: 'action_level_value', listagem: 0.05, norma: 0.04, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Diclorodifluormetano', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 316 },
  { nome: 'Dióxido de nitrogênio', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 360 },
  { nome: 'Formaldeído (formol ou Aldeído fórmico)', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 415 },
  { nome: 'Monometil hidrazina (metil hidrazina)', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 498 },
  { nome: 'n-Butilamina', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 241 },
  { nome: 'Pentaborano', campo: 'tolerance_limit_value', listagem: 0, norma: 0.008, anexo: 'NR-15, Anexo 11', linha: 532 },
  { nome: 'Pentaborano', campo: 'action_level_value', listagem: 0, norma: 0.004, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  // Pedidas pelo usuario em 09/10/2026, sobre o que a primeira conferencia
  // deixou em aberto: o cloro trazia em mg/m3 o numero do ppm; a
  // dimetilformamida, 7,81 em vez de 8; o sulfato de dimetila e valor teto; e
  // tres qualitativos ganham o limite do Quadro.
  { nome: 'Cloro e seus compostos tóxicos (exceto os abaixo especificados, que constam expressamente no Anexo IV do Decreto 3.048/1999)', campo: 'tolerance_limit_value', listagem: 0.8, norma: 2.3, anexo: 'NR-15, Anexo 11', linha: 283 },
  { nome: 'Cloro e seus compostos tóxicos (exceto os abaixo especificados, que constam expressamente no Anexo IV do Decreto 3.048/1999)', campo: 'action_level_value', listagem: 0.4, norma: 1.15, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Dimetilformamida (N,N Dimetilformamida)', campo: 'tolerance_limit_value', listagem: 7.81, norma: 8, anexo: 'NR-15, Anexo 11', linha: 350 },
  { nome: 'Dimetilformamida (N,N Dimetilformamida)', campo: 'action_level_value', listagem: 3.9, norma: 4, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Dimetilsulfato', campo: 'tolerance_limit_is_ceiling', listagem: false, norma: true, anexo: 'NR-15, Anexo 11', linha: 552 },
  { nome: 'Arsina', campo: 'tolerance_limit_value', listagem: 0, norma: 0.16, anexo: 'NR-15, Anexo 11', linha: 209 },
  { nome: 'Arsina', campo: 'action_level_value', listagem: 0, norma: 0.08, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Dietilamina', campo: 'tolerance_limit_value', listagem: 0, norma: 59, anexo: 'NR-15, Anexo 11', linha: 338 },
  { nome: 'Dietilamina', campo: 'action_level_value', listagem: 0, norma: 29.5, anexo: 'NR-09, item 9.6.1 b)', linha: null },
  { nome: 'Dicloreto de propileno (1,2-Dicloropropano)', campo: 'tolerance_limit_value', listagem: 0, norma: 275, anexo: 'NR-15, Anexo 11', linha: 334 },
  { nome: 'Dicloreto de propileno (1,2-Dicloropropano)', campo: 'action_level_value', listagem: 0, norma: 137.5, anexo: 'NR-09, item 9.6.1 b)', linha: null },
];

/** Campo do catalogo -> campo do registro do gerador. */
const CAMPO_DA_CORRECAO_NR15 = {
  tolerance_limit_value: 'limite',
  action_level_value: 'nivelDeAcao',
  tolerance_limit_is_ceiling: 'teto',
};

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

/** Casas decimais que o numero pede: 0.75 -> 2, 0.004 -> 3, null -> 0. */
const casasDe = (n) => {
  if (n === null) return 0;
  let k = 0;
  while (k < 10 && Math.round(n * 10 ** k) / 10 ** k !== n) k++;
  return k;
};

const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

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

/** "01.03.001 (Benzeno e seus compostos tóxicos)": o nome oficial, sem a ressalva entre parenteses. */
const codigoComNome = (tabela, c) => `${c} (${tabela[c].split(' (exceto')[0]})`;
export const textoDoCodigoADefinir = (tabela, codigos) =>
  `Código da Tabela 24 a definir: enquadramento duvidoso, preencha manualmente se se confirmar. Sugestão pelo nome, de confiança baixa: ${codigos.map((c) => codigoComNome(tabela, c)).join(' ou ')}.`;

export function gerar({ fonte, tabela24, curados: textoDosCurados }) {
  const { tabela, ausencia } = lerTabela24(tabela24);
  const curados = lerCurados(textoDosCurados);
  const curadoPorNome = new Map(curados.map((c) => [nomeNormalizado(c.name), c]));

  const linhas = fonte.split(/\r?\n/).map((texto, i) => ({ texto, numero: i + 1 }))
    .filter(({ texto }) => texto.trim() && !texto.startsWith('#'));

  const aplicadas = new Map(CORRECOES_DA_LISTAGEM.map((c) => [c, 0]));
  const aplicadasNr15 = new Map(CORRECOES_PELA_NR15.map((c) => [c, 0]));
  const conferidoPorNome = new Map();
  for (const c of CONFERIDOS_NA_NR15) {
    if (conferidoPorNome.has(c.nome)) throw new ErroDaListagem(`CONFERIDOS_NA_NR15: "${c.nome}" aparece duas vezes`);
    if (!tem(ADICIONAL_DO_GRAU, c.grau)) throw new ErroDaListagem(`CONFERIDOS_NA_NR15: "${c.nome}" tem grau "${c.grau}", que não é máximo, médio nem mínimo`);
    conferidoPorNome.set(c.nome, c);
  }
  const usadosNaConferencia = new Set();
  const usadasComoDuplicata = new Set();
  const registros = [];
  const deduplicadas = [];
  const ids = new Map(curados.map((c) => [c.id, c.name]));
  const idsCurados = new Set(curados.map((c) => c.id));
  const relatorio = {
    linhasLidas: linhas.length, coladas: [], divergenciasDeNome: [], ausenciaRetirada: [],
    quantitativoSemLimite: [], qualitativoComUnidade: [], unidadeSemMeio: [], casasAjustadas: [],
  };

  const usadosNaAtribuicao = new Set();
  const usadosComLimiteDeOutro = new Set();
  const aplicadasAcgih = new Map(CORRECOES_PELA_ACGIH.map((c) => [c, 0]));
  const usadosAADefinir = new Set();
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
      // O registro guarda a avaliacao com outro nome; a correcao usa o do item.
      const campo = c.campo === 'evaluation_type' ? 'avaliacao' : c.campo;
      if (registro[campo] !== c.de) falhar(`não traz "${c.de}" em ${c.campo}, que a correção esperava (a fonte mudou?)`);
      registro[campo] = c.para;
      aplicadas.set(c, aplicadas.get(c) + 1);
    }

    // Correcoes pela NR-15: o valor da fonte tem de ser exatamente o esperado.
    // 0 na fonte e null no registro ("sem valor fixo").
    const correcoesNr15 = CORRECOES_PELA_NR15.filter((x) => x.nome === r.nome);
    for (const c of correcoesNr15) {
      const campo = CAMPO_DA_CORRECAO_NR15[c.campo];
      if (!campo) falhar(`tem correção pela NR-15 em campo desconhecido: ${c.campo}`);
      const atual = campo === 'teto' ? registro.teto : (registro[campo] ?? 0);
      if (atual !== c.listagem) falhar(`não traz ${c.listagem} em ${c.campo}, que a correção pela NR-15 esperava (a fonte mudou?)`);
      registro[campo] = c.norma;
      aplicadasNr15.set(c, aplicadasNr15.get(c) + 1);
    }
    // Correcoes pela ACGIH: mesmo campo das da NR-15; 0 e "sai".
    const correcoesAcgih = CORRECOES_PELA_ACGIH.filter((x) => x.nome === r.nome);
    for (const c of correcoesAcgih) {
      const campo = CAMPO_DA_CORRECAO_NR15[c.campo];
      if (!campo || campo === 'teto') falhar(`tem correção pela ACGIH em campo desconhecido: ${c.campo}`);
      if ((registro[campo] ?? 0) !== c.listagem) falhar(`não traz ${c.listagem} em ${c.campo}, que a correção pela ACGIH esperava (a fonte mudou?)`);
      registro[campo] = c.acgih > 0 ? c.acgih : null;
      aplicadasAcgih.set(c, aplicadasAcgih.get(c) + 1);
    }
    if (tem(LIMITES_DE_OUTRO_AGENTE, r.nome)) {
      if (registro.limite === null) falhar('está em LIMITES_DE_OUTRO_AGENTE e não traz limite');
      registro.limite = null;
      registro.nivelDeAcao = null;
      usadosComLimiteDeOutro.add(r.nome);
    }
    // A listagem registra ao menos as casas do limite e do nivel de acao; o
    // valor corrigido pode pedir mais (ver CORRECOES_PELA_NR15).
    const casasPedidas = Math.max(casasDe(registro.limite), casasDe(registro.nivelDeAcao));
    if ((correcoesNr15.length || correcoesAcgih.length) && registro.casas !== null && casasPedidas > registro.casas) {
      relatorio.casasAjustadas.push({ nome: r.nome, de: registro.casas, para: casasPedidas });
      registro.casas = casasPedidas;
    }
    if (registro.casas !== null && casasPedidas > registro.casas) {
      falhar(`registra ${registro.casas} casa(s) decimal(is), menos do que o limite ou o nível de ação pedem (${casasPedidas})`);
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
    if (tem(CODIGO_A_DEFINIR, r.nome)) {
      if (registro.codigo) falhar(`está em CODIGO_A_DEFINIR e já traz o código ${registro.codigo}`);
      for (const c of CODIGO_A_DEFINIR[r.nome]) if (!tabela[c]) falhar(`tem em CODIGO_A_DEFINIR a sugestão ${c}, que não existe na Tabela 24`);
      registro.aDefinir = textoDoCodigoADefinir(tabela, CODIGO_A_DEFINIR[r.nome]);
      usadosAADefinir.add(r.nome);
    }
    // Codigo atribuido pelo usuario: so em linha que ficou sem codigo.
    if (tem(CODIGOS_ATRIBUIDOS_PELO_USUARIO, r.nome)) {
      const [codigo] = CODIGOS_ATRIBUIDOS_PELO_USUARIO[r.nome];
      if (registro.codigo) falhar(`está em CODIGOS_ATRIBUIDOS_PELO_USUARIO e já traz o código ${registro.codigo}`);
      if (!tabela[codigo]) falhar(`recebe em CODIGOS_ATRIBUIDOS_PELO_USUARIO o código ${codigo}, que não existe na Tabela 24`);
      registro.codigo = codigo;
      usadosNaAtribuicao.add(r.nome);
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

    // Conferido na NR-15: o limite tem de existir e, no Anexo 11, o nivel de
    // acao tem de ser a metade dele (NR-09, item 9.6.1 b).
    const conferido = conferidoPorNome.get(r.nome);
    if (conferido) {
      if (registro.limite === null) falhar(`está em CONFERIDOS_NA_NR15 (${conferido.fonte}) sem limite de tolerância`);
      if (conferido.fonte === FONTE_ANEXO_11 && registro.nivelDeAcao !== registro.limite / 2) {
        falhar(`está em CONFERIDOS_NA_NR15 e o nível de ação (${registro.nivelDeAcao}) não é a metade do limite (${registro.limite}), como manda a NR-09, item 9.6.1 b)`);
      }
      usadosNaConferencia.add(r.nome);
    }

    if (tem(DUPLICATAS_DE_CURADOS, r.nome)) {
      if (!idsCurados.has(DUPLICATAS_DE_CURADOS[r.nome])) {
        falhar(`está em DUPLICATAS_DE_CURADOS apontando para "${DUPLICATAS_DE_CURADOS[r.nome]}", que não é id de item curado`);
      }
      usadasComoDuplicata.add(r.nome);
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
  for (const [c, vezes] of aplicadasNr15) {
    if (vezes !== 1) {
      throw new ErroDaListagem(`CORRECOES_PELA_NR15: a correção de ${c.campo} em "${c.nome}" foi aplicada ${vezes} vez(es), e não 1 (o nome não existe na fonte?)`);
    }
  }
  // Nome que nao virou item: falha com o nome exato, para nao desativar ou
  // conferir outra coisa em silencio.
  for (const nome of Object.keys(DUPLICATAS_DE_CURADOS)) {
    if (!usadasComoDuplicata.has(nome)) throw new ErroDaListagem(`DUPLICATAS_DE_CURADOS: "${nome}" não existe na fonte (ou não virou item)`);
  }
  for (const [c, n] of aplicadasAcgih) {
    if (n !== 1) throw new ErroDaListagem(`CORRECOES_PELA_ACGIH: "${c.nome}" / ${c.campo} aplicada ${n} vez(es)`);
  }
  for (const nome of Object.keys(CODIGO_A_DEFINIR)) {
    if (!usadosAADefinir.has(nome)) throw new ErroDaListagem(`CODIGO_A_DEFINIR: "${nome}" não existe na fonte (ou não virou item)`);
  }
  for (const nome of Object.keys(LIMITES_DE_OUTRO_AGENTE)) {
    if (!usadosComLimiteDeOutro.has(nome)) throw new ErroDaListagem(`LIMITES_DE_OUTRO_AGENTE: "${nome}" não existe na fonte (ou não virou item)`);
  }
  const registroDe = (nome) => registros.find((x) => x.nome === nome);
  for (const [nome, alvo] of Object.entries(DUPLICATAS_NA_LISTAGEM)) {
    if (!registroDe(nome) || !registroDe(alvo)) throw new ErroDaListagem(`DUPLICATAS_NA_LISTAGEM: "${nome}" ou "${alvo}" não é item da listagem`);
    if (tem(DUPLICATAS_NA_LISTAGEM, alvo) || tem(DUPLICATAS_DE_CURADOS, alvo)) throw new ErroDaListagem(`DUPLICATAS_NA_LISTAGEM: "${alvo}" também é duplicata`);
  }
  for (const nome of Object.keys(ORIGEM_DO_LIMITE)) {
    const reg = registroDe(nome);
    if (!reg) throw new ErroDaListagem(`ORIGEM_DO_LIMITE: "${nome}" não é item da listagem`);
    if (reg.limite === null) throw new ErroDaListagem(`ORIGEM_DO_LIMITE: "${nome}" não tem limite`);
    if (conferidoPorNome.has(nome)) throw new ErroDaListagem(`ORIGEM_DO_LIMITE: "${nome}" foi conferido na NR-15, e a origem é a norma`);
  }
  for (const nome of Object.keys(CODIGOS_ATRIBUIDOS_PELO_USUARIO)) {
    if (!usadosNaAtribuicao.has(nome)) throw new ErroDaListagem(`CODIGOS_ATRIBUIDOS_PELO_USUARIO: "${nome}" não existe na fonte (ou não virou item)`);
  }
  for (const nome of conferidoPorNome.keys()) {
    if (!usadosNaConferencia.has(nome)) throw new ErroDaListagem(`CONFERIDOS_NA_NR15: "${nome}" não existe na fonte (ou não virou item)`);
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
  relatorio.correcoesNr15 = CORRECOES_PELA_NR15;
  relatorio.conferidos = CONFERIDOS_NA_NR15;
  relatorio.duplicatasDesativadas = Object.entries(DUPLICATAS_DE_CURADOS);
  relatorio.quantitativosNaoConferidos = registros
    .filter((r) => r.avaliacao === 'QUANTITATIVA' && !conferidoPorNome.has(r.nome))
    .map((r) => `${r.nome} [${r.limite ?? 'sem limite'} ${r.standard_unit}]`);

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
 * probabilidade, periculosidade e aposentadoria especial ficam AUSENTES: a
 * listagem nao os traz, e inventa-los poria no PGR do cliente uma afirmacao
 * que ninguem fez. Insalubridade so nos itens conferidos na NR-15 (abaixo),
 * porque ai e a norma que a afirma.
 *
 * CONFERENCIA COM A NR-15
 *
 * ${CONFERIDOS_NA_NR15.length} itens foram conferidos no texto oficial: ${CONFERIDOS_NA_NR15.filter((c) => c.fonte === FONTE_ANEXO_11).length} no Quadro n. 1 do Anexo 11
 * (docs/fontes/nr15-anexo11.txt) e ${CONFERIDOS_NA_NR15.filter((c) => c.fonte === FONTE_ANEXO_8).length} de vibracao no Anexo 8
 * (docs/fontes/nr15-trechos.txt) - CONFERIDOS_NA_NR15, com o agente como a
 * norma o escreve e a linha. Neles o texto do limite cita a fonte ("78 ppm
 * (NR-15, Anexo 11)") e a insalubridade e a da norma: o adicional do grau
 * (NR-15, itens 15.2.1 a 15.2.3: maximo 40%, medio 20%, minimo 10%) e a base
 * legal. Onde a listagem divergia da norma sem ambiguidade, vale a norma
 * (CORRECOES_PELA_NR15, ${CORRECOES_PELA_NR15.length} correcoes em ${new Set(CORRECOES_PELA_NR15.map((c) => c.nome)).size} itens); os numeros abaixo ja vem
 * corrigidos. Nome diferente, agente fora do Quadro ou unidade sem conversao
 * direta nao foram corrigidos nem ganharam grau: a decisao e do usuario.
 *
 * DUPLICATAS DE ITENS CURADOS
 *
 * ${Object.keys(DUPLICATAS_DE_CURADOS).length} itens repetem um item curado no mesmo nivel de detalhe
 * (DUPLICATAS_DE_CURADOS): saem com status INACTIVE e duplicate_of_id = id do
 * curado, para o seletor nao oferecer o mesmo risco duas vezes. Podem ser
 * reativados na tela. created_at e updated_at sao sempre iguais: e assim que a
 * carga reconhece o item que ninguem editou e o troca por esta versao.
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
 * CODIGOS ATRIBUIDOS PELO USUARIO
 *
 * ${Object.keys(CODIGOS_ATRIBUIDOS_PELO_USUARIO).length} linhas sem codigo na listagem receberam codigo da Tabela 24 por
 * decisao do usuario em 09/10/2026 (CODIGOS_ATRIBUIDOS_PELO_USUARIO), com
 * nota no item. Os radioativos com 02.01.006 passaram a FISICO
 * (CORRECOES_DA_LISTAGEM).
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
  campo: 'group' | 'propagation_paths' | 'standard_unit' | 'evaluation_type';
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

/** Nome na listagem -> id do item curado que ele repete. O item sai INACTIVE. */
export const DUPLICATAS_DE_CURADOS: Record<string, string> = {
${Object.entries(DUPLICATAS_DE_CURADOS).map(([k, v]) => `  ${aspas(k)}: ${aspas(v)},`).join('\n')}
};

/** Linha que repete outra da propria listagem: nome -> id do item que fica. Sai INACTIVE. */
export const DUPLICATAS_NA_LISTAGEM: Record<string, string> = {
${Object.entries(DUPLICATAS_NA_LISTAGEM).map(([k, v]) => `  ${aspas(k)}: ${aspas(idDoNome(v))},`).join('\n')}
};

/** Limite que pertencia a outro agente do Quadro n. 1 e saiu: nome -> [agente, linha]. */
export const LIMITES_DE_OUTRO_AGENTE: Record<string, [string, number]> = {
${Object.entries(LIMITES_DE_OUTRO_AGENTE).map(([k, [a, l]]) => `  ${aspas(k)}: [${aspas(a)}, ${l}],`).join('\n')}
};

/** De onde vem o limite que a NR-15 nao fixa: vai entre parenteses no texto do limite. */
export const ORIGEM_DO_LIMITE: Record<string, string> = {
${Object.entries(ORIGEM_DO_LIMITE).map(([k, v]) => `  ${aspas(k)}: ${aspas(v)},`).join('\n')}
};

/** Correcoes pela ACGIH (NR-09, 9.6.1.1): 0 em "acgih" e "o campo sai". */
export const CORRECOES_PELA_ACGIH: Array<{ nome: string; campo: 'tolerance_limit_value' | 'action_level_value'; listagem: number; acgih: number }> = [
${CORRECOES_PELA_ACGIH.map((c) => `  { nome: ${aspas(c.nome)}, campo: ${aspas(c.campo)}, listagem: ${c.listagem}, acgih: ${c.acgih} },`).join('\n')}
];

/** Codigo da Tabela 24 a definir a mao: nome -> texto que vai ao item, com a sugestao pelo nome. */
export const CODIGO_A_DEFINIR: Record<string, string> = {
${registros.filter((r) => r.aDefinir).map((r) => `  ${aspas(r.nome)}: ${aspas(r.aDefinir)},`).join('\n')}
};

/** Nome na listagem -> codigo da Tabela 24 atribuido pelo usuario e a nota que vai ao item. */
export const CODIGOS_ATRIBUIDOS_PELO_USUARIO: Record<string, { codigo: string; nota: string }> = {
${Object.entries(CODIGOS_ATRIBUIDOS_PELO_USUARIO).map(([k, [codigo, complemento]]) => `  ${aspas(k)}: { codigo: ${aspas(codigo)}, nota: ${aspas(notaDoCodigoAtribuido(complemento))} },`).join('\n')}
};

export type GrauDaNr15 = 'máximo' | 'médio' | 'mínimo';

export interface ConferidoNaNr15 {
  nome: string;
  fonte: string;
  /** O agente (ou o parametro, na vibracao) como a norma o escreve. */
  agente: string;
  grau: GrauDaNr15;
  /** Linha em docs/fontes/nr15-anexo11.txt (Anexo 11) ou docs/fontes/nr15-trechos.txt (Anexo 8). */
  linha: number;
  /** "+" na coluna "Absorcao tambem p/pele" do Quadro n. 1. So no Anexo 11. */
  pele?: boolean;
}

export const CONFERIDOS_NA_NR15: ConferidoNaNr15[] = [
${CONFERIDOS_NA_NR15.map((c) => `  { nome: ${aspas(c.nome)}, fonte: ${aspas(c.fonte)}, agente: ${aspas(c.agente)}, grau: ${aspas(c.grau)}, linha: ${c.linha}${c.pele === undefined ? '' : `, pele: ${c.pele}`} },`).join('\n')}
];

export interface CorrecaoPelaNr15 {
  nome: string;
  campo: 'tolerance_limit_value' | 'action_level_value' | 'tolerance_limit_is_ceiling';
  /** O que a fonte traz (0 = "sem valor fixo"). */
  listagem: number | boolean;
  norma: number | boolean;
  anexo: string;
  /** Linha do agente em docs/fontes/nr15-anexo11.txt; null no nivel de acao (metade do limite). */
  linha: number | null;
}

export const CORRECOES_PELA_NR15: CorrecaoPelaNr15[] = [
${CORRECOES_PELA_NR15.map((c) => `  { nome: ${aspas(c.nome)}, campo: ${aspas(c.campo)}, listagem: ${c.listagem}, norma: ${c.norma}, anexo: ${aspas(c.anexo)}, linha: ${num(c.linha)} },`).join('\n')}
];

/** NR-15, itens 15.2.1 a 15.2.3. */
const ADICIONAL_DO_GRAU: Record<GrauDaNr15, '10%' | '20%' | '40%'> = {
${Object.entries(ADICIONAL_DO_GRAU).map(([k, v]) => `  ${aspas(k)}: ${aspas(v)},`).join('\n')}
};

const DUPLICATA = new Map([...Object.entries(DUPLICATAS_DE_CURADOS), ...Object.entries(DUPLICATAS_NA_LISTAGEM)]);
const ORIGEM = new Map(Object.entries(ORIGEM_DO_LIMITE));
const A_DEFINIR = new Map(Object.entries(CODIGO_A_DEFINIR));
const CONFERIDO = new Map(CONFERIDOS_NA_NR15.map((c) => [c.nome, c]));
const CODIGO_ATRIBUIDO = new Map(Object.entries(CODIGOS_ATRIBUIDOS_PELO_USUARIO));

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
  // Codigo atribuido pelo usuario e 09.01.001 retirado valem juntos nos fumos
  // de manganes e nos oleos e graxas: as duas notas vao ao item.
  const notas = [CODIGO_ATRIBUIDO.get(name)?.nota, ausenciaRetirada === 1 ? NOTA_AUSENCIA_RETIRADA : ''].filter(Boolean);
  if (notas.length) item.esocial_enquadramento_nota = notas.join(' ');
  // So o numero conferido no texto da norma cita a norma.
  const conferido = CONFERIDO.get(name);
  if (limite !== null) {
    item.tolerance_limit_value = limite;
    item.tolerance_limit_reference = textoDoLimite(limite, unidade, teto === 1, conferido?.fonte ?? ORIGEM.get(name));
    if (teto === 1) item.tolerance_limit_is_ceiling = true;
  }
  if (nivelDeAcao !== null) {
    item.action_level_value = nivelDeAcao;
    item.action_level_reference = textoDoLimite(nivelDeAcao, unidade);
  }
  if (casas !== null) item.measurement_decimal_places = casas;
  if (efeito) item.effect_classification = efeito;
  if (conferido) {
    item.insalubridade_applicable = true;
    item.insalubridade_degree_suggested = ADICIONAL_DO_GRAU[conferido.grau];
    item.insalubridade_legal_basis = conferido.fonte;
  }
  if (conferido?.pele !== undefined) item.skin_absorption = conferido.pele;
  const aDefinir = A_DEFINIR.get(name);
  if (aDefinir) item.code_table_24_pending = aDefinir;
  const duplicata = DUPLICATA.get(name);
  if (duplicata) {
    item.status = 'INACTIVE';
    item.duplicate_of_id = duplicata;
  }
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
  lista('duplicatas de curados, desativadas', r.duplicatasDesativadas, ([nome, id]) => `${nome} -> ${id}`);
  console.log(`\nconferidos na NR-15: ${r.conferidos.length}`);
  lista('correções pela NR-15', r.correcoesNr15, (c) => `${c.nome}: ${c.campo} ${c.listagem} -> ${c.norma} (${c.anexo}${c.linha ? `, linha ${c.linha}` : ''})`);
  lista('casas decimais aumentadas para caber o valor corrigido', r.casasAjustadas, (c) => `${c.nome}: ${c.de} -> ${c.para}`);
  lista('quantitativos não conferidos na NR-15', r.quantitativosNaoConferidos);
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
