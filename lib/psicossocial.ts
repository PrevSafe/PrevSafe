/**
 * Fatores de risco psicossociais relacionados ao trabalho, DENTRO da AEP.
 *
 * FONTES - texto conferido no original, nao de memoria:
 *
 *   - NR-01, capitulo 1.5 na redacao da Portaria MTE n.o 1.419/2024, em vigor
 *     desde 26/05/2026 (Portaria MTE n.o 765/2025): subitens 1.5.3.1.4,
 *     1.5.3.2.1 e 1.5.4.4.5.3.
 *   - NR-17: itens 17.3.5 e 17.3.8, 17.4.4 e 17.4.7.
 *   - MTE, "Guia de informacoes sobre os fatores de riscos psicossociais
 *     relacionados ao trabalho" (2025): a listagem exemplificativa do
 *     capitulo 2, as estrategias do capitulo 3 e a pergunta 6.
 *   - MTE, "Manual do GRO/PGR da NR-1" (2026), capitulo 17.
 *
 * POR QUE AQUI, E NAO NUM DOCUMENTO A PARTE
 *
 * O subitem 1.5.3.2.1 manda considerar os fatores psicossociais "nos termos da
 * NR-17", e o item 17.3.5 manda os resultados da AEP para o inventario do PGR.
 * O Manual do GRO diz com todas as letras: "A gestao desses riscos nao e um
 * programa separado". Por isso a avaliacao mora na AEP, o risco mora no
 * inventario, e o relatorio psicossocial e um RECORTE dos dois - nunca um
 * documento com conclusoes proprias, que poderia divergir do PGR.
 *
 * O QUE ESTE MODULO NAO E
 *
 * Nao e questionario nem escala: o MTE "nao define ou nao sugere nenhuma
 * metodologia especifica". E nao avalia pessoa: o objeto e a organizacao do
 * trabalho. Nada aqui guarda sintoma, diagnostico ou nome de trabalhador.
 */
import type {
  AvaliacaoDoFatorPsicossocial,
  ConclusaoDoFator,
  EstrategiaPsicossocial,
  FonteDaConstatacao,
  SSTEnvironmentalRisk
} from '@/types';
import type { SituacaoOperacional } from '@/lib/situacaoOperacional';
import { classificarRisco } from '@/lib/classificacaoDeRisco';

/** Uma coisa que falta, nas duas formas em que ela e lida (ver FaltaNaAEP). */
export interface FaltaPsicossocial {
  curto: string;
  longo: string;
}

export const VIGENCIA_DO_CAPITULO_1_5 = '26/05/2026';

export const BASE_NORMATIVA_PSICOSSOCIAL: Array<{ item: string; texto: string }> = [
  {
    item: 'NR-01, subitem 1.5.3.1.4',
    texto: 'O gerenciamento de riscos ocupacionais deve abranger os riscos que decorrem dos '
      + 'agentes físicos, químicos, biológicos, riscos de acidentes e riscos relacionados aos '
      + 'fatores ergonômicos, incluindo os fatores de risco psicossociais relacionados ao trabalho.'
  },
  {
    item: 'NR-01, subitem 1.5.3.2.1',
    texto: 'A organização deve considerar as condições de trabalho, nos termos da NR-17, '
      + 'incluindo os fatores de risco psicossociais relacionados ao trabalho.'
  },
  {
    item: 'NR-01, subitem 1.5.4.4.5.3',
    texto: 'Para a probabilidade de ocorrência das lesões ou agravos à saúde decorrentes de '
      + 'fatores ergonômicos, incluindo os fatores de riscos psicossociais relacionados ao '
      + 'trabalho, a avaliação de risco deve considerar as exigências da atividade de trabalho e '
      + 'a eficácia das medidas de prevenção implementadas.'
  },
  {
    item: 'NR-17, item 17.3.5',
    texto: 'Devem integrar o inventário de riscos do PGR os resultados da avaliação ergonômica '
      + 'preliminar.'
  },
  {
    item: 'NR-17, item 17.3.8',
    texto: 'A organização deve garantir que os empregados sejam ouvidos durante o processo da '
      + 'avaliação ergonômica preliminar e na AET.'
  }
];

/** Definicao para fins do GRO, nas palavras do Guia do MTE (cap. 1). */
export const DEFINICAO_DO_GUIA =
  'Fatores de riscos psicossociais relacionados ao trabalho, para fins de aplicação no GRO: '
  + '"perigos decorrentes de problemas na concepção, na organização e na gestão do trabalho, que '
  + 'podem gerar efeitos na saúde do trabalhador em nível psicológico, físico e social, como por '
  + 'exemplo o desencadeamento ou agravamento de estresse no trabalho, esgotamento, depressão, '
  + 'DORT, entre outros" (Guia do MTE, 2025).';

/**
 * O que a avaliacao NAO e. Vai impresso nos documentos, porque e a primeira
 * duvida do trabalhador e o primeiro erro de quem avalia.
 */
export const O_QUE_A_AVALIACAO_NAO_E: string[] = [
  'Não avalia a saúde mental de nenhum trabalhador. O objeto são as condições e a organização '
    + 'do trabalho: "não se trata de verificar sintomas individuais ou sensação do que está '
    + 'ocorrendo no trabalhador, ou de medir algum sinal biológico" (Guia do MTE, 2025).',
  'Não alcança a vida do trabalhador fora do trabalho: só entram os fatores "relacionados ao '
    + 'trabalho" (subitem 1.5.3.1.4 da NR-01; Guia do MTE, pergunta 5).',
  'Não se confunde com a avaliação psicossocial do exame clínico de aptidão exigida por NR '
    + 'específica, que é ato médico no âmbito do PCMSO (NR-07).'
];

/**
 * Listagem exemplificativa do Guia do MTE (2025, cap. 2), na ordem e na grafia
 * do original. "Nao tem a pretensao de esgotar o tema": por isso a AEP aceita
 * fatores adicionais.
 */
export const FATORES_PSICOSSOCIAIS: Array<{ chave: string; perigo: string; consequencias: string[] }> = [
  { chave: 'assedio', perigo: 'Assédio de qualquer natureza no trabalho', consequencias: ['Transtorno mental'] },
  { chave: 'mudancas', perigo: 'Má gestão de mudanças organizacionais', consequencias: ['Transtorno mental', 'DORT'] },
  { chave: 'clareza', perigo: 'Baixa clareza de papel/função', consequencias: ['Transtorno mental'] },
  { chave: 'recompensas', perigo: 'Baixas recompensas e reconhecimento', consequencias: ['Transtorno mental'] },
  { chave: 'suporte', perigo: 'Falta de suporte/apoio no trabalho', consequencias: ['Transtorno mental'] },
  { chave: 'autonomia', perigo: 'Baixo controle no trabalho/Falta de autonomia', consequencias: ['Transtorno mental', 'DORT'] },
  { chave: 'justica', perigo: 'Baixa justiça organizacional', consequencias: ['Transtorno mental'] },
  { chave: 'traumaticos', perigo: 'Eventos violentos ou traumáticos', consequencias: ['Transtorno mental'] },
  { chave: 'subcarga', perigo: 'Baixa demanda no trabalho (subcarga)', consequencias: ['Transtorno mental'] },
  { chave: 'sobrecarga', perigo: 'Excesso de demandas no trabalho (sobrecarga)', consequencias: ['Transtorno mental', 'DORT'] },
  { chave: 'relacionamentos', perigo: 'Más relacionamentos no local de trabalho', consequencias: ['Transtorno mental'] },
  { chave: 'comunicacao', perigo: 'Trabalho em condições de difícil comunicação', consequencias: ['Transtorno mental'] },
  { chave: 'remoto', perigo: 'Trabalho remoto e isolado', consequencias: ['Transtorno mental', 'Fadiga'] }
];

export const FONTE_DA_LISTAGEM =
  'Listagem exemplificativa do Guia de informações sobre os fatores de riscos psicossociais '
  + 'relacionados ao trabalho (MTE, 2025, cap. 2).';

/**
 * Estrategias de conducao (Guia do MTE, cap. 3; Manual do GRO, item 17.1).
 * A equipe de especialistas CONDUZ, mas "para chegar aos resultados, sera
 * necessario utilizar um dos caminhos apontados" - por isso nao basta sozinha.
 */
export const ESTRATEGIAS_PSICOSSOCIAIS: Array<{ valor: EstrategiaPsicossocial; rotulo: string; basta: boolean }> = [
  { valor: 'OBSERVACAO_E_DIALOGO', rotulo: 'Observação da atividade com diálogo com os trabalhadores', basta: true },
  { valor: 'QUESTIONARIO', rotulo: 'Pesquisa ou questionário padronizado', basta: true },
  { valor: 'OFICINA', rotulo: 'Oficina (workshop) com moderação', basta: true },
  { valor: 'EQUIPE_ESPECIALIZADA', rotulo: 'Condução por equipe de especialistas', basta: false }
];

export const FONTES_DA_CONSTATACAO: Array<{ valor: FonteDaConstatacao; rotulo: string }> = [
  { valor: 'OBSERVACAO', rotulo: 'Observação do trabalho real' },
  { valor: 'DIALOGO', rotulo: 'Diálogo ou entrevista com trabalhadores' },
  { valor: 'QUESTIONARIO', rotulo: 'Questionário anônimo' },
  { valor: 'OFICINA', rotulo: 'Oficina' },
  { valor: 'INDICADORES', rotulo: 'Indicadores agregados de saúde (afastamentos, CAT, PCMSO)' },
  { valor: 'DOCUMENTOS', rotulo: 'Documentos da organização (metas, escalas, registros)' }
];

export const CONCLUSAO_DO_FATOR_POR_EXTENSO: Record<ConclusaoDoFator, string> = {
  PRESENTE: 'Presente',
  NAO_IDENTIFICADO: 'Não identificado'
};

export const REQUISITO_17_4_4 = {
  item: 'NR-17, item 17.4.4',
  texto: 'Todo e qualquer sistema de avaliação de desempenho para efeito de remuneração e '
    + 'vantagens de qualquer espécie deve levar em consideração as repercussões sobre a saúde '
    + 'dos trabalhadores.',
  conclusoes: {
    ATENDE: 'Atende',
    NAO_ATENDE: 'Não atende',
    NAO_HA_SISTEMA: 'Não há sistema de avaliação de desempenho para remuneração'
  } as Record<string, string>
};

export const REQUISITO_17_4_7 = {
  item: 'NR-17, item 17.4.7',
  texto: 'Os superiores hierárquicos diretos dos trabalhadores devem ser orientados para buscar '
    + 'no exercício de suas atividades: a) facilitar a compreensão das atribuições e '
    + 'responsabilidades de cada função; b) manter aberto o diálogo de modo que os trabalhadores '
    + 'possam sanar dúvidas quanto ao exercício de suas atividades; c) facilitar o trabalho em '
    + 'equipe; e d) estimular tratamento justo e respeitoso nas relações pessoais no ambiente de '
    + 'trabalho.',
  conclusoes: {
    ATENDE: 'Atende',
    NAO_ATENDE: 'Não atende'
  } as Record<string, string>
};

/** Prefixo do nome do risco no inventario: e por ele que o PGR o le. */
export const PREFIXO_DO_RISCO = 'Fator de risco psicossocial — ';

// ===========================================================================
// LEITURA DA AVALIACAO
// ===========================================================================

export interface FatorAvaliado {
  /** Chave da listagem do Guia, ou id do fator adicional. */
  chave: string;
  perigo: string;
  consequencias: string;
  adicional: boolean;
  avaliacao: AvaliacaoDoFatorPsicossocial;
}

/** Os fatores desta AEP: os 13 do Guia, sempre, e os adicionais. */
export function fatoresDaAvaliacao(aep: any): FatorAvaliado[] {
  const p = aep?.psychosocial || {};
  const fatores = p?.fatores || {};
  const base: FatorAvaliado[] = FATORES_PSICOSSOCIAIS.map((f) => ({
    chave: f.chave,
    perigo: f.perigo,
    consequencias: f.consequencias.join(', '),
    adicional: false,
    avaliacao: fatores?.[f.chave] || {}
  }));
  const adicionais: FatorAvaliado[] = (Array.isArray(p?.adicionais) ? p.adicionais : [])
    .filter((x: any) => x && x.id)
    .map((x: any) => ({
      chave: String(x.id),
      perigo: String(x.perigo || '').trim(),
      consequencias: String(x.consequencias || '').trim(),
      adicional: true,
      avaliacao: {
        conclusao: x.conclusao,
        caracterizacao: x.caracterizacao,
        fontes: x.fontes
      }
    }));
  return [...base, ...adicionais];
}

/** A avaliacao psicossocial desta AEP foi ao menos comecada? */
export function avaliacaoIniciada(aep: any): boolean {
  const p = aep?.psychosocial;
  if (!p) return false;
  return (Array.isArray(p.estrategias) && p.estrategias.length > 0)
    || Object.values(p.fatores || {}).some((v: any) => Boolean(v?.conclusao))
    || (Array.isArray(p.adicionais) && p.adicionais.length > 0)
    || Boolean(p.avaliacao_de_desempenho?.conclusao)
    || Boolean(p.orientacao_das_chefias?.conclusao);
}

export function fatoresPresentes(aep: any): FatorAvaliado[] {
  return fatoresDaAvaliacao(aep).filter((f) => f.avaliacao?.conclusao === 'PRESENTE');
}

/** Contagem para a tela e para a secao 7.4 do PGR. */
export function resumoPsicossocial(aep: any): {
  avaliados: number;
  total: number;
  presentes: string[];
} {
  const todos = fatoresDaAvaliacao(aep);
  return {
    avaliados: todos.filter((f) => Boolean(f.avaliacao?.conclusao)).length,
    total: todos.length,
    presentes: todos.filter((f) => f.avaliacao?.conclusao === 'PRESENTE').map((f) => f.perigo)
  };
}

const nomes = (fs: FatorAvaliado[]) => fs.map((f) => `"${f.perigo || 'fator sem descrição'}"`).join(', ');

/**
 * O que falta na avaliacao psicossocial desta AEP.
 *
 * Entra em `faltasDaAEP` (lib/nr17.ts): a avaliacao psicossocial e parte da
 * AEP, entao AEP sem ela esta incompleta - e e a mesma lista na aba, no
 * documento da AEP, na secao 7.4 do PGR e no relatorio.
 */
export function faltasPsicossociais(aep: any): FaltaPsicossocial[] {
  const falta: FaltaPsicossocial[] = [];
  const add = (curto: string, longo: string) => falta.push({ curto, longo });

  // Nada comecado: uma pendencia so, e nao dezenove.
  if (!avaliacaoIniciada(aep)) {
    add('fatores psicossociais (NR-01, 1.5.3.2.1)',
      'avaliação dos fatores de risco psicossociais relacionados ao trabalho, que o subitem '
      + `1.5.3.2.1 da NR-01 manda considerar nos termos da NR-17 (em vigor desde ${VIGENCIA_DO_CAPITULO_1_5})`);
    return falta;
  }

  const p = aep.psychosocial || {};
  const estrategias: string[] = Array.isArray(p.estrategias) ? p.estrategias : [];

  if (estrategias.length === 0) {
    add('estratégia da avaliação psicossocial',
      'estratégia de condução da avaliação psicossocial: observação com diálogo, questionário, '
      + 'oficina ou combinação (Guia do MTE, cap. 3)');
  } else if (!ESTRATEGIAS_PSICOSSOCIAIS.some((e) => e.basta && estrategias.includes(e.valor))) {
    add('caminho além da equipe de especialistas',
      'a equipe de especialistas conduz, mas precisa usar observação com diálogo, questionário '
      + 'ou oficina para chegar aos resultados (Guia do MTE, cap. 3)');
  }

  if (estrategias.includes('QUESTIONARIO')) {
    if (!String(p.instrumento || '').trim()) {
      add('nome do questionário', 'nome do questionário ou ferramenta empregada');
    }
    if (!String(p.instrumento_fundamentacao || '').trim()) {
      add('fundamentação do questionário',
        'estudo científico ou instituição de SST que fundamenta o questionário (Guia do MTE, cap. 3)');
    }
    if (p.anonimato_garantido !== true) {
      add('anonimato do questionário',
        'garantia de anonimato do questionário, que o Guia do MTE e o Manual do GRO exigem');
    }
  }

  const todos = fatoresDaAvaliacao(aep);
  const semConclusao = todos.filter((f) => !f.avaliacao?.conclusao);
  if (semConclusao.length > 0) {
    add(`${semConclusao.length} fator(es) psicossocial(is) sem conclusão`,
      `conclusão dos fatores psicossociais ${nomes(semConclusao)}`);
  }

  const adicionaisSemPerigo = todos.filter((f) => f.adicional && !f.perigo);
  if (adicionaisSemPerigo.length > 0) {
    add('descrição do fator adicional', 'descrição do perigo nos fatores psicossociais adicionais');
  }

  const presentes = todos.filter((f) => f.avaliacao?.conclusao === 'PRESENTE');
  const semCaracterizacao = presentes.filter((f) => !String(f.avaliacao?.caracterizacao || '').trim());
  if (semCaracterizacao.length > 0) {
    add('caracterização dos fatores presentes',
      `caracterização da exposição (como, por quanto tempo, com que frequência e intensidade) dos fatores ${nomes(semCaracterizacao)}`);
  }
  const semFonte = presentes.filter((f) => !(Array.isArray(f.avaliacao?.fontes) && f.avaliacao.fontes.length > 0));
  if (semFonte.length > 0) {
    add('fonte da constatação', `de onde veio a constatação dos fatores ${nomes(semFonte)}`);
  }

  // A fonte citada tem de ser uma estrategia declarada: "questionario" como
  // fonte sem questionario aplicado e constatacao que ninguem fez.
  const fonteSemEstrategia = presentes.filter((f) => {
    const fontes: string[] = Array.isArray(f.avaliacao?.fontes) ? f.avaliacao.fontes : [];
    return (fontes.includes('QUESTIONARIO') && !estrategias.includes('QUESTIONARIO'))
      || (fontes.includes('OFICINA') && !estrategias.includes('OFICINA'));
  });
  if (fonteSemEstrategia.length > 0) {
    add('fonte sem estratégia declarada',
      `os fatores ${nomes(fonteSemEstrategia)} citam questionário ou oficina como fonte, e a estratégia não foi declarada`);
  }

  const desempenho = p.avaliacao_de_desempenho || {};
  if (!desempenho.conclusao) {
    add('item 17.4.4', 'conclusão sobre o item 17.4.4 da NR-17 (avaliação de desempenho para remuneração)');
  } else if (desempenho.conclusao === 'NAO_ATENDE' && !String(desempenho.observacao || '').trim()) {
    add('o que não atende ao 17.4.4', 'o que se observou no item 17.4.4 da NR-17, julgado não atendido');
  }

  const chefias = p.orientacao_das_chefias || {};
  if (!chefias.conclusao) {
    add('item 17.4.7', 'conclusão sobre o item 17.4.7 da NR-17 (orientação das chefias)');
  } else if (chefias.conclusao === 'NAO_ATENDE' && !String(chefias.observacao || '').trim()) {
    add('o que não atende ao 17.4.7', 'o que se observou no item 17.4.7 da NR-17, julgado não atendido');
  }

  // "Nao ha identificacao de perigos e avaliacao de riscos valida referente
  // aos fatores de risco psicossociais [...] sem a voz do trabalhador"
  // (Manual do GRO, 17.2). Ouvido SIM sem data, numero e forma e afirmacao
  // sem registro. O NAO e o vazio ja saem em faltasDaAEP.
  if (aep?.workers_heard === 'SIM') {
    const semRegistro: string[] = [];
    if (!String(aep?.workers_heard_date || '').trim()) semRegistro.push('data');
    if (!(Number(aep?.workers_heard_count) > 0)) semRegistro.push('número de ouvidos');
    if (!String(aep?.workers_heard_note || '').trim()) semRegistro.push('forma');
    if (semRegistro.length > 0) {
      add('registro da oitiva',
        `registro da oitiva dos empregados (${semRegistro.join(', ')}), sem a qual a avaliação psicossocial não é válida (Manual do GRO, item 17.2)`);
    }
  }

  return falta;
}

// ===========================================================================
// LIGACAO COM O INVENTARIO
// ===========================================================================

export const ehRiscoPsicossocial = (r: any): boolean =>
  Boolean(String(r?.origin_psychosocial_factor || '').trim());

const ativo = (r: any) => r && r.status !== 'INACTIVE';

/** Riscos ativos do inventario que nasceram desta AEP (e deste fator). */
export function riscosDaOrigem(riscos: any[], aepId: string, chave?: string): any[] {
  return (Array.isArray(riscos) ? riscos : []).filter(
    (r) => ativo(r)
      && r?.origin_aep_id === aepId
      && ehRiscoPsicossocial(r)
      && (chave === undefined || r.origin_psychosocial_factor === chave)
  );
}

/**
 * Coerencia entre a AEP e o inventario, nas duas direcoes.
 *
 *   1. Fator PRESENTE tem de estar no inventario de cada GHE da situacao
 *      (item 17.3.5 da NR-17; alinea "h" do subitem 1.5.7.3.2 da NR-01).
 *   2. Risco que nasceu de um fator que a AEP nao aponta mais como presente
 *      tem de ser reavaliado (subitem 1.5.4.4.6 da NR-01) - e nao sumir.
 */
export function faltasDeInventarioPsicossocial(
  aep: any,
  riscos: any[],
  nomeDoGhe: (id: string) => string = (id) => id
): FaltaPsicossocial[] {
  const falta: FaltaPsicossocial[] = [];
  const ghes: string[] = Array.isArray(aep?.ghe_ids) ? aep.ghe_ids : [];
  const presentes = fatoresPresentes(aep);

  presentes.forEach((f) => {
    if (ghes.length === 0) {
      falta.push({
        curto: 'GHE para o inventário',
        longo: `GHE da situação, sem o qual o fator "${f.perigo}" não pode entrar no inventário de riscos (item 17.3.5 da NR-17)`
      });
      return;
    }
    const fora = ghes.filter(
      (g) => !riscosDaOrigem(riscos, aep.id, f.chave).some((r) => r.ghe_id === g)
    );
    if (fora.length > 0) {
      falta.push({
        curto: 'fator presente fora do inventário (17.3.5)',
        longo: `fator "${f.perigo}" presente e fora do inventário de riscos do GHE ${fora.map(nomeDoGhe).join(', ')} (item 17.3.5 da NR-17)`
      });
    }
  });

  const chavesPresentes = new Set(presentes.map((f) => f.chave));
  riscosDaOrigem(riscos, aep?.id)
    .filter((r) => !chavesPresentes.has(r.origin_psychosocial_factor))
    .forEach((r) => {
      falta.push({
        curto: 'risco sem fator presente na AEP',
        longo: `o inventário mantém "${r.agent_name}" (GHE ${nomeDoGhe(r.ghe_id)}), mas a AEP não aponta mais o fator como presente: reavalie o risco (subitem 1.5.4.4.6 da NR-01)`
      });
    });

  return falta;
}

/** Riscos psicossociais cuja AEP de origem nao esta mais ativa. */
export function riscosPsicossociaisSemAEP(riscos: any[], aeps: any[]): any[] {
  const ativas = new Set((Array.isArray(aeps) ? aeps : [])
    .filter((a) => a && a.status !== 'INACTIVE')
    .map((a) => a.id));
  return (Array.isArray(riscos) ? riscos : []).filter(
    (r) => ativo(r) && ehRiscoPsicossocial(r) && !ativas.has(r.origin_aep_id)
  );
}

// ===========================================================================
// LEVAR O FATOR AO INVENTARIO
// ===========================================================================

export interface PedidoDeInventario {
  aep: any;
  chave: string;
  gheId: string;
  severidade: number;
  probabilidade: number;
  situacoes: SituacaoOperacional[];
  /** Ha medida de prevencao implementada para este fator? */
  medidaImplementada: boolean;
  /** A eficacia dela foi verificada, com evidencia? */
  eficaciaVerificada: boolean;
  descricaoDaMedida?: string;
}

/**
 * O pedido pode virar risco no inventario?
 *
 * Severidade e probabilidade sao escolha de quem avalia, pelos criterios
 * documentados no PGR (subitem 1.5.4.4.2.2). O sistema nao sugere numero:
 * a classificacao define prioridade e prazo do plano de acao.
 */
export function conferirPedidoDeInventario(
  pedido: PedidoDeInventario,
  riscos: any[]
): { ok: boolean; fator?: FatorAvaliado; motivo?: string } {
  const fator = fatoresDaAvaliacao(pedido.aep).find((f) => f.chave === pedido.chave);
  if (!fator) return { ok: false, motivo: 'Fator não encontrado nesta avaliação.' };
  if (fator.avaliacao?.conclusao !== 'PRESENTE') {
    return { ok: false, motivo: 'Só vai ao inventário o fator avaliado como presente.' };
  }
  if (!fator.perigo) return { ok: false, motivo: 'Descreva o perigo antes de levá-lo ao inventário.' };
  if (!String(fator.avaliacao?.caracterizacao || '').trim()) {
    return { ok: false, motivo: 'Caracterize a exposição antes: o inventário exige a caracterização (alínea "g" do subitem 1.5.7.3.2 da NR-01).' };
  }
  if (!(Array.isArray(fator.avaliacao?.fontes) && fator.avaliacao.fontes.length > 0)) {
    return { ok: false, motivo: 'Indique de onde veio a constatação antes de levar o fator ao inventário.' };
  }
  const ghes: string[] = Array.isArray(pedido.aep?.ghe_ids) ? pedido.aep.ghe_ids : [];
  if (!ghes.includes(pedido.gheId)) {
    return { ok: false, motivo: 'O GHE escolhido não está entre os da situação avaliada.' };
  }
  if (!classificarRisco(pedido.severidade, pedido.probabilidade)) {
    return { ok: false, motivo: 'Escolha a severidade e a probabilidade, de 1 a 5, pelos critérios das seções 5.4 e 5.5 do PGR.' };
  }
  if (!Array.isArray(pedido.situacoes) || pedido.situacoes.length === 0) {
    return { ok: false, motivo: 'Indique a situação operacional (alínea "b" do subitem 1.5.7.3.2 da NR-01).' };
  }
  if (pedido.eficaciaVerificada && !pedido.medidaImplementada) {
    return { ok: false, motivo: 'Não há eficácia verificada de medida que não foi implementada.' };
  }
  if (pedido.medidaImplementada && !String(pedido.descricaoDaMedida || '').trim()) {
    return { ok: false, motivo: 'Descreva a medida implementada (alínea "f" do subitem 1.5.7.3.2 da NR-01).' };
  }
  if (riscosDaOrigem(riscos, pedido.aep.id, pedido.chave).some((r) => r.ghe_id === pedido.gheId)) {
    return { ok: false, motivo: 'Este fator já está no inventário deste GHE. Ajuste-o na aba de inventário.' };
  }
  return { ok: true, fator };
}

/**
 * O risco do inventario que nasce de um fator presente.
 *
 * Categoria ERGONOMICO porque e onde o subitem 1.5.3.1.4 da NR-01 poe os
 * fatores psicossociais. Sem codigo da Tabela 24: nao e agente nocivo do
 * Anexo IV do Decreto 3.048/1999, e por isso nao vai ao S-2240, ao LTCAT nem
 * aos laudos de insalubridade e periculosidade.
 */
export function riscoDoFator(
  pedido: PedidoDeInventario,
  fator: FatorAvaliado
): Omit<SSTEnvironmentalRisk, 'id' | 'organization_id' | 'created_at' | 'updated_at'> {
  const classificado = classificarRisco(pedido.severidade, pedido.probabilidade)!;
  const caracterizacao = String(fator.avaliacao?.caracterizacao || '').trim();
  return {
    client_id: pedido.aep.client_id,
    client_unit_id: pedido.aep.client_unit_id || '',
    ghe_id: pedido.gheId,
    risk_category: 'ERGONÔMICO',
    risk_code_table_24: '',
    agent_name: `${PREFIXO_DO_RISCO}${fator.perigo}`,
    generating_source: `${pedido.aep.situation_name}: ${caracterizacao}`,
    propagation_path: 'Não se aplica (fator da organização do trabalho)',
    health_effects: fator.consequencias || '',
    operational_situation: pedido.situacoes,
    evaluation_type: 'QUALITATIVA',
    probability: pedido.probabilidade as 1 | 2 | 3 | 4 | 5,
    severity: pedido.severidade as 1 | 2 | 3 | 4 | 5,
    risk_level: classificado.nivel,
    epc_implemented: pedido.medidaImplementada,
    epc_description: pedido.medidaImplementada ? String(pedido.descricaoDaMedida || '').trim() : undefined,
    epc_effective: pedido.medidaImplementada && pedido.eficaciaVerificada,
    epi_required: false,
    epis: [],
    special_retirement_applies: false,
    gfip_code: '00',
    ltcat_technical_conclusion: 'Não é agente nocivo do Anexo IV do Decreto 3.048/1999.',
    insalubridade_applies: false,
    periculosidade_applies: false,
    origin_aep_id: pedido.aep.id,
    origin_psychosocial_factor: fator.chave,
    status: 'ACTIVE'
  };
}

// ===========================================================================
// IMPRESSAO
// ===========================================================================

const rotuloDaFonte = (v: string) => FONTES_DA_CONSTATACAO.find((x) => x.valor === v)?.rotulo || v;

/**
 * Linhas do quadro de fatores, iguais no documento da AEP e no relatorio.
 * Colunas: fator · conclusao · caracterizacao e fontes · inventario.
 */
export function linhasDosFatores(
  aep: any,
  riscos: any[],
  nomeDoGhe: (id: string) => string = (id) => id
): string[][] {
  const ghes: string[] = Array.isArray(aep?.ghe_ids) ? aep.ghe_ids : [];
  return fatoresDaAvaliacao(aep).map((f) => {
    const c = f.avaliacao?.conclusao;
    const fontes: string[] = Array.isArray(f.avaliacao?.fontes) ? f.avaliacao.fontes : [];
    const caracterizacao = String(f.avaliacao?.caracterizacao || '').trim();

    let inventario = '—';
    if (c === 'PRESENTE') {
      inventario = ghes.length === 0
        ? 'PENDENTE — situação sem GHE'
        : ghes.map((g) => {
          const r = riscosDaOrigem(riscos, aep.id, f.chave).find((x) => x.ghe_id === g);
          const cl = r ? classificarRisco(r.severity, r.probability) : null;
          return r
            ? `${nomeDoGhe(g)}: ${cl ? `${cl.rotulo} (S${cl.severidade} × P${cl.probabilidade})` : 'sem classificação'}`
            : `${nomeDoGhe(g)}: PENDENTE — fora do inventário`;
        }).join('\n');
    }

    return [
      `${f.perigo || 'Fator sem descrição'}${f.adicional ? ' (adicional)' : ''}`
        + (f.consequencias ? `\nPossível consequência: ${f.consequencias}` : ''),
      c ? CONCLUSAO_DO_FATOR_POR_EXTENSO[c] : 'PENDENTE',
      c === 'PRESENTE'
        ? [
          caracterizacao || 'PENDENTE — caracterização',
          fontes.length > 0 ? `Fontes: ${fontes.map(rotuloDaFonte).join('; ')}` : 'PENDENTE — fonte da constatação'
        ].join('\n')
        : '',
      inventario
    ];
  });
}

/** Como a avaliacao foi conduzida, em pares rotulo/valor. */
export function linhasDoMetodo(aep: any): Array<[string, string]> {
  const p = aep?.psychosocial || {};
  const estrategias: string[] = Array.isArray(p.estrategias) ? p.estrategias : [];
  const linhas: Array<[string, string]> = [
    ['Estratégia (Guia do MTE, cap. 3)',
      estrategias.length > 0
        ? estrategias.map((e) => ESTRATEGIAS_PSICOSSOCIAIS.find((x) => x.valor === e)?.rotulo || e).join('\n')
        : 'PENDENTE']
  ];
  if (estrategias.includes('QUESTIONARIO')) {
    linhas.push(['Questionário', String(p.instrumento || '').trim() || 'PENDENTE']);
    linhas.push(['Fundamentação do questionário', String(p.instrumento_fundamentacao || '').trim() || 'PENDENTE']);
    linhas.push(['Anonimato', p.anonimato_garantido === true ? 'Garantido' : 'PENDENTE — não confirmado']);
  }
  linhas.push(['Informações de saúde consultadas (agregadas)',
    String(p.indicadores_consultados || '').trim() || 'Não informado']);
  linhas.push(['Oitiva dos empregados (item 17.3.8)',
    aep?.workers_heard === 'SIM'
      ? [
        aep?.workers_heard_date ? `Em ${String(aep.workers_heard_date).split('-').reverse().join('/')}` : 'Data: PENDENTE',
        Number(aep?.workers_heard_count) > 0 ? `${Number(aep.workers_heard_count)} empregado(s) ouvido(s)` : 'Número de ouvidos: PENDENTE',
        String(aep?.workers_heard_note || '').trim() || 'Forma: PENDENTE'
      ].join(' · ')
      : aep?.workers_heard === 'NAO' ? 'NÃO — a avaliação psicossocial não é válida sem a voz do trabalhador' : 'PENDENTE']);
  return linhas;
}

/** Os dois requisitos da NR-17, em pares rotulo/valor. */
export function linhasDosRequisitos(aep: any): Array<[string, string]> {
  const p = aep?.psychosocial || {};
  const d = p.avaliacao_de_desempenho || {};
  const c = p.orientacao_das_chefias || {};
  const valor = (req: { conclusoes: Record<string, string> }, x: any) => (x?.conclusao
    ? `${req.conclusoes[x.conclusao] || x.conclusao}${String(x.observacao || '').trim() ? ` — ${String(x.observacao).trim()}` : (x.conclusao === 'NAO_ATENDE' ? ' — PENDENTE: o que se observou' : '')}`
    : 'PENDENTE');
  return [
    [`${REQUISITO_17_4_4.item} — avaliação de desempenho e saúde`, valor(REQUISITO_17_4_4, d)],
    [`${REQUISITO_17_4_7.item} — orientação das chefias`, valor(REQUISITO_17_4_7, c)]
  ];
}
