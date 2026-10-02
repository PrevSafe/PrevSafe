/**
 * Modelo do PCMSO — o conteudo fixo do documento.
 *
 * Mesmo padrao de lib/pgrModelo.ts: o gerador imprime o que esta aqui, e a
 * verificacao confere cada citacao contra o texto oficial. Toda frase da NR-07
 * sai de lib/nr07Texto.ts, que e o PDF oficial transcrito por programa: nada
 * aqui e digitado de memoria.
 *
 * Os dispositivos de lei, das resolucoes do CFM e das outras NR foram
 * conferidos no texto oficial vigente (Planalto, portal do CFM, portal do MTE)
 * em outubro de 2026; a fonte de cada um esta ao lado.
 */
import { NR07_ITENS, NR07_FONTE, itemDaNr07 } from '@/lib/nr07Texto';
import { fonte, trecho } from '@/lib/pcmsoFontes';

export const PCMSO_VERSAO_DO_MODELO = 'Modelo PrevSafe de 01/10/2026';

export const PCMSO_NORMA_DE_REGENCIA =
  `NR-07 — Programa de Controle Médico de Saúde Ocupacional, na redação da ${NR07_FONTE.redacao}, `
  + `com alterações até a ${NR07_FONTE.ultimaAlteracao}.`;

/** Primeira linha de um item (o caput, antes das alineas). */
export function caputDe(numero: string): string {
  return String(NR07_ITENS[numero] || '').split('\n')[0];
}

/** As alineas ou incisos de um item, uma por linha, como no original. */
export function alineasDe(numero: string): string[] {
  return String(NR07_ITENS[numero] || '').split('\n').slice(1);
}

export const PCMSO_OBJETIVO = NR07_ITENS['7.1.1'];
export const PCMSO_CAMPO_DE_APLICACAO = NR07_ITENS['7.2.1'];
export const PCMSO_HARMONIZACAO = NR07_ITENS['7.3.1'];
export const PCMSO_DIRETRIZES = alineasDe('7.3.2');
export const PCMSO_ACOES_DE_VIGILANCIA = alineasDe('7.3.2.1');
export const PCMSO_SEM_CARATER_DE_SELECAO = NR07_ITENS['7.3.2.2'];

/** Subitem 7.5.4: o que a organizacao deve garantir que o PCMSO contenha. */
export const PCMSO_CONTEUDO_MINIMO = alineasDe('7.5.4');

/**
 * Os cinco exames obrigatorios (7.5.6) e o prazo de cada um, nas palavras da
 * norma. [ocasiao, regra, item].
 */
export const PCMSO_EXAMES_E_PRAZOS: Array<[string, string, string]> = [
  ['Admissional', alineasDe('7.5.8')[0], '7.5.8, I'],
  ['Periódico', alineasDe('7.5.8').slice(1).join('\n'), '7.5.8, II'],
  ['Retorno ao trabalho', `${NR07_ITENS['7.5.9']}\n${NR07_ITENS['7.5.9.1']}`, '7.5.9 e 7.5.9.1'],
  ['Mudança de risco ocupacional', NR07_ITENS['7.5.10'], '7.5.10'],
  ['Demissional', NR07_ITENS['7.5.11'], '7.5.11']
];

/** Regras dos exames complementares, literais (7.5.7 e 7.5.12 a 7.5.18). */
export const PCMSO_REGRAS_DOS_COMPLEMENTARES: string[] = [
  '7.5.7', '7.5.12', '7.5.12.1', '7.5.12.2', '7.5.13', '7.5.14', '7.5.15', '7.5.16', '7.5.17', '7.5.18'
].map(itemDaNr07);

/** ASO (7.5.19 a 7.5.19.3). */
export const PCMSO_ASO_EMISSAO = itemDaNr07('7.5.19');
export const PCMSO_ASO_CONTEUDO = alineasDe('7.5.19.1');
export const PCMSO_ASO_APTIDOES_ESPECIFICAS = itemDaNr07('7.5.19.2');
export const PCMSO_ASO_RECIBO = itemDaNr07('7.5.19.3');

/** Condutas diante de achados (7.5.5 e 7.5.19.4 a 7.5.19.6.1). */
export const PCMSO_CONDUTAS: string[] = [
  '7.5.19.4', '7.5.19.5', '7.5.19.6', '7.5.19.6.1', '7.5.5'
].map(itemDaNr07);

/** Prontuario (7.6.1 a 7.6.1.3). */
export const PCMSO_PRONTUARIO: string[] = ['7.6.1', '7.6.1.1', '7.6.1.2', '7.6.1.3'].map(itemDaNr07);

/** Relatorio analitico (7.6.2 a 7.6.6). */
export const PCMSO_RELATORIO_CAPUT = caputDe('7.6.2');
export const PCMSO_RELATORIO_CONTEUDO = alineasDe('7.6.2');
export const PCMSO_RELATORIO_REGRAS: string[] = ['7.6.3', '7.6.4', '7.6.5', '7.6.6'].map(itemDaNr07);

/** MEI, ME e EPP (7.7). */
export const PCMSO_MEI_ME_EPP: string[] = ['7.7.1', '7.7.1.1', '7.7.2', '7.7.3', '7.7.4'].map(itemDaNr07);

/**
 * Quem responde pelo que, so com o que a NR-07 atribui a cada um.
 * [quem, o que a norma atribui, item].
 */
export const PCMSO_RESPONSABILIDADES: Array<[string, string, string]> = [
  ['Organização (empregador)', NR07_ITENS['7.4.1'], '7.4.1'],
  ['Organização (empregador)', NR07_ITENS['7.5.19.5'], '7.5.19.5'],
  ['Organização (empregador)', NR07_ITENS['7.6.1.1'], '7.6.1.1'],
  ['Organização (empregador)', NR07_ITENS['7.6.1.2'], '7.6.1.2'],
  ['Médico responsável pelo PCMSO', NR07_ITENS['7.5.5'], '7.5.5'],
  ['Médico responsável pelo PCMSO', NR07_ITENS['7.5.19.4'], '7.5.19.4'],
  ['Médico responsável pelo PCMSO', NR07_ITENS['7.5.19.6.1'], '7.5.19.6.1'],
  ['Médico responsável pelo PCMSO', NR07_ITENS['7.6.1'], '7.6.1'],
  ['Médico responsável pelo PCMSO', caputDe('7.6.2'), '7.6.2'],
  ['Organização (empregador)', `${caputDe('7.5.4')} ${alineasDe('7.5.4')[3] || ''}`, '7.5.4, "d"'],
  ['Médicos que realizam os exames', NR07_ITENS['7.5.16'], '7.5.16'],
  ['Médicos que realizam os exames', NR07_ITENS['7.5.19'], '7.5.19']
];

// ===========================================================================
// O que vem de lei, do CFM e de outras NR: sempre por fonte() ou trecho(), que
// recortam o texto conferido em lib/pcmsoFontes.ts e lancam erro se o trecho
// nao estiver la.
// ===========================================================================

const literal = (id: string) => fonte(id).texto;

/**
 * Vedacao com o caput. Os artigos do Codigo de Etica Medica e os incisos do
 * art. 6o da Res. CFM 2.323 comecam pelo verbo: "Revelar fato...", "Deixar de
 * registrar...". Impressos sem o "E vedado ao medico", leem-se como ordem.
 */
const CAPUT_DO_CEM = literal('cem-vedado');
const CAPUT_DO_ART6_DA_2323 = trecho('cfm-2323-art6-I', 'Art. 6º', 'trabalhador:');
export function vedadoAoMedico(id: string, texto: string = literal(id)): string {
  if (id.startsWith('cem-art')) return `${CAPUT_DO_CEM} ${texto}`;
  if (id.startsWith('cfm-2323-art6-') && id !== 'cfm-2323-art6-I') return `${CAPUT_DO_ART6_DA_2323} ${texto}`;
  return texto;
}

/**
 * Revisao. A NR-07 nao fixa prazo de validade para o PCMSO: ele parte do
 * inventario do PGR (7.5.1) e o relatorio analitico e anual (7.6.2).
 */
export const PCMSO_SOBRE_A_REVISAO =
  'A NR-07 não fixa prazo de validade para o PCMSO. Ele é elaborado considerando os riscos '
  + 'identificados e classificados pelo PGR (subitem 7.5.1) e por isso é revisto sempre que o '
  + 'inventário de riscos mudar; o relatório analítico é anual (subitem 7.6.2). Sobre o inventário, '
  + `a NR-01 dispõe: "${trecho('nr01-1.5.4.4.6', '1.5.4.4.6', 'seguintes situações:')}" [...] (subitem 1.5.4.4.6).`;

/** Base legal: [norma, dispositivo, texto literal ou trecho literal]. */
export const PCMSO_BASE_LEGAL: Array<[string, string, string]> = [
  ['Constituição Federal', 'art. 7º, XXII', literal('cf-art7-XXII')],
  ['CLT', 'art. 168', literal('clt-168')],
  ['CLT', 'art. 168, § 5º', literal('clt-168-p5')],
  ['CLT', 'art. 168, § 6º', literal('clt-168-p6')],
  ['CLT', 'art. 169', literal('clt-169')],
  ['CLT', 'art. 169-A', trecho('clt-169A', 'Art. 169-A.', 'acesso aos serviços de diagnósticos.')],
  ['NR-01', 'subitens 1.5.5.4.1 e 1.5.5.4.2', `${literal('nr01-1.5.5.4.1')}\n${literal('nr01-1.5.5.4.2')}`],
  ['NR-01', 'subitem 1.5.4.4.6', `${trecho('nr01-1.5.4.4.6', '1.5.4.4.6', 'seguintes situações:')} [...]`],
  ['NR-07', 'itens 7.1 a 7.7 e Anexos I a V', `${PCMSO_NORMA_DE_REGENCIA} Os itens aplicáveis estão transcritos nas seções deste documento.`],
  ['Lei nº 8.213/1991', 'art. 22', `${trecho('lei8213-art22', 'Art. 22.', 'autoridade competente,')} [...]`],
  ['Lei nº 13.709/2018 (LGPD)', 'art. 11, II, "a" e "f"', [
    trecho('lgpd-art11', 'Art. 11.', 'nas hipóteses em que for indispensável para:'),
    trecho('lgpd-art11', 'a) cumprimento de obrigação legal', 'pelo controlador;'),
    trecho('lgpd-art11', 'f) tutela da saúde', 'autoridade sanitária;')
  ].join(' [...] ')],
  ['Lei nº 13.787/2018', 'art. 6º', trecho('lei13787-art6', 'Art. 6º', 'poderão ser eliminados.')],
  ['Resolução CFM nº 2.323/2022', 'arts. 3º a 6º e 13', 'Normas específicas para médicos que atendem o trabalhador. Os dispositivos aplicáveis estão transcritos nas seções 2.5, 3, 6.2 e 7.'],
  ['Resolução CFM nº 2.376/2024', 'arts. 2º e 3º', `${literal('cfm-2376-art2')}\n${trecho('cfm-2376-art3', 'Art. 3º', 'estiver atuando.')}`],
  ['Resolução CFM nº 2.217/2018 (Código de Ética Médica)', 'arts. 12, 31, 73, 76, 80, 85, 87, 88 e 89', 'Vedações ao médico, sigilo profissional e prontuário, transcritos nas seções 2.5, 3, 6.2, 7 e 8.'],
  ['Portaria Consolidada MTE nº 1/2025', 'art. 13, III, "d"', literal('pc1-2025-art13-III-d')]
];

/** Vedacoes: [o que nao se faz, texto literal da fonte, fonte]. */
export const PCMSO_VEDACOES: Array<[string, string, string]> = [
  ['Usar o PCMSO para selecionar pessoal', NR07_ITENS['7.3.2.2'], 'NR-07, subitem 7.3.2.2'],
  ['Exigir teste de gravidez ou de esterilidade', `${literal('clt-373A-caput')} [...] ${literal('clt-373A-IV')}`, 'CLT, art. 373-A, caput e IV'],
  ['Exigir exame relativo a esterilização ou gravidez (crime)', trecho('lei9029-art2', 'Art. 2º Constituem crime', 'estado de gravidez;'), 'Lei nº 9.029/1995, art. 2º, I'],
  ['Testar o trabalhador para HIV em exame ocupacional', trecho('p671-art199', '§ 1º', 'quanto ao HIV.'), 'Portaria MTP nº 671/2021, art. 199, § 1º'],
  ['Realizar teste de HIV compulsório', literal('cfm-2437-art6'), 'Resolução CFM nº 2.437/2025, art. 6º'],
  ['Divulgar no local de trabalho a condição de pessoa com HIV, hepatite crônica, hanseníase ou tuberculose', `${trecho('lei14289-art2', 'Art. 2º', 'III - locais de trabalho;')} [...]`, 'Lei nº 14.289/2022, art. 2º, III'],
  ['Fazer exame ocupacional por telemedicina sem exame presencial', literal('cfm-2323-art6-I'), 'Resolução CFM nº 2.323/2022, art. 6º, I'],
  ['Assinar ASO em branco', vedadoAoMedico('cfm-2323-art6-II'), 'Resolução CFM nº 2.323/2022, art. 6º, II'],
  ['Informar resultado de exame no ASO', vedadoAoMedico('cfm-2323-art6-V'), 'Resolução CFM nº 2.323/2022, art. 6º, V'],
  ['Revelar à empresa informação confidencial do exame', vedadoAoMedico('cem-art76'), 'Código de Ética Médica, art. 76'],
  ['Compartilhar dado de saúde para obter vantagem econômica', `${trecho('lgpd-art11', '§ 4º É vedada', 'objetivo de obter vantagem econômica')} [...]`, 'LGPD, art. 11, § 4º'],
  ['Informar o resultado do exame ao eSocial sem autorização do trabalhador', literal('mos-s2220-1.6'), 'MOS do eSocial S-1.3, S-2220, item 1.6']
];

/**
 * A excecao do art. 6o da Res. CFM 2.437/2025 (acidente com material
 * biologico) afasta o veto ao teste COMPULSORIO; nao dispensa o direito de
 * decidir do art. 31 do CEM, cuja unica ressalva e o iminente risco de morte.
 */
export const PCMSO_NOTA_HIV_POS_EXPOSICAO =
  'Neste programa: a ressalva do art. 6º da Resolução CFM nº 2.437/2025 para acidente de trabalho com material '
  + 'biológico não autoriza testar o trabalhador sem a sua decisão. A testagem após a exposição é oferecida no '
  + 'atendimento do acidente e o trabalhador decide (Código de Ética Médica, art. 31, transcrito na seção 6.2); '
  + 'o resultado fica só no prontuário.';

/** O que o CFM atribui: [quem, texto literal, fonte]. */
export const PCMSO_RESPONSABILIDADES_CFM: Array<[string, string, string]> = [
  ['Médico responsável pelo PCMSO', literal('cfm-2376-art2'), 'Resolução CFM nº 2.376/2024, art. 2º'],
  ['Médico responsável pelo PCMSO', literal('cfm-2376-art3'), 'Resolução CFM nº 2.376/2024, art. 3º'],
  ['Médico responsável pelo PCMSO', literal('cfm-2323-art5'), 'Resolução CFM nº 2.323/2022, art. 5º'],
  ['Médico responsável pelo PCMSO', literal('cfm-2323-art13'), 'Resolução CFM nº 2.323/2022, art. 13'],
  ['Médicos que atendem os trabalhadores', literal('cfm-2323-art3-III'), 'Resolução CFM nº 2.323/2022, art. 3º, III'],
  ['Médicos que atendem os trabalhadores', literal('cfm-2323-art3-IV'), 'Resolução CFM nº 2.323/2022, art. 3º, IV'],
  ['Médico do trabalho', literal('cfm-2323-art4'), 'Resolução CFM nº 2.323/2022, art. 4º'],
  ['Médicos que realizam os exames', literal('cfm-2323-art5-p1'), 'Resolução CFM nº 2.323/2022, art. 5º, § 1º'],
  ['Médicos que realizam os exames', vedadoAoMedico('cfm-2323-art6-III'), 'Resolução CFM nº 2.323/2022, art. 6º, III'],
  ['Médicos que realizam os exames', vedadoAoMedico('cfm-2323-art6-IV'), 'Resolução CFM nº 2.323/2022, art. 6º, IV'],
  ['Médico', vedadoAoMedico('cem-art12'), 'Código de Ética Médica, art. 12']
];

/** ASO: o que o CFM e o eSocial acrescentam a NR-07. */
export const PCMSO_ASO_CFM: string[] = [
  `${literal('cfm-2381-art4-V')} (Resolução CFM nº 2.381/2024, art. 4º, V)`,
  `${CAPUT_DO_ART6_DA_2323} ${literal('cfm-2323-art6-II')} [...] ${literal('cfm-2323-art6-V')} (Resolução CFM nº 2.323/2022, art. 6º)`,
  `${vedadoAoMedico('cem-art80')} (Código de Ética Médica, art. 80)`,
  `${literal('mos-s2220-1.9')} (MOS do eSocial S-1.3, S-2220, item 1.9)`,
  'Neste programa: não ser protegido por sigilo não tira do ASO a condição de dado pessoal. Ele é guardado com as medidas de segurança do art. 46 da LGPD (transcrito na seção 8) e entregue só a quem dele precisa.'
];

/** Prontuario: guarda e acesso, alem da NR-07. */
export const PCMSO_PRONTUARIO_CFM: string[] = [
  `${literal('cfm-1638-art1')} (Resolução CFM nº 1.638/2002)`,
  `${trecho('cem-art87', '§ 2º', 'assiste o paciente.')} (Código de Ética Médica, art. 87, § 2º)`,
  `${vedadoAoMedico('cem-art85')} (Código de Ética Médica, art. 85)`,
  `${vedadoAoMedico('cem-art88')} (Código de Ética Médica, art. 88)`,
  `${vedadoAoMedico('cem-art89', `${trecho('cem-art89', 'Art. 89', 'autorizado por escrito pelo paciente.')} [...]`)} (Código de Ética Médica, art. 89)`,
  `${literal('cfm-1821-art3')} (Resolução CFM nº 1.821/2007, art. 3º)`,
  `${literal('cfm-1821-art7')} (Resolução CFM nº 1.821/2007, art. 7º)`,
  `${literal('cfm-1821-art8')} (Resolução CFM nº 1.821/2007, art. 8º)`,
  `${trecho('lei13787-art6', 'Art. 6º', 'poderão ser eliminados.')} ${trecho('lei13787-art6', '§ 1º', 'fins legais e probatórios.')} [...] ${trecho('lei13787-art6', '§ 3º', 'confidencialidade das informações.')} (Lei nº 13.787/2018, art. 6º)`
];

/**
 * Guarda do prontuario neste programa. Frases do programa, nao da norma: cada
 * uma remete ao dispositivo transcrito em que se apoia.
 */
export const PCMSO_GUARDA_DO_PRONTUARIO: string[] = [
  'Prazo: onde mais de um prazo de guarda se aplica ao mesmo trabalhador (NR-07, subitem 7.6.1.1 e Anexo V, itens 4.1 e 5.4; NR-32, item 32.4.8; Lei nº 13.787/2018, art. 6º; Resolução CFM nº 1.821/2007, arts. 7º e 8º), este programa adota o maior.',
  'Custódia: a organização mantém o prontuário (subitem 7.6.1.1); o conteúdo fica sob a guarda e a responsabilidade do médico responsável (subitem 7.6.1; Código de Ética Médica, art. 87, § 2º) e não é acessado por pessoa não obrigada ao sigilo profissional, como o RH (Código de Ética Médica, art. 85).',
  'Troca de médico responsável: os prontuários são transferidos ao sucessor (subitem 7.6.1.2, transcrito acima), e o médico que deixa o PCMSO comunica o CRM (Resolução CFM nº 2.376/2024, art. 3º, parágrafo único, transcrito na seção 3).'
];

/** Sigilo e dados de saude. */
export const PCMSO_SIGILO: string[] = [
  `${vedadoAoMedico('cem-art73', `${trecho('cem-art73', 'Art. 73', 'por escrito, do paciente.')} [...]`)} (Código de Ética Médica, art. 73)`,
  `${vedadoAoMedico('cem-art76')} (Código de Ética Médica, art. 76)`,
  `${literal('clt-168-p5')} (CLT, art. 168, § 5º)`,
  `${trecho('lgpd-art5', 'II - dado pessoal sensível', 'pessoa natural;')} (LGPD, art. 5º, II)`,
  `${trecho('lgpd-art11', 'f) tutela da saúde', 'autoridade sanitária;')} (LGPD, art. 11, II, "f")`,
  `${trecho('lgpd-art46', 'Art. 46.', 'ilícito.')} (LGPD, art. 46)`,
  `${trecho('lei14289-art2', 'Parágrafo único.', 'termo de consentimento informado')} [...] (Lei nº 14.289/2022, art. 2º, parágrafo único)`,
  'Os números deste documento, inclusive os do relatório analítico, são agregados: nenhum CPF, diagnóstico ou resultado individual de exame consta dele.'
];

/** Condutas legais diante de acidente ou doenca relacionada ao trabalho. */
export const PCMSO_CONDUTAS_LEGAIS: string[] = [
  `${trecho('cfm-2323-art3', 'Art. 3º', 'devem:')} [...] ${literal('cfm-2323-art3-IV')} [...] ${literal('cfm-2323-art3-V')} (Resolução CFM nº 2.323/2022, art. 3º, IV e V)`,
  `${vedadoAoMedico('cem-art31')} (Código de Ética Médica, art. 31)`,
  `${trecho('lei8213-art22', 'Art. 22.', 'autoridade competente,')} [...] (Lei nº 8.213/1991, art. 22)`,
  `${trecho('lei8213-art22', '§ 2º', 'previsto neste artigo.')} (Lei nº 8.213/1991, art. 22, § 2º)`,
  `${literal('clt-169')} (CLT, art. 169)`
];

/** eSocial, evento S-2220. */
export const PCMSO_ESOCIAL: string[] = [
  `${literal('mos-s2220-prazo')} (MOS do eSocial S-1.3, S-2220)`,
  `${literal('mos-s2220-1.6')} (MOS do eSocial S-1.3, S-2220)`,
  `${literal('mos-s2220-1.7')} (MOS do eSocial S-1.3, S-2220)`,
  'Neste sistema, o S-2220 leva o que está no ASO: tipo do exame, data, resultado do ASO, procedimentos realizados e médicos. Não leva o resultado de cada exame ({indResult}) nem observação clínica, e leva o médico responsável pelo PCMSO quando ele está atribuído a este cliente.',
  `${literal('pc1-2025-art13-III')} [...] ${literal('pc1-2025-art13-III-d')} (Portaria Consolidada MTE nº 1/2025, art. 13)`
];

/** Imunizacao: o que vale para todo cliente. As exigencias setoriais vem de lib/pcmso.ts. */
export const PCMSO_IMUNIZACAO: string[] = [
  `${PCMSO_DIRETRIZES.find((d) => d.startsWith('l)')) || ''} (NR-07, subitem 7.3.2, "l")`,
  `${trecho('clt-169A', 'Art. 169-A.', 'Ministério da Saúde,')} [...] (CLT, art. 169-A)`
];

/** Anexo I: indicadores biologicos. */
export const PCMSO_ANEXO_I_TEXTO =
  `Anexo I da NR-07 — ${literal('nr07-anexoI-q1-titulo').replace(/\*$/, '')} e `
  + `${literal('nr07-anexoI-q2-titulo').replace(/\*$/, '')}: realizados a cada seis meses, nos termos `
  + 'dos subitens 7.5.13 a 7.5.15, transcritos na seção 5.6.';

/**
 * Checklist de conformidade, como o do PGR. `secoes` = secoes de DADOS cujas
 * pendencias tornam o requisito pendente. Requisito sem secao nao e conferivel
 * pelo cadastro: sai como "a atestar pelo medico", nunca como atendido.
 */
export const PCMSO_CHECKLIST_SITUACOES = {
  pendente: 'Pendente',
  conferido: 'Cadastro conferido',
  atestar: 'A atestar pelo médico'
};
export const PCMSO_CHECKLIST_LEGENDA =
  'Cadastro conferido: o cadastro tem o dado que o requisito pede, pelas regras que o sistema confere; '
  + 'a correção técnica do conteúdo é do médico responsável, que a atesta ao assinar. '
  + 'A atestar pelo médico: requisito que nenhum cadastro comprova e que só a implantação demonstra.';

export const PCMSO_CHECKLIST: Array<{ requisito: string; norma: string; onde: string; secoes: string[] }> = [
  { requisito: 'Médico responsável indicado pelo empregador', norma: 'NR-07, 7.4.1 "c"; Res. CFM 2.376/2024', onde: '1.2', secoes: ['1.2'] },
  { requisito: 'Elaborado a partir dos riscos identificados e classificados pelo PGR', norma: 'NR-07, 7.5.1', onde: '4', secoes: ['4.1', '4.2'] },
  { requisito: 'Possíveis agravos à saúde por risco', norma: 'NR-07, 7.5.4 "a"', onde: '4.2', secoes: ['4.2'] },
  { requisito: 'Planejamento dos exames clínicos e complementares, atendendo aos Anexos', norma: 'NR-07, 7.5.4 "b"', onde: '5.3, 5.4', secoes: ['5.3', '5.4'] },
  { requisito: 'Os cinco exames obrigatórios e seus prazos', norma: 'NR-07, 7.5.6 a 7.5.11', onde: '5.1, 5.3', secoes: ['5.1', '5.3'] },
  { requisito: 'Periodicidade do exame clínico', norma: 'NR-07, 7.5.8', onde: '5.2', secoes: ['5.2'] },
  { requisito: 'Atividades críticas e aptidões específicas', norma: 'NR-07, 7.5.3 e 7.5.19.2', onde: '5.5', secoes: ['5.5'] },
  { requisito: 'Exames complementares justificados, sem exame vedado', norma: 'NR-07, 7.5.18; Portaria 671, art. 199; CLT, art. 373-A', onde: '5.3', secoes: ['5.3'] },
  { requisito: 'Critérios de interpretação e condutas, inclusive do exame clínico dos expostos', norma: 'NR-07, 7.5.4 "c"', onde: '6', secoes: ['6.1'] },
  { requisito: 'Conteúdo exigido por NR setorial', norma: 'NR-32, NR-36, NR-38', onde: '5.8', secoes: ['5.8', '5.8.1'] },
  { requisito: 'Conhecido e atendido por todos os médicos examinadores', norma: 'NR-07, 7.5.4 "d"', onde: '1.2, Termo', secoes: [] },
  { requisito: 'Conteúdo mínimo do ASO', norma: 'NR-07, 7.5.19.1', onde: '7', secoes: ['1.1'] },
  { requisito: 'Prontuário sob responsabilidade do médico, guarda mínima de 20 anos (maior nos Anexos)', norma: 'NR-07, 7.6.1 e 7.6.1.1', onde: '8', secoes: [] },
  { requisito: 'Relatório analítico anual', norma: 'NR-07, 7.5.4 "e" e 7.6.2', onde: '9', secoes: ['9'] },
  { requisito: 'Vedações legais e éticas', norma: 'CLT; Leis 9.029 e 14.289; Portaria 671; CFM', onde: '2.5', secoes: [] },
  { requisito: 'Sigilo e proteção de dados de saúde', norma: 'CEM, arts. 73 e 76; LGPD, art. 11', onde: '8', secoes: [] },
  { requisito: 'Evento S-2220 com o médico responsável', norma: 'MOS do eSocial S-1.3, item 1.7', onde: '10', secoes: ['1.2'] }
];

/**
 * O que cabe a organizacao, e nao ao medico: ela declara ao assinar. Cada linha
 * remete ao subitem transcrito no documento.
 */
export const PCMSO_DECLARACAO_DA_ORGANIZACAO: string[] = [
  'garantir a elaboração e efetiva implantação deste PCMSO e custeá-lo sem ônus para o empregado (subitem 7.4.1, "a" e "b");',
  'garantir que este PCMSO seja conhecido e atendido por todos os médicos que realizarem os exames ocupacionais dos empregados (subitem 7.5.4, "d");',
  'manter os prontuários pelos prazos da seção 8 e, na substituição do médico responsável, garantir que sejam formalmente transferidos ao sucessor (subitens 7.6.1.1 e 7.6.1.2);'
];

/** Advertencias de escopo. */
export const PCMSO_ADVERTENCIAS: string[] = [
  `Empregador rural ou equiparado: ${literal('nr31-31.2.1.1')} Os exames do meio rural seguem o item 31.3.7 da NR-31, e não este modelo da NR-07.`,
  `A NR-07 admite médico de outra especialidade como responsável quando não houver médico do trabalho na localidade (subitem 7.5.2), mas a Resolução CFM nº 2.376/2024, art. 2º, dispõe que o PCMSO "${trecho('cfm-2376-art2', 'terá um médico do trabalho', 'como seu responsável')}".`,
  'O PCMSO vale pela implantação: na fiscalização, o auditor confronta o programa com os ASO, os prontuários e o relatório analítico.'
];
