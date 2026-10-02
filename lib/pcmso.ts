/**
 * PCMSO — as regras da NR-07 que o sistema consegue conferir.
 *
 * FONTE UNICA para a aba de protocolos, o PDF do PCMSO, a pre-visualizacao e
 * a tela de documentos. Os textos impressos estao em lib/pcmsoModelo.ts; aqui
 * fica so o que decide: periodicidade maxima, o que compoe o programa, o que
 * os Anexos exigem pelos riscos do inventario, o que falta e os numeros do
 * relatorio analitico.
 *
 * O QUE ESTE MODULO NAO FAZ
 *
 * Nao prescreve exame. Quais exames cada GHE faz e decisao do medico
 * responsavel pelo PCMSO (item 7.4.1 "c" da NR-07). O modulo aponta o que a
 * norma torna obrigatorio e o que esta faltando; nunca preenche um protocolo
 * por conta propria.
 */
import { classificarRisco } from '@/lib/classificacaoDeRisco';
import { codigoExisteNaTabela27, normalizarCodigoTabela27 } from '@/lib/tabela27';
import { ehProtocoloModelo } from '@/lib/protocolosDeExame';
import { fonte, trecho } from '@/lib/pcmsoFontes';

/** Tabela 27 do eSocial: 0295 = "Avaliacao clinica ocupacional (anamnese e exame fisico)". */
export const CODIGO_AVALIACAO_CLINICA = '0295';

export type OcasiaoDoExame =
  | 'ADMISSIONAL'
  | 'PERIODICO'
  | 'RETORNO_TRABALHO'
  | 'MUDANCA_RISCO'
  | 'DEMISSIONAL';

/** Subitem 7.5.6 da NR-07: os cinco exames obrigatorios. */
export const OCASIOES: Array<{ valor: OcasiaoDoExame; rotulo: string; sigla: string }> = [
  { valor: 'ADMISSIONAL', rotulo: 'Admissional', sigla: 'ADM' },
  { valor: 'PERIODICO', rotulo: 'Periódico', sigla: 'PER' },
  { valor: 'RETORNO_TRABALHO', rotulo: 'Retorno ao trabalho', sigla: 'RT' },
  { valor: 'MUDANCA_RISCO', rotulo: 'Mudança de risco', sigla: 'MR' },
  { valor: 'DEMISSIONAL', rotulo: 'Demissional', sigla: 'DEM' }
];

const ativo = (x: any) => x && x.status !== 'INACTIVE';

/** "GHE-01" ja diz GHE: o texto nao repete ("do GHE GHE-01"). */
const rotuloDoGhe = (nome: string) => (/^GHE\b/i.test(String(nome || '')) ? nome : `GHE ${nome}`);

export const ehAusenciaDeRisco = (r: any) =>
  /^AUS[EÊ]NCIA/i.test(String(r?.risk_category || ''))
  || String(r?.risk_code_table_24 || '').startsWith('09.01.001');

/** Riscos ativos do inventario de um GHE. */
export function riscosDoGhe(riscos: any[], gheId: string): any[] {
  return (Array.isArray(riscos) ? riscos : []).filter((r) => ativo(r) && r?.ghe_id === gheId);
}

/** Riscos que contam como "identificados" para o PCMSO: tudo menos a declaracao de ausencia. */
export function riscosIdentificados(riscosDoGrupo: any[]): any[] {
  return (riscosDoGrupo || []).filter((r) => !ehAusenciaDeRisco(r));
}

/**
 * Periodicidade maxima do exame clinico periodico (subitem 7.5.8, II):
 * a cada ano, ou menos, para quem esta exposto a risco identificado e
 * classificado no PGR; a cada dois anos para os demais.
 *
 * Risco identificado e ainda NAO classificado conta como exposicao: o
 * inventario esta incompleto, e o lado seguro e o anual - um auditor nao
 * contesta exame anual, contesta o bienal de quem estava exposto.
 */
export function periodicidadeMaximaDoClinico(riscosDoGrupo: any[]): {
  meses: 12 | 24;
  motivo: string;
  semClassificacao: number;
} {
  const identificados = riscosIdentificados(riscosDoGrupo);
  const semClassificacao = identificados.filter(
    (r) => !classificarRisco(r?.severity, r?.probability)
  ).length;
  if (identificados.length > 0) {
    return {
      meses: 12,
      motivo: `${identificados.length} risco(s) identificado(s) no inventário do PGR: exame clínico a cada ano, ou a intervalos menores a critério do médico responsável (subitem 7.5.8, II, "a", 1)`,
      semClassificacao
    };
  }
  return {
    meses: 24,
    motivo: 'Nenhum risco ocupacional identificado no inventário do PGR: exame clínico a cada dois anos (subitem 7.5.8, II, "b")',
    semClassificacao: 0
  };
}

/**
 * Os protocolos que compoem o PCMSO deste cliente.
 *
 * So os do cliente e os dos GHE dele. Os protocolos MODELO, que acompanham o
 * sistema, ficam de fora: exame que o medico responsavel nao escolheu para
 * este cliente nao pode sair no programa dele como se tivesse escolhido.
 */
export function protocolosDoPcmso(protocolos: any[], ghes: any[], clientId: string): any[] {
  const ghesDoCliente = new Set(
    (Array.isArray(ghes) ? ghes : []).filter((g) => g?.client_id === clientId).map((g) => g?.id)
  );
  return (Array.isArray(protocolos) ? protocolos : [])
    .filter(ativo)
    .filter((p) => !ehProtocoloModelo(p))
    .filter((p) => p?.client_id === clientId || (Boolean(p?.ghe_id) && ghesDoCliente.has(p.ghe_id)));
}

/** Protocolos-modelo ativos: ainda nao adotados para cliente nenhum. */
export function protocolosModelo(protocolos: any[]): any[] {
  return (Array.isArray(protocolos) ? protocolos : []).filter(ativo).filter(ehProtocoloModelo);
}

/** Protocolos que alcancam um GHE: os dele e os do cliente sem GHE. */
export function protocolosDoGhe(protocolosDoCliente: any[], gheId: string): any[] {
  return (protocolosDoCliente || []).filter((p) => !p?.ghe_id || p.ghe_id === gheId);
}

export const codigoDo = (p: any): string => normalizarCodigoTabela27(p?.exam_code_table_27);

export const ehAvaliacaoClinica = (p: any): boolean => codigoDo(p) === CODIGO_AVALIACAO_CLINICA;

/**
 * Exame demissional dispensado? (subitem 7.5.11)
 *
 * O exame clinico demissional e feito em ate 10 dias do termino do contrato,
 * e pode ser dispensado se o exame clinico ocupacional mais recente tiver
 * sido feito ha menos de 135 dias (graus de risco 1 e 2) ou de 90 dias
 * (graus 3 e 4). Sem grau de risco, nao se sabe o prazo: devolve null.
 */
export function prazoDeDispensaDoDemissional(grauDeRisco: any): 135 | 90 | null {
  const g = Number(grauDeRisco);
  if (g === 1 || g === 2) return 135;
  if (g === 3 || g === 4) return 90;
  return null;
}

// ===========================================================================
// ANEXOS DA NR-07 ACIONADOS PELO INVENTARIO
// ===========================================================================

/** Tabela 27: 0281 audiometria tonal ocupacional; 1078 RX de torax padrao OIT; 1057 espirometria. */
export const CODIGO_AUDIOMETRIA = '0281';
export const CODIGO_RX_TORAX_OIT = '1078';
export const CODIGO_ESPIROMETRIA = '1057';

// ===========================================================================
// EXAMES VEDADOS E EXAMES QUE EXIGEM JUSTIFICATIVA
// ===========================================================================

/**
 * Procedimentos da Tabela 27 que nenhum exame ocupacional pode incluir.
 * HIV: Portaria MTP n. 671/2021, art. 199, par. 1o. Gonadotrofina corionica
 * (teste de gravidez): CLT, art. 373-A, IV, e Lei n. 9.029/1995, art. 2o, I.
 * Os nomes conferem com lib/tabela27.ts.
 */
export const PROCEDIMENTOS_VEDADOS: Record<string, { motivo: string; fonte: string }> = {
  '0732': { motivo: 'teste para HIV', fonte: 'Portaria MTP nº 671/2021, art. 199, § 1º' },
  '0733': { motivo: 'teste para HIV', fonte: 'Portaria MTP nº 671/2021, art. 199, § 1º' },
  '1290': { motivo: 'teste para HIV', fonte: 'Portaria MTP nº 671/2021, art. 199, § 1º' },
  '1381': { motivo: 'teste para HIV', fonte: 'Portaria MTP nº 671/2021, art. 199, § 1º' },
  '0739': { motivo: 'teste de gravidez', fonte: 'CLT, art. 373-A, IV; Lei nº 9.029/1995, art. 2º, I' }
};

/**
 * Exames que pedem justificativa tecnica qualquer que seja o fundamento
 * marcado: o espermograma pode ser tomado como exame relativo a esterilizacao
 * (Lei n. 9.029/1995, art. 2o, I), e so cabe ligado a risco do PGR (7.5.18).
 */
export const PROCEDIMENTOS_QUE_EXIGEM_JUSTIFICATIVA: Record<string, { motivo: string; fonte: string }> = {
  '0568': { motivo: 'exame que pode ser tomado como relativo à esterilização', fonte: 'Lei nº 9.029/1995, art. 2º, I' },
  // Hormonios da gestacao (nomes em lib/tabela27.ts). A ligacao com a gravidez
  // e avaliacao tecnica, nao texto da lei: por isso justificativa, e nao veto.
  '0576': { motivo: 'exame que pode ser tomado como relativo a estado de gravidez', fonte: 'Lei nº 9.029/1995, art. 2º, I' },
  '0789': { motivo: 'exame que pode ser tomado como relativo a estado de gravidez', fonte: 'Lei nº 9.029/1995, art. 2º, I' },
  '1130': { motivo: 'exame que pode ser tomado como relativo a estado de gravidez', fonte: 'Lei nº 9.029/1995, art. 2º, I' }
};

export const procedimentoVedado = (codigo: any) =>
  PROCEDIMENTOS_VEDADOS[normalizarCodigoTabela27(codigo)] || null;

export const exigeJustificativa = (p: any): boolean =>
  p?.mandatory_by_standard === 'CRITERIO_MEDICO' || Boolean(PROCEDIMENTOS_QUE_EXIGEM_JUSTIFICATIVA[codigoDo(p)]);

const semAcento = (t: any) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const codigo24 = (r: any) => String(r?.risk_code_table_24 || '').split(/\s*[-–]\s*/)[0].trim();

/** Primeiro numero de um texto ("85,0 dB(A) para 8h" -> 85). */
const numeroDe = (t: any): number | null => {
  const m = String(t || '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export const ehRuido = (r: any) => codigo24(r) === '02.01.001' || /\bruido\b/.test(semAcento(r?.agent_name));

/**
 * Ruido abaixo do nivel de acao, comprovado no proprio inventario?
 *
 * So quando medicao e nivel de acao estao ambos em dB e o numero medido e
 * menor. Medicao em dose, unidade diferente ou campo vazio nao provam nada:
 * o Anexo II se aplica, e o medico decide com o PGR na mao.
 */
export function ruidoAbaixoDoNivelDeAcao(r: any): boolean {
  const unidadeDb = /db/i.test(String(r?.measurement_unit || '')) || /db/i.test(String(r?.measured_value || ''));
  if (!unidadeDb || !/db/i.test(String(r?.action_level || ''))) return false;
  const medido = numeroDe(r?.measured_value);
  const acao = numeroDe(r?.action_level);
  return medido !== null && acao !== null && medido < acao;
}

/** Poeiras minerais do Anexo III: silica, asbesto, carvao mineral e as nomeadas como poeira mineral. */
export const ehPoeiraMineral = (r: any) =>
  ['01.18.001', '01.02.001', '01.07.001'].includes(codigo24(r))
  || /silica|asbesto|amianto|poeiras? minera|carvao mineral|talco|caulim|grafite/.test(semAcento(r?.agent_name));

export const ehAsbesto = (r: any) =>
  codigo24(r) === '01.02.001' || /asbesto|amianto/.test(semAcento(r?.agent_name));

export const ehHiperbarico = (r: any) =>
  codigo24(r) === '02.01.015' && /hiperbar|comprimid|tubula|mergulh|elevad/.test(semAcento(`${r?.agent_name} ${r?.generating_source}`))
  || /hiperbar|ar comprimido|tubulao|mergulh/.test(semAcento(r?.agent_name));

export const ehRadiacaoIonizante = (r: any) =>
  codigo24(r) === '02.01.006' || /radiac(ao|oes) ionizante/.test(semAcento(r?.agent_name));

/** O PGR indicou o agente como cancerigeno (nome ou agravo). */
export const ehCancerigeno = (r: any) =>
  /cancer|carcinog|neoplas/.test(semAcento(`${r?.agent_name} ${r?.health_effects}`));

export interface AnexoAcionado {
  anexo: 'II' | 'III' | 'IV' | 'V';
  titulo: string;
  riscos: string[];
  exigencia: string;
}

/** Os Anexos da NR-07 que os riscos de um GHE acionam, e por que. */
export function anexosAcionados(riscosDoGrupo: any[]): AnexoAcionado[] {
  const lista: AnexoAcionado[] = [];
  const nomes = (rs: any[]) => rs.map((r) => r?.agent_name || 'risco sem nome');

  const ruido = (riscosDoGrupo || []).filter((r) => ehRuido(r) && !ruidoAbaixoDoNivelDeAcao(r));
  if (ruido.length > 0) {
    lista.push({
      anexo: 'II',
      titulo: 'Controle médico da exposição a níveis de pressão sonora elevados',
      riscos: nomes(ruido),
      exigencia: 'Exames audiométricos de referência e sequenciais de todos os empregados em ambientes acima do nível de ação informado no PGR, independentemente do uso de protetor auditivo (Anexo II, item 2), no mínimo na admissão, anualmente e na demissão (Anexo II, item 4.1).'
    });
  }
  const poeira = (riscosDoGrupo || []).filter(ehPoeiraMineral);
  if (poeira.length > 0) {
    lista.push({
      anexo: 'III',
      titulo: 'Controle radiológico e espirométrico da exposição a agentes químicos',
      riscos: nomes(poeira),
      exigencia: 'Radiografia de tórax pelos critérios da OIT, na periodicidade do Quadro 1, e espirometria na admissão e a cada dois anos (Anexo III, itens 1 e 3.1).'
        + (poeira.some(ehAsbesto)
          ? ' Asbesto: telerradiografia de tórax e espirometria na admissão, na demissão e anualmente (NR-15, Anexo 12, item 18).'
          : '')
    });
  }
  const hiper = (riscosDoGrupo || []).filter(ehHiperbarico);
  if (hiper.length > 0) {
    lista.push({
      anexo: 'IV',
      titulo: 'Controle médico ocupacional de exposição a condições hiperbáricas',
      riscos: nomes(hiper),
      exigencia: 'Exames nos padrões do Anexo IV, avaliados por médico qualificado (item 1.2); o atestado de aptidão tem validade de 6 (seis) meses (item 1.3).'
    });
  }
  const cancer = (riscosDoGrupo || []).filter((r) => ehRadiacaoIonizante(r) || ehCancerigeno(r));
  if (cancer.length > 0) {
    lista.push({
      anexo: 'V',
      titulo: 'Controle médico da exposição a substâncias químicas cancerígenas e a radiações ionizantes',
      riscos: nomes(cancer),
      exigencia: 'O médico do trabalho responsável deve registrar no PCMSO as atividades e funções com essa exposição, identificadas e classificadas no PGR (Anexo V, item 3.1). Prontuário de exposto a substância química cancerígena: guarda mínima de 40 (quarenta) anos após o desligamento (Anexo V, item 4.1).'
    });
  }
  return lista;
}

/**
 * O exame que o Anexo exige esta na matriz do GHE?
 *
 * Confere so o que da para conferir pelo codigo da Tabela 27: audiometria
 * (Anexo II), RX de torax OIT e espirometria (Anexo III), e a periodicidade de
 * 6 meses do exame clinico no hiperbarico (Anexo IV). O Anexo V exige registro
 * e guarda, que o documento imprime sozinho.
 */
export function faltasDosAnexos(entrada: {
  cliente: any;
  ghes: any[];
  riscos: any[];
  protocolos: any[];
  colaboradores?: any[];
  cargos?: any[];
}): FaltaNoPcmso[] {
  const falta: FaltaNoPcmso[] = [];
  const protocolos = protocolosDoPcmso(entrada.protocolos, entrada.ghes, entrada.cliente?.id);
  (entrada.ghes || []).forEach((g) => {
    const nome = g?.code || g?.name || 'GHE sem nome';
    const doGhe = protocolosDoGhe(protocolos, g.id);
    const doGrupo = riscosDoGhe(entrada.riscos, g.id);
    const tem = (codigo: string) => doGhe.some((p) => codigoDo(p) === codigo);
    const comCodigo = (codigo: string) => doGhe.filter((p) => codigoDo(p) === codigo);
    const ocasioesDe = (ps: any[]) => new Set(ps.flatMap((p) => (Array.isArray(p?.triggers) ? p.triggers : [])));
    const periodicoAte = (ps: any[], meses: number) => ps.some((p) =>
      Array.isArray(p?.triggers) && p.triggers.includes('PERIODICO')
      && Number(p?.periodicity_months) > 0 && Number(p.periodicity_months) <= meses);

    // Anexo I: o nome do agente coincide com substancia dos Quadros. Resolve-se
    // quando o medico registra a decisao numa justificativa ou criterio do GHE
    // que cite o "Anexo I": o indicador adotado ou o motivo de nao adotar.
    const doAnexoI = agentesDoAnexoI(doGrupo);
    if (doAnexoI.length > 0) {
      const decidido = doGhe.some((p) => /\banexo\s+i\b/i.test(`${p?.technical_justification || ''} ${p?.interpretation_criteria || ''}`));
      if (!decidido) {
        falta.push({
          secao: '5.4', curto: `Anexo I (${nome})`,
          longo: `decisão do médico sobre o indicador biológico do Anexo I para ${[...new Set(doAnexoI.map((x) => x.agente))].join(', ')} no ${rotuloDoGhe(nome)}: confirmada a substância pelo número CAS, o exame entra na matriz; não confirmada, registre o motivo na justificativa técnica de um exame do GHE, citando o "Anexo I" (subitens 7.5.13 a 7.5.15)`
        });
      }
    }

    anexosAcionados(doGrupo).forEach((a) => {
      if (a.anexo === 'II' && !tem(CODIGO_AUDIOMETRIA)) {
        falta.push({
          secao: '5.4', curto: `audiometria (${nome})`,
          longo: `audiometria (Tabela 27, código ${CODIGO_AUDIOMETRIA}) no ${rotuloDoGhe(nome)}, exposto a ${a.riscos.join(', ')} (Anexo II, item 2). Se a exposição estiver abaixo do nível de ação, registre a medição em dB e o nível de ação no inventário do PGR`
        });
      } else if (a.anexo === 'II') {
        const audios = comCodigo(CODIGO_AUDIOMETRIA);
        const ocasioes = ocasioesDe(audios);
        if (!ocasioes.has('ADMISSIONAL') || !ocasioes.has('DEMISSIONAL') || !periodicoAte(audios, 12)) {
          falta.push({
            secao: '5.4', curto: `audiometria na admissão, anual e na demissão (${nome})`,
            longo: `audiometria do ${rotuloDoGhe(nome)} no mínimo na admissão, anualmente e na demissão (Anexo II, item 4.1)`
          });
        }
      }
      if (a.anexo === 'III') {
        const espiros = comCodigo(CODIGO_ESPIROMETRIA);
        const rxs = comCodigo(CODIGO_RX_TORAX_OIT);
        if (espiros.length > 0 && (!ocasioesDe(espiros).has('ADMISSIONAL') || !periodicoAte(espiros, 24))) {
          falta.push({
            secao: '5.4', curto: `espirometria a cada dois anos (${nome})`,
            longo: `espirometria do ${rotuloDoGhe(nome)} no exame admissional e a cada dois anos (Anexo III, item 3.1)`
          });
        }
        if (doGrupo.some(ehAsbesto)) {
          const anual = (ps: any[]) => ps.length > 0 && periodicoAte(ps, 12)
            && ocasioesDe(ps).has('ADMISSIONAL') && ocasioesDe(ps).has('DEMISSIONAL');
          if ((rxs.length > 0 && !anual(rxs)) || (espiros.length > 0 && !anual(espiros))) {
            falta.push({
              secao: '5.4', curto: `asbesto: RX e espirometria anuais (${nome})`,
              longo: `telerradiografia de tórax e espirometria do ${rotuloDoGhe(nome)}, exposto a asbesto, na admissão, na demissão e anualmente (NR-15, Anexo 12, item 18)`
            });
          }
        }
        if (!tem(CODIGO_RX_TORAX_OIT)) {
          falta.push({
            secao: '5.4', curto: `RX de tórax OIT (${nome})`,
            longo: `radiografia de tórax padrão OIT (Tabela 27, código ${CODIGO_RX_TORAX_OIT}) no ${rotuloDoGhe(nome)}, exposto a ${a.riscos.join(', ')} (Anexo III, item 1, "a")`
          });
        }
        if (!tem(CODIGO_ESPIROMETRIA)) {
          falta.push({
            secao: '5.4', curto: `espirometria (${nome})`,
            longo: `espirometria (Tabela 27, código ${CODIGO_ESPIROMETRIA}) no ${rotuloDoGhe(nome)}, exposto a ${a.riscos.join(', ')} (Anexo III, item 1, "b")`
          });
        }
      }
      if (a.anexo === 'IV') {
        const acima = doGhe.filter(ehAvaliacaoClinica).filter((p) => !(Number(p?.periodicity_months) > 0 && Number(p.periodicity_months) <= 6));
        if (acima.length > 0 || !doGhe.some(ehAvaliacaoClinica)) {
          falta.push({
            secao: '5.4', curto: `aptidão hiperbárica de 6 meses (${nome})`,
            longo: `exame clínico a cada 6 meses no ${rotuloDoGhe(nome)}, exposto a condição hiperbárica: o atestado de aptidão tem validade de 6 (seis) meses (Anexo IV, item 1.3)`
          });
        }
      }
      if (a.anexo === 'V' && funcoesDoGhe(entrada.colaboradores || [], g.id, entrada.cargos || []).length === 0) {
        falta.push({
          secao: '5.4', curto: `funções expostas (Anexo V, ${nome})`,
          longo: `função de ao menos um empregado ativo do ${rotuloDoGhe(nome)}, exposto a ${a.riscos.join(', ')}: o médico do trabalho responsável deve registrar no PCMSO as atividades e funções com essa exposição (Anexo V, item 3.1)`
        });
      }
    });
  });
  return falta;
}

/** Funcoes dos empregados ativos de um GHE: o registro do Anexo V, item 3.1. */
export function funcoesDoGhe(colaboradores: any[], gheId: string, cargos: any[] = []): string[] {
  const nomes = (colaboradores || [])
    .filter((c) => c && c.status !== 'DISMISSED' && c.ghe_id === gheId)
    .map((c) => (cargos || []).find((j: any) => j?.id === c?.job_id)?.name || c?.job_title)
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  return [...new Set(nomes)];
}

// ===========================================================================
// ANEXO I: AGENTES COM INDICADOR BIOLOGICO
// ===========================================================================

const GENERICOS = new Set([
  'indutores', 'acido', 'oxido', 'metil', 'elementar', 'compostos', 'inorganicos',
  'inseticidas', 'inibidores', 'puros', 'mistura', 'seus'
]);

/** Palavras-chave de uma substancia dos Quadros: o nome limpo e a primeira palavra significativa. */
function chavesDaSubstancia(nome: string): string[] {
  const limpo = semAcento(nome).replace(/\(.*?\)/g, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  // Onde a SEGUNDA palavra define a substancia, a primeira sozinha confunde:
  // "tolueno" nao e o TDI, e "chumbo" nao e o chumbo tetraetila.
  if (/diisocianato/.test(limpo)) return ['diisocianato'];
  if (/tetraetila/.test(limpo)) return ['tetraetila'];
  const palavras = limpo.split(' ').filter((w) => w.length >= 5 && !GENERICOS.has(w));
  const tirarPlural = (w: string) => (w.length > 5 && w.endsWith('s') ? w.slice(0, -1) : w);
  return [...new Set([limpo, palavras[0] ? tirarPlural(palavras[0]) : ''].filter((x) => x.length >= 5))];
}

let quadrosDoAnexoI: Array<{ substancia: string; cas: string; quadro: 1 | 2; chaves: string[] }> | null = null;
function quadros() {
  if (!quadrosDoAnexoI) {
    const ler = (id: string, quadro: 1 | 2) => (JSON.parse(fonte(id).texto) as Array<{ substancia: string; cas: string }>)
      .map((x) => ({ ...x, quadro, chaves: chavesDaSubstancia(x.substancia) }));
    quadrosDoAnexoI = [...ler('nr07-anexoI-q1-substancias', 1), ...ler('nr07-anexoI-q2-substancias', 2)];
  }
  return quadrosDoAnexoI;
}

/**
 * Agentes do inventario cujo nome coincide com substancia dos Quadros 1 ou 2
 * do Anexo I. Casa por PALAVRA INTEIRA: "etilbenzeno" nao vira "benzeno".
 * E aviso para o medico conferir pelo numero CAS - o inventario nao traz CAS.
 */
export function agentesDoAnexoI(riscosDoGrupo: any[]): Array<{ agente: string; substancia: string; cas: string; quadro: 1 | 2 }> {
  const achados: Array<{ agente: string; substancia: string; cas: string; quadro: 1 | 2 }> = [];
  const ESPECIFICAS = new Set(['diisocianato', 'tetraetila']);
  (riscosDoGrupo || []).forEach((r) => {
    const nome = semAcento(r?.agent_name).replace(/[^a-z ]/g, ' ');
    const casa = (c: string) => new RegExp(`\\b${c}\\b`).test(nome);
    const casados = quadros().filter((q) => q.chaves.some(casa));
    // Casou por chave especifica (TDI, chumbo tetraetila): as genericas que
    // tambem casaram ("tolueno", "chumbo") sao a mesma palavra, nao o agente.
    const especificos = casados.filter((q) => q.chaves.some((c) => ESPECIFICAS.has(c) && casa(c)));
    (especificos.length > 0 ? especificos : casados).forEach((q) => {
      achados.push({ agente: r?.agent_name || '', substancia: q.substancia, cas: q.cas, quadro: q.quadro });
    });
  });
  return achados;
}

// ===========================================================================
// ATIVIDADES CRITICAS (7.5.3) E APTIDOES NO ASO (7.5.19.2)
// ===========================================================================

export interface AtividadeCritica {
  chave: 'NR-35' | 'NR-33' | 'NR-10' | 'NR-11' | 'ANEXO-IV' | 'ANEXO-V';
  rotulo: string;
  /** GHE, cargos ou publico, por extenso. */
  alcance: string;
  ghes: string[];
  texto: string;
  fonte: string;
  /** A NR manda consignar a aptidao no ASO? */
  aptidaoNoAso: boolean;
}

const normaDe = (t: any) => String(t?.norm || '').toUpperCase().replace(/\s+/g, '');
const chaveDe = (t: any) => String(t?.catalog_key || '');

const REGRAS_DAS_ATIVIDADES: Array<{
  chave: AtividadeCritica['chave'];
  rotulo: string;
  casa: (t: any) => boolean;
  /** O inventario do PGR tambem indica a atividade. */
  casaRisco?: (r: any) => boolean;
  texto: () => string;
  fonte: string;
  aptidaoNoAso: boolean;
}> = [
  {
    chave: 'NR-35', rotulo: 'Trabalho em altura',
    casa: (t) => chaveDe(t).startsWith('nr35') || normaDe(t) === 'NR-35',
    casaRisco: (r) => /\baltura\b/.test(semAcento(r?.agent_name)),
    texto: () => `${fonte('nr35-35.4.4').texto}\n${fonte('nr35-35.4.4.1').texto}`,
    fonte: 'NR-35, itens 35.4.4 e 35.4.4.1', aptidaoNoAso: true
  },
  {
    chave: 'NR-33', rotulo: 'Espaço confinado',
    casa: (t) => chaveDe(t).startsWith('nr33') || normaDe(t) === 'NR-33',
    casaRisco: (r) => /espacos? confinados?/.test(semAcento(r?.agent_name)),
    texto: () => `${fonte('nr33-33.5.19.1').texto}\n${fonte('nr33-33.5.19.2').texto}`,
    fonte: 'NR-33, subitens 33.5.19.1 e 33.5.19.2', aptidaoNoAso: true
  },
  {
    chave: 'NR-10', rotulo: 'Intervenção em instalações elétricas',
    casa: (t) => chaveDe(t).startsWith('nr10') || normaDe(t) === 'NR-10',
    texto: () => `${fonte('nr10-10.8.7').texto}\nA partir de 01/06/2027: ${fonte('nr10-10.7.5').texto}`,
    fonte: 'NR-10, item 10.8.7 (até 31/05/2027) e 10.7.5 (a partir de 01/06/2027)', aptidaoNoAso: false
  },
  {
    chave: 'NR-11', rotulo: 'Operação de equipamento de transporte motorizado',
    casa: (t) => chaveDe(t).startsWith('nr11') || normaDe(t) === 'NR-11',
    texto: () => trecho('nr11-11.1.6', '11.1.6.1', 'por conta do empregador.'),
    fonte: 'NR-11, subitem 11.1.6.1', aptidaoNoAso: false
  },
  {
    chave: 'ANEXO-IV', rotulo: 'Trabalho sob condições hiperbáricas',
    casa: () => false,
    casaRisco: (r) => ehHiperbarico(r),
    texto: () => `${fonte('nr07-anexoIV-1.2').texto}\n${fonte('nr07-anexoIV-1.3').texto}`,
    fonte: 'NR-07, Anexo IV, itens 1.2 e 1.3', aptidaoNoAso: true
  },
  {
    chave: 'ANEXO-V', rotulo: 'Atividade com radiação ionizante',
    casa: () => false,
    casaRisco: (r) => ehRadiacaoIonizante(r),
    texto: () => `${fonte('nr07-anexoV-5.1').texto}\n${fonte('nr07-anexoV-5.1.1').texto}`,
    fonte: 'NR-07, Anexo V, itens 5.1 e 5.1.1', aptidaoNoAso: true
  }
];

/**
 * As atividades criticas do cliente, pela matriz de treinamentos: quem tem de
 * ser capacitado para altura, espaco confinado, eletricidade ou transporte
 * motorizado e quem a NR manda avaliar de forma especifica.
 */
export function atividadesCriticasDoCliente(
  treinamentos: any[],
  clientId: string,
  ghes: any[],
  cargos: any[] = [],
  riscos: any[] = []
): AtividadeCritica[] {
  const doCliente = (Array.isArray(treinamentos) ? treinamentos : [])
    .filter((t) => ativo(t) && t?.client_id === clientId);
  const idsDosGhes = new Set((ghes || []).filter((g: any) => !g?.client_id || g.client_id === clientId).map((g: any) => g?.id));
  const riscosDoCliente = (Array.isArray(riscos) ? riscos : [])
    .filter((r) => ativo(r) && idsDosGhes.has(r?.ghe_id) && !ehAusenciaDeRisco(r));
  const nomeDoGhe = (id: string) => {
    const g = (ghes || []).find((x: any) => x?.id === id);
    return g?.code || g?.name || '';
  };
  const nomeDoCargo = (id: string) => (cargos || []).find((x: any) => x?.id === id)?.name || '';
  return REGRAS_DAS_ATIVIDADES
    .map((regra) => {
      const casados = doCliente.filter(regra.casa);
      const pelosRiscos = regra.casaRisco ? riscosDoCliente.filter(regra.casaRisco) : [];
      if (casados.length === 0 && pelosRiscos.length === 0) return null;
      const idsDeGhe = [...new Set([
        ...casados.flatMap((t) => (Array.isArray(t?.ghe_ids) ? t.ghe_ids : [])),
        ...pelosRiscos.map((r) => r.ghe_id)
      ])] as string[];
      const alcance = [
        ...idsDeGhe.map(nomeDoGhe),
        ...casados.flatMap((t) => (Array.isArray(t?.job_ids) ? t.job_ids : [])).map(nomeDoCargo),
        ...casados.map((t) => String(t?.audience_note || '').trim())
      ].filter(Boolean);
      return {
        chave: regra.chave,
        rotulo: regra.rotulo,
        alcance: [...new Set(alcance)].join('; '),
        ghes: idsDeGhe,
        texto: regra.texto(),
        fonte: regra.fonte,
        aptidaoNoAso: regra.aptidaoNoAso
      } as AtividadeCritica;
    })
    .filter((a): a is AtividadeCritica => Boolean(a));
}

/**
 * Atividade critica sem alcance, e - nas que a NR manda consignar no ASO - GHE
 * cujo exame clinico nao tem criterio de avaliacao da aptidao.
 */
export function faltasDasAtividadesCriticas(
  atividades: AtividadeCritica[],
  protocolos: any[],
  ghes: any[],
  clientId: string
): FaltaNoPcmso[] {
  const falta: FaltaNoPcmso[] = [];
  const doPcmso = protocolosDoPcmso(protocolos, ghes, clientId);
  (atividades || []).forEach((a) => {
    if (!a.alcance) {
      falta.push({
        secao: '5.5', curto: `alcance de ${a.rotulo.toLowerCase()}`,
        longo: `GHE, cargo ou público da atividade crítica "${a.rotulo}" (${a.fonte}): sem ele o PCMSO não sabe quem avaliar (subitem 7.5.3)`
      });
      return;
    }
    if (!a.aptidaoNoAso) return;
    a.ghes.forEach((gheId) => {
      const g = (ghes || []).find((x: any) => x?.id === gheId);
      const nome = g?.code || g?.name || 'GHE';
      // Sem protocolo clinico a falta tambem vale: a aptidao continua sem
      // criterio, e o "exame clinico" que falta e outra pendencia.
      const clinicos = protocolosDoGhe(doPcmso, gheId).filter(ehAvaliacaoClinica);
      if (!clinicos.some((p) => temTexto(p?.interpretation_criteria))) {
        falta.push({
          secao: '5.5', curto: `critério da aptidão (${a.chave}, ${nome})`,
          longo: `critério da avaliação de aptidão para ${a.rotulo.toLowerCase()} no exame clínico do ${rotuloDoGhe(nome)}: a aptidão deve ser consignada no ASO (${a.fonte}; subitens 7.5.3 e 7.5.19.2 da NR-07)`
        });
      }
    });
  });
  return falta;
}

// ===========================================================================
// EXIGENCIAS DE NR SETORIAL, PELO CNAE
// ===========================================================================

export interface ExigenciaSetorial {
  nr: string;
  titulo: string;
  motivo: string;
  itens: string[];
  /**
   * Conteudo que a NR manda constar DO PCMSO e que este documento nao redige.
   * Vira pendencia: o medico responsavel o redige e anexa. Nunca "a atestar",
   * porque nao se atesta o que o documento nao contem.
   */
  aRedigir: string[];
  /** O que o medico atesta ter considerado ao elaborar o programa. */
  atestar: string[];
  /** O que cabe ao empregador declarar. */
  organizacao: string[];
  /** Avisos que o documento imprime na secao 5.8. */
  avisos: string[];
  /** A NR acrescenta conteudo ao relatorio analitico: nao cabe o simplificado do 7.6.6. */
  relatorioCompleto?: boolean;
}

/**
 * NR setoriais que acrescentam conteudo ao PCMSO. O CNAE indica; quem confirma
 * a aplicacao e o responsavel, porque o campo de aplicacao de cada NR e mais
 * amplo ou mais estreito que uma divisao do CNAE.
 */
export function exigenciasSetoriais(cnae: any, riscos: any[] = []): ExigenciaSetorial[] {
  const d = String(cnae || '').replace(/\D/g, '');
  const lista: ExigenciaSetorial[] = [];
  const comRadiacao = (riscos || []).some((r) => ativo(r) && ehRadiacaoIonizante(r));
  const comQuimico = (riscos || []).some((r) => ativo(r) && /^QU[IÍ]MIC/i.test(String(r?.risk_category || '')));
  if (d.startsWith('86')) {
    lista.push({
      nr: 'NR-32', titulo: 'Segurança e saúde no trabalho em serviços de saúde',
      motivo: 'O CNAE principal (divisão 86, atenção à saúde humana) indica serviço de saúde: confirme a aplicação da NR-32 pelo seu subitem 32.1.2.',
      itens: [
        fonte('nr32-32.2.3.1').texto, fonte('nr32-32.2.3.2').texto, fonte('nr32-32.2.3.3').texto,
        fonte('nr32-32.2.3.4-5').texto, fonte('nr32-32.2.4.17').texto,
        ...(comQuimico ? [trecho('nr32-32.3.5.1', '32.3.5.1', 'subitem 32.3.4.1.1.')] : []),
        // Alineas com o caput: "d) ser considerado..." sozinho nao diz quem deve.
        ...(comRadiacao
          ? [`${fonte('nr32-32.4.2.1-caput').texto} [...] ${fonte('nr32-32.4.4').texto}`,
            `${fonte('nr32-32.4.6-caput').texto} [...] ${fonte('nr32-32.4.8').texto}`]
          : [])
      ],
      aRedigir: [
        'NR-32, 32.2.3.1, "a" e "b": reconhecimento e avaliação dos riscos biológicos e localização das áreas de risco',
        'NR-32, 32.2.3.1, "d": vigilância médica dos trabalhadores potencialmente expostos',
        'NR-32, 32.2.3.1, "e", e 32.2.4.17.1: programa de vacinação (tétano, difteria, hepatite B e as estabelecidas no PCMSO)',
        'NR-32, 32.2.3.3, "a" a "g": procedimentos para a possibilidade de exposição acidental a agentes biológicos'
      ],
      atestar: [
        ...(comQuimico ? ['NR-32, 32.3.5.1: as fichas descritivas dos produtos químicos (32.3.4.1.1) foram consideradas na elaboração deste programa.'] : []),
        ...(comRadiacao ? ['NR-32, 32.4.2.1, "d": o Plano de Proteção Radiológica foi considerado na elaboração deste programa.'] : [])
      ],
      organizacao: comRadiacao
        ? ['dar ciência ao médico coordenador do PCMSO, por escrito e mediante recibo, dos resultados das doses de radiação (NR-32, 32.4.6, "f")']
        : [],
      avisos: [
        'Testagem para HIV após exposição acidental a material biológico: integra o atendimento do acidente (NR-32, 32.2.3.3, "a"), não o exame ocupacional. O resultado fica no prontuário e não entra no ASO, no S-2220 nem neste documento (Portaria MTP nº 671/2021, art. 199, § 1º; Lei nº 14.289/2022, art. 2º).'
      ]
    });
  }
  if (/^101[123]/.test(d)) {
    lista.push({
      nr: 'NR-36', titulo: 'Empresas de abate e processamento de carnes e derivados',
      motivo: 'O CNAE principal indica abate ou fabricação de produtos de carne: confirme a aplicação da NR-36.',
      itens: ['nr36-36.12.1-4', 'nr36-36.12.5', 'nr36-36.12.6-7', 'nr36-36.12.8'].map((id) => fonte(id).texto),
      aRedigir: [
        'NR-36, 36.12.3: instrumental clínico-epidemiológico que oriente as medidas do PGR e das melhorias ergonômicas',
        'NR-36, 36.12.5: Programa de Conservação Auditiva para os expostos acima do nível de ação',
        'NR-36, 36.12.7: conteúdo que a NR-36 acrescenta ao relatório analítico'
      ],
      atestar: [],
      organizacao: [],
      avisos: [],
      relatorioCompleto: true
    });
  }
  if (d.startsWith('38')) {
    lista.push({
      nr: 'NR-38', titulo: 'Limpeza urbana e manejo de resíduos sólidos',
      motivo: 'O CNAE principal (divisão 38) indica coleta, tratamento ou disposição de resíduos: confirme a aplicação da NR-38.',
      itens: ['nr38-38.4.1', 'nr38-38.4.3'].map((id) => fonte(id).texto),
      aRedigir: [
        'NR-38, 38.4.1: programa de imunização ativa, principalmente contra tétano e hepatite B',
        'NR-38, 38.4.3: procedimento específico para acidente com perfurocortante, se houver esse risco no PGR'
      ],
      atestar: ['NR-38, 38.4.2: os protocolos de saúde deste programa seguem os perigos e riscos do PGR.'],
      organizacao: [],
      avisos: []
    });
  }
  return lista;
}

// ===========================================================================
// DISPENSA DO PCMSO (NR-01, 1.8.6; NR-07, 7.7)
// ===========================================================================

/**
 * MEI, ME e EPP de graus 1 e 2, sem exposicao a agente fisico, quimico,
 * biologico nem a fator ergonomico, que declararem as informacoes digitais do
 * subitem 1.6.1, ficam dispensadas de ELABORAR o PCMSO (NR-01, 1.8.6) - nao
 * dos exames nem do ASO (1.8.6.1). O sistema nao ve a declaracao: diz que a
 * dispensa e possivel, nunca que ela existe.
 */
export function dispensaDoPcmso(cliente: any, montado: { grupos: Array<{ identificados: any[] }> }): {
  possivel: boolean;
  texto: string;
} {
  const porte = String(cliente?.porte || '').toUpperCase();
  const pequeno = /\bMEI\b|MICROEMPREENDEDOR|\bME\b|MICRO\s*EMPRESA|\bEPP\b|PEQUENO PORTE/.test(porte);
  const grau = Number(cliente?.risk_degree);
  const comExposicao = (montado?.grupos || []).flatMap((g) => g.identificados).some((r) =>
    /^(F[IÍ]SIC|QU[IÍ]MIC|BIOL[OÓ]GIC|ERGON)/i.test(String(r?.risk_category || '')));
  const possivel = pequeno && (grau === 1 || grau === 2) && !comExposicao;
  return {
    possivel,
    texto: possivel
      ? `${fonte('nr01-1.8.6').texto} ${fonte('nr01-1.8.6.1').texto} Pelo cadastro (porte, grau de risco e inventário), esta organização pode estar nessa situação; a dispensa depende da declaração do subitem 1.6.1, que este sistema não confere. Confirmada a dispensa, valem os subitens 7.7.1 a 7.7.4 da NR-07, transcritos abaixo; não confirmada, a organização está obrigada ao PCMSO.`
      : ''
  };
}

// ===========================================================================
// CRITERIO DE INTERPRETACAO POR EXAME (7.5.4 "c")
// ===========================================================================

/** Criterio que a propria NR-07 fixa para os exames dos Anexos. */
const CRITERIO_DO_ANEXO: Record<string, string> = {
  [CODIGO_AUDIOMETRIA]: 'Critérios de interpretação do Anexo II da NR-07 (item 5); diagnóstico conclusivo e aptidão na suspeita de PAINPSE a cargo do médico responsável (item 6).',
  [CODIGO_RX_TORAX_OIT]: 'Leitura pelos critérios da OIT, conforme o Anexo III da NR-07 (item 2.6).',
  [CODIGO_ESPIROMETRIA]: 'Diretrizes do Consenso Brasileiro sobre Espirometria, conforme o Anexo III da NR-07 (item 3.6); interpretação e laudo por médico (item 3.7).'
};

export function criterioDoExame(p: any): string {
  const proprio = String(p?.interpretation_criteria || '').trim();
  if (proprio) return proprio;
  return CRITERIO_DO_ANEXO[codigoDo(p)] || 'PENDENTE — critério de interpretação e conduta (alínea "c" do subitem 7.5.4)';
}

/** O exame tem criterio: o do protocolo ou o do Anexo. */
export const exameTemCriterio = (p: any): boolean =>
  temTexto(p?.interpretation_criteria) || Boolean(CRITERIO_DO_ANEXO[codigoDo(p)]);

// ===========================================================================
// O QUE FALTA
// ===========================================================================

export interface FaltaNoPcmso {
  /** Secao do documento onde a falta aparece. */
  secao: string;
  /** Rotulo curto, para a tela. */
  curto: string;
  /** Frase inteira, para a lista de pendencias do documento. */
  longo: string;
}

const temTexto = (v: any) => Boolean(String(v || '').trim());

/**
 * O que falta neste PCMSO, pelas regras da NR-07 que dependem so do cadastro.
 *
 * FONTE UNICA: a aba de protocolos, o PDF e a tela de documentos chamam esta
 * funcao. As faltas que dependem dos Anexos e das atividades criticas sao
 * somadas por `faltasDosAnexos` e `faltasDasAtividadesCriticas`.
 */
export function faltasDoCadastro(entrada: {
  cliente: any;
  ghes: any[];
  riscos: any[];
  protocolos: any[];
  colaboradores: any[];
  pendenciaDoCoordenador?: string | null;
  /** MEI, ME ou EPP que pode estar dispensada (NR-01, 1.8.6): periodico bienal se confirmada (7.7.1). */
  dispensaPossivel?: boolean;
}): FaltaNoPcmso[] {
  const falta: FaltaNoPcmso[] = [];
  const add = (secao: string, curto: string, longo: string) => falta.push({ secao, curto, longo });
  const { cliente, ghes, riscos, colaboradores } = entrada;
  // Filtra aqui, e nao em quem chama: o PDF antigo recebia os protocolos de
  // TODOS os clientes e imprimia os dos outros como "GHE nao vinculado".
  const protocolos = protocolosDoPcmso(entrada.protocolos, ghes, cliente?.id);

  const doc = String(cliente?.document_number || cliente?.caepf || '').replace(/\D/g, '');
  if (doc.length !== 14) {
    add('1.1', 'CNPJ ou CAEPF',
      'CNPJ ou CAEPF da organização, que o ASO deve trazer (alínea "a" do subitem 7.5.19.1)');
  }
  const grau = Number(cliente?.risk_degree);
  if (![1, 2, 3, 4].includes(grau)) {
    add('1.1', 'grau de risco',
      'grau de risco da organização (NR-04), do qual dependem o prazo de dispensa do exame demissional (subitem 7.5.11) e o relatório analítico simplificado (subitem 7.6.6)');
  }

  if (entrada.pendenciaDoCoordenador) {
    add('1.2', 'médico responsável pelo PCMSO',
      `médico responsável pelo PCMSO indicado pelo empregador (alínea "c" do subitem 7.4.1): ${entrada.pendenciaDoCoordenador}`
      + (entrada.dispensaPossivel
        ? '. Se a dispensa do PCMSO for confirmada (seção 1.1), não há programa a coordenar e os exames seguem o subitem 7.7.1.1'
        : ''));
  }

  const ativos = (colaboradores || []).filter((c) => c && c.status !== 'DISMISSED');
  const idsDeGhe = new Set((ghes || []).map((g) => g?.id));
  const semGhe = ativos.filter((c) => !c?.ghe_id || !idsDeGhe.has(c.ghe_id));
  if (semGhe.length > 0) {
    add('1.3', 'empregados sem GHE',
      `${semGhe.length} empregado(s) ativo(s) sem GHE: o PCMSO não sabe a que riscos estão expostos nem que exames lhes cabem (subitem 7.5.1)`);
  }

  if ((ghes || []).length === 0) {
    add('4.2', 'GHE e inventário',
      'GHE com inventário de riscos: o PCMSO deve ser elaborado considerando os riscos ocupacionais identificados e classificados pelo PGR (subitem 7.5.1)');
    return falta;
  }

  (ghes || []).forEach((g) => {
    const nome = g?.code || g?.name || 'GHE sem nome';
    const doGrupo = riscosDoGhe(riscos, g.id);
    if (doGrupo.length === 0) {
      add('4.2', `${nome} sem inventário`,
        `inventário de riscos do ${rotuloDoGhe(nome)} - nem os riscos, nem o registro de que não há risco. O PCMSO é elaborado a partir dele (subitem 7.5.1)`);
    }
    const identificados = riscosIdentificados(doGrupo);
    const semAgravo = identificados.filter((r) => !temTexto(r?.health_effects));
    if (semAgravo.length > 0) {
      add('4.2', `agravos à saúde (${nome})`,
        `possíveis agravos à saúde de ${semAgravo.map((r) => `"${r?.agent_name || 'risco sem nome'}"`).join(', ')} no ${rotuloDoGhe(nome)} (alínea "a" do subitem 7.5.4)`);
    }
    const semClassificacao = identificados.filter((r) => !classificarRisco(r?.severity, r?.probability));
    if (semClassificacao.length > 0) {
      add('4.2', `classificação no PGR (${nome})`,
        `classificação no PGR de ${semClassificacao.map((r) => `"${r?.agent_name || 'risco sem nome'}"`).join(', ')} no ${rotuloDoGhe(nome)}: o PCMSO parte dos riscos "identificados e classificados" (subitem 7.5.1)`);
    }

    const doGhe = protocolosDoGhe(protocolos, g.id);
    const clinicos = doGhe.filter(ehAvaliacaoClinica);
    if (clinicos.length === 0) {
      add('5.3', `exame clínico (${nome})`,
        `protocolo de exame clínico (Tabela 27, código ${CODIGO_AVALIACAO_CLINICA}) do ${rotuloDoGhe(nome)}: os exames do subitem 7.5.6 compreendem exame clínico (subitem 7.5.7)`);
    } else {
      const ocasioes = new Set(clinicos.flatMap((p) => (Array.isArray(p?.triggers) ? p.triggers : [])));
      const faltam = OCASIOES.filter((o) => !ocasioes.has(o.valor));
      if (faltam.length > 0) {
        add('5.3', `ocasiões do exame clínico (${nome})`,
          `exame clínico do ${rotuloDoGhe(nome)} nas ocasiões ${faltam.map((o) => o.rotulo.toLowerCase()).join(', ')}: os cinco exames do subitem 7.5.6 são obrigatórios`);
      }
      const maxima = periodicidadeMaximaDoClinico(doGrupo);
      const acima = clinicos.filter((p) => Number(p?.periodicity_months) > maxima.meses);
      if (acima.length > 0) {
        // Dispensa possivel e ainda nao confirmada: o bienal do 7.7.1 so vale
        // com ela. A pendencia continua, dizendo de que depende.
        const cabeNaDispensa = entrada.dispensaPossivel && acima.every((p) => Number(p.periodicity_months) <= 24);
        add('5.2', `periodicidade do clínico (${nome})`,
          cabeNaDispensa
            ? `confirmação da dispensa do PCMSO (NR-01, subitem 1.8.6) para manter o exame clínico do ${rotuloDoGhe(nome)} a cada ${acima.map((p) => p.periodicity_months).join(', ')} meses: confirmada, o periódico é a cada dois anos (subitem 7.7.1); não confirmada, o máximo é de ${maxima.meses} meses (subitem 7.5.8, II)`
            : `periodicidade do exame clínico do ${rotuloDoGhe(nome)}: ${acima.map((p) => `${p.periodicity_months} meses`).join(', ')} excede o máximo de ${maxima.meses} meses (subitem 7.5.8, II)`);
      }
      if (!clinicos.some((p) => temTexto(p?.interpretation_criteria))) {
        add('6.1', `critério do exame clínico (${nome})`,
          identificados.length > 0
            ? `critério de interpretação e conduta do exame clínico do ${rotuloDoGhe(nome)}, exposto a ${identificados.length} risco(s) do PGR: o que a anamnese e o exame físico investigam e o que se faz diante do achado (alínea "c" do subitem 7.5.4)`
            : `critério de interpretação e conduta do exame clínico do ${rotuloDoGhe(nome)}: o que se faz diante do achado (alínea "c" do subitem 7.5.4)`);
      }
    }

    doGhe.forEach((p) => {
      const exame = `"${p?.exam_name || codigoDo(p) || 'exame sem nome'}" (${nome})`;
      if (!codigoExisteNaTabela27(codigoDo(p))) {
        add('5.3', 'código da Tabela 27', `código da Tabela 27 do eSocial do exame ${exame}, sem o qual o S-2220 é recusado`);
      }
      const periodico = Array.isArray(p?.triggers) && p.triggers.includes('PERIODICO');
      if (periodico && !(Number(p?.periodicity_months) > 0)) {
        add('5.3', 'periodicidade', `periodicidade do exame periódico ${exame}`);
      }
      const vedado = procedimentoVedado(codigoDo(p));
      if (vedado) {
        add('5.3', 'exame vedado',
          `exclusão do exame ${exame}: ${vedado.motivo} não pode integrar exame ocupacional (${vedado.fonte})`);
      }
      if (exigeJustificativa(p) && !temTexto(p?.technical_justification)) {
        const especial = PROCEDIMENTOS_QUE_EXIGEM_JUSTIFICATIVA[codigoDo(p)];
        add('5.3', 'justificativa técnica',
          especial
            ? `justificativa técnica do exame ${exame}, ${especial.motivo} (${especial.fonte}): só cabe relacionado aos riscos classificados no PGR e tecnicamente justificado no PCMSO (subitem 7.5.18)`
            : `justificativa técnica do exame ${exame}, feito a critério do médico: ele deve estar relacionado aos riscos classificados no PGR e tecnicamente justificado no PCMSO (subitem 7.5.18)`);
      }
      if (!ehAvaliacaoClinica(p) && !exameTemCriterio(p)) {
        add('6.1', 'critério de interpretação',
          `critério de interpretação e conduta do exame ${exame} (alínea "c" do subitem 7.5.4)`);
      }
    });
  });

  return falta;
}

// ===========================================================================
// O PCMSO MONTADO
// ===========================================================================

export interface GrupoDoPcmso {
  ghe: any;
  nome: string;
  empregados: number;
  riscos: any[];
  identificados: any[];
  periodicidade: ReturnType<typeof periodicidadeMaximaDoClinico>;
  protocolos: any[];
  anexos: AnexoAcionado[];
}

export interface PcmsoMontado {
  grupos: GrupoDoPcmso[];
  protocolos: any[];
  modelosNaoAdotados: number;
  empregadosAtivos: number;
  atividades: AtividadeCritica[];
  dispensa: ReturnType<typeof dispensaDoPcmso>;
  setoriais: ExigenciaSetorial[];
  faltas: FaltaNoPcmso[];
}

/**
 * O PCMSO de um cliente, pronto para imprimir ou mostrar.
 *
 * O PDF, a pre-visualizacao e as telas leem DAQUI. Tres copias da mesma conta
 * acabam dizendo coisas diferentes - e o PCMSO "deve ser conhecido e atendido
 * por todos os medicos" (alinea "d" do subitem 7.5.4): nao pode ter versoes.
 */
export function montarPcmso(entrada: {
  cliente: any;
  ghes: any[];
  riscos: any[];
  protocolos: any[];
  colaboradores: any[];
  /** Matriz de treinamentos e cargos: atividades criticas (7.5.3). */
  treinamentos?: any[];
  cargos?: any[];
  pendenciaDoCoordenador?: string | null;
  /** Coordenador atribuido sem RQE cadastrado. */
  coordenadorSemRqe?: boolean;
  /** Nenhum responsavel pelo PGR atribuido a este cliente. */
  semResponsavelPeloPgr?: boolean;
  faltasExtras?: FaltaNoPcmso[];
}): PcmsoMontado {
  const clienteId = entrada.cliente?.id;
  const ghes = (entrada.ghes || []).filter((g) => g && (!g.client_id || g.client_id === clienteId));
  const idsDeGhe = new Set(ghes.map((g) => g.id));
  const riscos = (entrada.riscos || []).filter(
    (r) => ativo(r) && (idsDeGhe.has(r?.ghe_id) || r?.client_id === clienteId)
  );
  const colaboradores = (entrada.colaboradores || []).filter((c) => c?.client_id === clienteId);
  const ativos = colaboradores.filter((c) => c.status !== 'DISMISSED');
  const protocolos = protocolosDoPcmso(entrada.protocolos, ghes, clienteId);

  const grupos: GrupoDoPcmso[] = ghes.map((g) => {
    const doGrupo = riscosDoGhe(riscos, g.id);
    return {
      ghe: g,
      nome: [g?.code, g?.name].filter(Boolean).join(' — ') || 'GHE sem nome',
      empregados: ativos.filter((c) => c.ghe_id === g.id).length,
      riscos: doGrupo,
      identificados: riscosIdentificados(doGrupo),
      periodicidade: periodicidadeMaximaDoClinico(doGrupo),
      protocolos: protocolosDoGhe(protocolos, g.id),
      anexos: anexosAcionados(doGrupo)
    };
  });

  const base = { cliente: entrada.cliente, ghes, riscos, protocolos: entrada.protocolos };
  const atividades = atividadesCriticasDoCliente(entrada.treinamentos || [], clienteId, ghes, entrada.cargos || [], riscos);
  const dispensa = dispensaDoPcmso(entrada.cliente, { grupos });
  const setoriais = exigenciasSetoriais(entrada.cliente?.main_cnae, riscos);
  const dasSetoriais: FaltaNoPcmso[] = setoriais.flatMap((e) => e.aRedigir.map((x) => ({
    secao: '5.8', curto: `${e.nr}: conteúdo a redigir`,
    longo: `conteúdo que a ${e.nr} manda constar do PCMSO e que este documento não redige: ${x}. O médico responsável o redige e anexa a este programa`
  })));

  const dosResponsaveis: FaltaNoPcmso[] = [];
  if (!entrada.pendenciaDoCoordenador && entrada.coordenadorSemRqe) {
    dosResponsaveis.push({
      secao: '1.2', curto: 'RQE do médico responsável',
      longo: `RQE de Medicina do Trabalho do médico responsável: a Resolução CFM nº 2.376/2024, art. 2º, dispõe que o PCMSO "${trecho('cfm-2376-art2', 'terá um médico do trabalho', 'como seu responsável')}"; se não houver médico do trabalho na localidade, registre a situação do subitem 7.5.2`
    });
  }
  if (entrada.semResponsavelPeloPgr) {
    dosResponsaveis.push({
      secao: '4.1', curto: 'responsável pelo PGR',
      longo: 'responsável pelo PGR deste cliente: o PCMSO é elaborado a partir do inventário de riscos do PGR (subitem 7.5.1) e precisa dizer de qual PGR'
    });
  }

  return {
    grupos,
    protocolos,
    modelosNaoAdotados: protocolosModelo(entrada.protocolos).length,
    empregadosAtivos: ativos.length,
    atividades,
    dispensa,
    setoriais,
    faltas: [
      ...faltasDoCadastro({ ...base, colaboradores, pendenciaDoCoordenador: entrada.pendenciaDoCoordenador, dispensaPossivel: dispensa.possivel }),
      ...dosResponsaveis,
      ...faltasDosAnexos({ ...base, colaboradores, cargos: entrada.cargos || [] }),
      ...faltasDasAtividadesCriticas(atividades, entrada.protocolos, ghes, clienteId),
      ...dasSetoriais,
      ...(entrada.faltasExtras || [])
    ]
  };
}

// ===========================================================================
// RELATORIO ANALITICO (subitem 7.6.2)
// ===========================================================================

/**
 * Subitem 7.6.6: graus de risco 1 e 2 com ate 25 empregados, e graus 3 e 4
 * com ate 10, podem fazer o relatorio analitico so com as alineas "a" e "b".
 * Sem grau de risco, nao se presume a simplificacao: devolve false.
 */
export function relatorioPodeSerSimplificado(grauDeRisco: any, empregados: number): boolean {
  const g = Number(grauDeRisco);
  if (g === 1 || g === 2) return empregados <= 25;
  if (g === 3 || g === 4) return empregados <= 10;
  return false;
}

export interface PeriodoDoRelatorio {
  inicio: string;
  fim: string;
}

const dentro = (data: any, p: PeriodoDoRelatorio) => {
  const d = String(data || '').slice(0, 10);
  return Boolean(d) && d >= p.inicio && d <= p.fim;
};

export interface LinhaAgrupada {
  chave: string;
  quantidade: number;
}

export interface RelatorioAnalitico {
  periodo: PeriodoDoRelatorio;
  /**
   * a) numero de exames clinicos (um ASO = um exame clinico). Sem a divisao
   * por ocasiao: "demissional: 1" aponta quem saiu.
   */
  examesClinicos: number;
  /** b) numero e tipos de exames complementares. */
  complementares: Array<{ codigo: string; nome: string; quantidade: number }>;
  /** c) resultados anormais (alterado, estavel ou agravamento) por tipo de exame e por setor/funcao. */
  anormais: Array<{ exame: string; onde: string; anormais: number; total: number }>;
  /** Linhas omitidas pelo criterio de sigilo (poucos examinados, ou todos anormais). */
  suprimidas: number;
  /** d) casos novos de doenca relacionada ao trabalho (CAT de doenca no periodo), por setor/funcao. */
  doencasNovas: LinhaAgrupada[];
  /** e) CAT emitidas no periodo, por tipo de evento. */
  catsPorTipo: LinhaAgrupada[];
  /** Exames complementares sem codigo valido da Tabela 27: nao entram na contagem por tipo. */
  semCodigoValido: number;
}

/**
 * Criterio de sigilo do relatorio (Codigo de Etica Medica, art. 76). Nas
 * alineas "c" e "d", setor ou funcao com menos de MINIMO_PARA_CATEGORIZAR
 * trabalhadores e somado aos demais pequenos; se a soma ainda ficar abaixo
 * do minimo, a linha e omitida. Na alinea "c" conta quem foi EXAMINADO no
 * periodo, e nao o quadro do setor: "1 anormal em 1 examinado" de um setor de
 * 40 pessoas e o resultado de uma pessoa. A linha em que todos os examinados
 * tiveram resultado anormal tambem e omitida - ela revela o resultado de cada um.
 */
export const MINIMO_PARA_CATEGORIZAR = 3;
export const GRUPOS_PEQUENOS = `Setores/funções com menos de ${MINIMO_PARA_CATEGORIZAR} trabalhadores (somados para preservar o sigilo)`;

const ANORMAL = new Set(['ALTERADO', 'ESTAVEL', 'AGRAVAMENTO']);

const TIPO_DE_CAT: Record<string, string> = {
  TIPICO: 'Acidente típico',
  TRAJETO: 'Acidente de trajeto',
  DOENCA_OCUPACIONAL: 'Doença relacionada ao trabalho'
};

function agrupar(chaves: string[]): LinhaAgrupada[] {
  const mapa = new Map<string, number>();
  chaves.forEach((c) => mapa.set(c, (mapa.get(c) || 0) + 1));
  return [...mapa.entries()]
    .map(([chave, quantidade]) => ({ chave, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.chave.localeCompare(b.chave));
}

/**
 * Os numeros do relatorio analitico que o sistema tem como apurar.
 *
 * So numeros agregados: nenhum nome, CPF ou diagnostico de pessoa sai daqui.
 * A analise comparativa e a discussao (alinea "f") sao do medico responsavel
 * - o sistema nao as escreve.
 *
 * `ondeDe` resolve a unidade, o setor ou a funcao de um colaborador, para a
 * categorizacao que as alineas "c" e "d" pedem.
 */
export function relatorioAnalitico(entrada: {
  colaboradores: any[];
  cats: any[];
  periodo: PeriodoDoRelatorio;
  ondeDe: (colaborador: any) => string;
  nomeDoExame: (codigo: string) => string;
}): RelatorioAnalitico {
  const { colaboradores, cats, periodo, ondeDe, nomeDoExame } = entrada;
  const lista = Array.isArray(colaboradores) ? colaboradores : [];
  const ondeBruto = (c: any) => ondeDe(c) || 'não informado';
  const k = MINIMO_PARA_CATEGORIZAR;
  let suprimidas = 0;

  const asos: Array<{ aso: any; colaborador: any }> = [];
  lista.forEach((c) => {
    (Array.isArray(c?.aso_history) ? c.aso_history : [])
      .filter((a: any) => dentro(a?.exam_date, periodo))
      .forEach((aso: any) => asos.push({ aso, colaborador: c }));
  });

  // c) Por exame e local: quem foi examinado (pessoas distintas), quantos
  // exames e quantos anormais.
  let semCodigoValido = 0;
  const complementares = new Map<string, number>();
  type Celula = { pessoas: Set<string>; total: number; anormais: number };
  const porExame = new Map<string, Map<string, Celula>>();

  asos.forEach(({ aso, colaborador }) => {
    (Array.isArray(aso?.exams) ? aso.exams : []).forEach((e: any) => {
      const codigo = normalizarCodigoTabela27(e?.exam_code_table_27);
      if (codigo === CODIGO_AVALIACAO_CLINICA) return;
      if (!codigoExisteNaTabela27(codigo)) {
        semCodigoValido++;
        return;
      }
      complementares.set(codigo, (complementares.get(codigo) || 0) + 1);
      const locais = porExame.get(codigo) || new Map<string, Celula>();
      const onde = ondeBruto(colaborador);
      const celula = locais.get(onde) || { pessoas: new Set<string>(), total: 0, anormais: 0 };
      celula.pessoas.add(String(colaborador?.id || ''));
      celula.total++;
      if (ANORMAL.has(String(e?.result || ''))) celula.anormais++;
      locais.set(onde, celula);
      porExame.set(codigo, locais);
    });
  });

  const anormais: RelatorioAnalitico['anormais'] = [];
  porExame.forEach((locais, codigo) => {
    const pequenos: Celula = { pessoas: new Set<string>(), total: 0, anormais: 0 };
    const linhas: Array<{ onde: string; celula: Celula }> = [];
    locais.forEach((celula, onde) => {
      if (celula.pessoas.size >= k) {
        linhas.push({ onde, celula });
      } else {
        celula.pessoas.forEach((p) => pequenos.pessoas.add(p));
        pequenos.total += celula.total;
        pequenos.anormais += celula.anormais;
      }
    });
    if (pequenos.total > 0) linhas.push({ onde: GRUPOS_PEQUENOS, celula: pequenos });
    linhas.forEach(({ onde, celula }) => {
      if (celula.anormais === 0) return;
      // Com no maximo um resultado normal, quem foi examinado sabe o dos outros.
      if (celula.pessoas.size < k || celula.anormais >= celula.total - 1) {
        suprimidas++;
        return;
      }
      anormais.push({ exame: nomeDoExame(codigo), onde, anormais: celula.anormais, total: celula.total });
    });
  });
  anormais.sort((a, b) => b.anormais - a.anormais || a.exame.localeCompare(b.exame));

  // d) Casos novos por local: o tamanho do local e o quadro do setor/funcao.
  const populacao = new Map<string, number>();
  lista.forEach((c) => populacao.set(ondeBruto(c), (populacao.get(ondeBruto(c)) || 0) + 1));
  const pequenosNaPopulacao = [...populacao.values()].filter((n) => n < k).reduce((t, n) => t + n, 0);
  const categoria = (c: any) => ((populacao.get(ondeBruto(c)) || 0) >= k ? ondeBruto(c) : GRUPOS_PEQUENOS);

  const idsDoCliente = new Set(lista.map((c: any) => c?.id));
  const catsDoPeriodo = (Array.isArray(cats) ? cats : [])
    .filter((c) => idsDoCliente.has(c?.employee_id) && dentro(c?.accident_date, periodo));
  const porId = new Map(lista.map((c: any) => [c?.id, c]));
  const doencasNovas = agrupar(catsDoPeriodo
    .filter((c) => c?.accident_type === 'DOENCA_OCUPACIONAL')
    .map((c) => categoria(porId.get(c?.employee_id))))
    .filter((l) => {
      if (l.chave === GRUPOS_PEQUENOS && pequenosNaPopulacao < k) {
        suprimidas++;
        return false;
      }
      return true;
    });

  return {
    periodo,
    examesClinicos: asos.length,
    complementares: [...complementares.entries()]
      .map(([codigo, quantidade]) => ({ codigo, nome: nomeDoExame(codigo), quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.codigo.localeCompare(b.codigo)),
    anormais,
    suprimidas,
    doencasNovas,
    catsPorTipo: agrupar(catsDoPeriodo.map((c) => TIPO_DE_CAT[c?.accident_type] || 'Tipo não informado')),
    semCodigoValido
  };
}
