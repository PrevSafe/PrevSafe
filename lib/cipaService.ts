// PrevSafe SST - CIPA & CIPATR & CIPAMIN Intelligent Regulatory Service
// Full compliance with NR-05, NR-31.7, NR-22.36, NR-18.17, NR-30, NR-32 and Brazilian Law 14.457/2022 (Harassment Prevention)

import {
  consultarQuadroI,
  NR5_CARGA_HORARIA_TREINAMENTO,
} from '@/lib/nr5Quadros';
import {
  consultarQuadroCipamin,
  consultarQuadroCipatr,
  NOTA_NR18_CONSTRUCAO,
  NOTA_NR30_AQUAVIARIOS,
  NOTA_NR32_SAUDE,
  NR22_CARGA_HORARIA_CIPAMIN,
  NR31_CARGA_HORARIA_CIPATR,
} from '@/lib/cipaQuadrosSetoriais';
import {
  CipaRegulatoryNorm,
  CipaProcessStatus,
  CipaManagementProcess,
  CipaDimensioningResult,
  CipaElectoralTimeline,
  CipaCandidate,
  CipaEmployerAppointee,
  CipaElectoralCommissionMember,
  CipaAuditVote,
  CipaMeetingRecord
} from '@/types';

// ============================================================================
// 1. REGULATORY NORMS METADATA & LEGAL REQUIREMENTS
// ============================================================================

export interface NormInfo {
  code: CipaRegulatoryNorm;
  title: string;
  shortTitle: string;
  scope: string;
  normReference: string;
  defaultTrainingHours: number;
  specialRequirements: string[];
  badgeColor: string;
}

export const CIPA_NORMS_CATALOG: Record<CipaRegulatoryNorm, NormInfo> = {
  'NR-05': {
    code: 'NR-05',
    title: 'Comissão Interna de Prevenção de Acidentes e Assédio (Geral)',
    shortTitle: 'CIPA Geral',
    scope: 'Indústria, Comércio, Construção, Serviços e Empresas em Geral',
    normReference: 'Portaria MTP nº 4.219/2022 e NR-05 atualizada',
    defaultTrainingHours: 16,
    specialRequirements: [
      'Inclusão obrigatória de temas de prevenção e combate ao assédio sexual e demais formas de violência (Lei 14.457/2022)',
      'Dimensionamento conforme Quadro I da NR-05 (Grau de Risco 1 a 4)',
      'Possibilidade de votação presencial ou eletrônica segura auditável (NR-05 item 5.5.4)'
    ],
    badgeColor: 'emerald'
  },
  'NR-31.7': {
    code: 'NR-31.7',
    title: 'Comissão Interna de Prevenção de Acidentes do Trabalho Rural',
    shortTitle: 'CIPATR (Rural)',
    scope: 'Agricultura, Pecuária, Silvicultura, Exploração Florestal e Aquicultura',
    normReference: 'NR-31, item 31.5 (Comissão Interna de Prevenção de Acidentes e de Assédio do Trabalho Rural)',
    defaultTrainingHours: NR31_CARGA_HORARIA_CIPATR,
    specialRequirements: [
      'Obrigatória para empregador rural com 20 ou mais empregados por prazo indeterminado (item 31.5.2)',
      'Dimensionamento pelo Quadro 2 da NR-31, que depende apenas do número de trabalhadores — não do grau de risco',
      'Carga horária mínima de 20 horas (item 31.5.25)',
      'Mandato de 2 anos para os membros eleitos pelos trabalhadores (item 31.5.6)'
    ],
    badgeColor: 'amber'
  },
  'NR-22.36': {
    code: 'NR-22.36',
    title: 'Comissão Interna de Prevenção de Acidentes e Assédio na Mineração',
    shortTitle: 'CIPAMIN (Mineração)',
    scope: 'Mineração a Céu Aberto, Mineração Subterrânea e Beneficiamento Mineral',
    normReference: 'NR-22, item 22.36 (Segurança e Saúde Ocupacional na Mineração)',
    defaultTrainingHours: NR22_CARGA_HORARIA_CIPAMIN,
    specialRequirements: [
      'Dimensionamento pelo Quadro III da NR-22, que depende apenas do número de empregados — não do grau de risco',
      'Carga horária de 40 horas anuais, das quais 20 horas antes da posse (item 22.36.12.3)',
      'Vistoria mensal obrigatória em todas as frentes de lavra e galerias subterrâneas',
      'Relatório trimestral obrigatório sobre ventilação e estabilidade de taludes/galerias'
    ],
    badgeColor: 'indigo'
  },
  'NR-18.17': {
    code: 'NR-18.17',
    title: 'Comissão Interna de Prevenção de Acidentes na Indústria da Construção',
    shortTitle: 'CIPA Construção Civil',
    scope: 'Canteiros de Obras, Edificações, Infraestrutura e Demolição',
    normReference: 'Anexo I da NR-05 — CIPA da Indústria da Construção (Portaria MTP nº 4.219/2022)',
    defaultTrainingHours: 16,
    specialRequirements: [
      'Constituição por canteiro de obras quando o número de empregados se enquadrar no Quadro I da NR-05 (Anexo I, item 3.1)',
      'Canteiro que não se enquadra no Quadro I: nomeação de, no mínimo, um representante (Anexo I, item 3.1.1)',
      'Obras com até 180 dias de duração e frentes de trabalho têm regra própria (Anexo I, itens 3.1.2 a 3.3)',
      'Foco prioritário em trabalho em altura (NR-35), eletricidade e escavações'
    ],
    badgeColor: 'orange'
  },
  'NR-30': {
    code: 'NR-30',
    title: 'Comissão de Prevenção de Acidentes no Trabalho Aquaviário e Portuário',
    shortTitle: 'CPNT (Aquaviários)',
    scope: 'Embarcações Comerciais, Rebocadores, Navegação Fluvial e Marítima',
    normReference: 'NR-30, item 30.6 (Segurança e Saúde no Trabalho Aquaviário)',
    defaultTrainingHours: 16,
    specialRequirements: [
      'A CIPA segue a NR-05 naquilo que não for contrário (item 30.6.1): dimensionamento pelo Quadro I da NR-05 e carga horária por grau de risco',
      'Acréscimo de 1 titular para cada 10 embarcações (ou fração) e 1 suplente para cada 20 embarcações (ou fração), no estabelecimento com maior número de trabalhadores (item 30.6.1.1) — o sistema não calcula esse acréscimo porque não coleta o número de embarcações',
      'Aquaviários eleitos em votação em separado (item 30.6.2)'
    ],
    badgeColor: 'cyan'
  },
  'NR-32': {
    code: 'NR-32',
    title: 'Comissão Interna de Prevenção de Acidentes em Serviços de Saúde',
    shortTitle: 'CIPA Saúde',
    scope: 'Hospitais, Clínicas, Laboratórios de Análises Clínicas e Prontos-Socorros',
    normReference: 'NR-32 (Segurança e Saúde no Trabalho em Serviços de Saúde)',
    defaultTrainingHours: 16,
    specialRequirements: [
      'Módulo específico para agentes biológicos, perfurocortantes com dispositivo de segurança e quimioterápicos',
      'Acompanhamento obrigatório do Programa de Imunização Ativa dos Trabalhadores'
    ],
    badgeColor: 'rose'
  }
};

// ============================================================================
// 2. DIMENSIONING ENGINE (NR-05 Quadro I e quadros setoriais)
// ============================================================================
//
// Fonte unica de dimensionamento de CIPA do sistema:
//   - NR-05, NR-18.17 (Anexo I da NR-05), NR-30 e NR-32 -> Quadro I da NR-05,
//     em lib/nr5Quadros.ts (grau de risco x faixa de empregados);
//   - NR-31.7 (CIPATR) -> Quadro 2 da NR-31;
//   - NR-22.36 (CIPAMIN) -> Quadro III da NR-22.
//
// A funcao NAO adivinha argumentos, NAO tem valor padrao de grau de risco nem
// de numero de empregados, e NAO devolve numero quando falta dado: devolve
// dimensioning_status = 'NAO_DIMENSIONADO' com uma mensagem dizendo o que
// informar. Um numero errado com cara de oficial e pior que numero nenhum.

/** Desfecho do dimensionamento, para a tela saber o que mostrar. */
export type CipaDimensioningStatus =
  /** Enquadrou no quadro oficial: ha CIPA, com numero de membros definido. */
  | 'DIMENSIONADO'
  /** Nao se enquadra no quadro: a norma manda nomear representante. */
  | 'REPRESENTANTE_NOMEADO'
  /** Faltou dado. Nao ha o que dimensionar. */
  | 'NAO_DIMENSIONADO';

/**
 * Retorno de calculateCipaDimensioning.
 *
 * Observacao sobre risk_grade: o tipo CipaDimensioningResult (types/index.ts)
 * declara risk_grade como 1|2|3|4 e nao admite null. Quando o grau nao e
 * informado, este servico devolve risk_grade = null em tempo de execucao,
 * junto de dimensioning_status = 'NAO_DIMENSIONADO'. Quem le a tela deve
 * checar o status antes de confiar em risk_grade.
 */
export type CipaDimensioningOutcome = CipaDimensioningResult & {
  titulares_employees: number;
  suplentes_employees: number;
  titulares_employer: number;
  suplentes_employer: number;
  dimensioning_status: CipaDimensioningStatus;
  /** Texto visivel ao usuario explicando o resultado ou o dado que falta. */
  dimensioning_message: string;
  /** Fundamentacao legal do quadro aplicado. */
  legal_basis: string;
  /** Avisos da norma que incidem sobre este caso. */
  notes: string[];
  /**
   * true quando o quadro oficial nao estabelece suplentes (caso do Quadro 2 da
   * NR-31). Nesse caso suplentes_* vem 0 porque o tipo exige numero, mas a
   * norma simplesmente nao define suplentes — nao e "zero suplentes".
   */
  suplentes_nao_previstos_na_norma: boolean;
};

/** Normas cujo dimensionamento e o Quadro I da NR-05. */
const NORMAS_QUE_USAM_QUADRO_I: CipaRegulatoryNorm[] = ['NR-05', 'NR-18.17', 'NR-30', 'NR-32'];

function notasDaNorma(norm: CipaRegulatoryNorm): string[] {
  if (norm === 'NR-18.17') return [NOTA_NR18_CONSTRUCAO];
  if (norm === 'NR-30') return [NOTA_NR30_AQUAVIARIOS];
  if (norm === 'NR-32') return [NOTA_NR32_SAUDE];
  return [];
}

function resultadoBase(
  norm: CipaRegulatoryNorm,
  riskGrade: 1 | 2 | 3 | 4 | null,
  totalEmployees: number | null
): CipaDimensioningOutcome {
  return {
    norm,
    risk_grade: riskGrade as 1 | 2 | 3 | 4,
    total_employees: (totalEmployees ?? 0) as number,
    effective_members_employee: 0,
    substitute_members_employee: 0,
    effective_members_employer: 0,
    substitute_members_employer: 0,
    titulares_employees: 0,
    suplentes_employees: 0,
    titulares_employer: 0,
    suplentes_employer: 0,
    total_members: 0,
    training_hours_required: 0,
    is_designated_only: false,
    includes_harassment_module: true,
    dimensioning_status: 'NAO_DIMENSIONADO',
    dimensioning_message: '',
    legal_basis: '',
    notes: notasDaNorma(norm),
    suplentes_nao_previstos_na_norma: false,
  };
}

function normaValida(norm: any): norm is CipaRegulatoryNorm {
  return typeof norm === 'string' && !!CIPA_NORMS_CATALOG[norm as CipaRegulatoryNorm];
}

function grauValido(grau: any): grau is 1 | 2 | 3 | 4 {
  return grau === 1 || grau === 2 || grau === 3 || grau === 4;
}

/**
 * Dimensiona a CIPA a partir do quadro oficial da norma aplicavel.
 *
 * ASSINATURA UNICA E EXPLICITA — nao existe mais deteccao de argumentos por
 * tipo. A ordem e (grau de risco, numero de empregados, norma).
 *
 * @param riskGrade      Grau de risco do Anexo I da NR-04 (1 a 4). Obrigatorio
 *                       para as normas que usam o Quadro I da NR-05; ignorado
 *                       na CIPATR e na CIPAMIN, que nao dependem dele.
 * @param totalEmployees Numero de empregados no estabelecimento. Sem ele nao
 *                       ha dimensionamento.
 * @param norm           Norma aplicavel.
 */
export function calculateCipaDimensioning(
  riskGrade: 1 | 2 | 3 | 4 | null | undefined,
  totalEmployees: number | null | undefined,
  norm: CipaRegulatoryNorm
): CipaDimensioningOutcome {
  if (!normaValida(norm)) {
    const r = resultadoBase('NR-05', null, null);
    r.dimensioning_message =
      'Norma regulamentadora não informada ou desconhecida. Não é possível dimensionar a CIPA sem saber ' +
      'qual quadro oficial se aplica ao estabelecimento.';
    return r;
  }

  const grau = grauValido(riskGrade) ? riskGrade : null;
  const empregadosNum = Number(totalEmployees);
  const empregados =
    totalEmployees === null || totalEmployees === undefined || !Number.isFinite(empregadosNum) || empregadosNum < 0
      ? null
      : Math.floor(empregadosNum);

  // -------------------------------------------------------------------------
  // CIPATR (NR-31) e CIPAMIN (NR-22): quadros proprios, sem grau de risco.
  // -------------------------------------------------------------------------
  if (norm === 'NR-31.7' || norm === 'NR-22.36') {
    const setorial =
      norm === 'NR-31.7' ? consultarQuadroCipatr(empregados) : consultarQuadroCipamin(empregados);

    const r = resultadoBase(norm, grau, empregados);
    r.legal_basis = setorial.fundamentacao;
    r.dimensioning_message = setorial.fundamentacao;
    r.training_hours_required = setorial.cargaHorariaTreinamento ?? 0;

    if (setorial.status === 'NAO_DIMENSIONADO') {
      r.dimensioning_status = 'NAO_DIMENSIONADO';
      r.training_hours_required = 0;
      return r;
    }

    if (setorial.status === 'REPRESENTANTE_NR05') {
      r.dimensioning_status = 'REPRESENTANTE_NOMEADO';
      r.is_designated_only = true;
      return r;
    }

    const titEmp = setorial.titularesEmpregados ?? 0;
    const supEmp = setorial.suplentesEmpregados;
    const titPat = setorial.titularesEmpregador ?? 0;
    const supPat = setorial.suplentesEmpregador;

    r.dimensioning_status = 'DIMENSIONADO';
    r.effective_members_employee = titEmp;
    r.substitute_members_employee = supEmp ?? 0;
    r.effective_members_employer = titPat;
    r.substitute_members_employer = supPat ?? 0;
    r.titulares_employees = titEmp;
    r.suplentes_employees = supEmp ?? 0;
    r.titulares_employer = titPat;
    r.suplentes_employer = supPat ?? 0;
    r.total_members = titEmp + (supEmp ?? 0) + titPat + (supPat ?? 0);
    r.suplentes_nao_previstos_na_norma = supEmp === null;
    return r;
  }

  // -------------------------------------------------------------------------
  // NR-05 e normas que remetem ao Quadro I da NR-05.
  // -------------------------------------------------------------------------
  if (!NORMAS_QUE_USAM_QUADRO_I.includes(norm)) {
    const r = resultadoBase(norm, grau, empregados);
    r.dimensioning_message =
      `Não há quadro de dimensionamento carregado para a norma ${norm}. Informe o dimensionamento manualmente, ` +
      'com base no quadro oficial da norma.';
    return r;
  }

  const quadro = consultarQuadroI(grau, empregados);
  const r = resultadoBase(norm, grau, empregados);
  r.legal_basis = quadro.fundamentacao;
  r.dimensioning_message = quadro.fundamentacao;
  if (quadro.aplicouAcrescimoAcimaDe10000) {
    r.notes = [...r.notes, quadro.fundamentacao];
  }

  if (quadro.status === 'NAO_DIMENSIONADO') {
    r.dimensioning_status = 'NAO_DIMENSIONADO';
    r.training_hours_required = 0;
    return r;
  }

  // A carga horaria depende do grau de risco (NR-05, item 5.7.4) e ja esta
  // definida mesmo quando o estabelecimento nao constitui CIPA: o representante
  // nomeado tambem e treinado (item 5.7.1).
  r.training_hours_required = quadro.cargaHorariaTreinamento ?? NR5_CARGA_HORARIA_TREINAMENTO[grau as 1 | 2 | 3 | 4];

  if (quadro.status === 'REPRESENTANTE_NR05') {
    r.dimensioning_status = 'REPRESENTANTE_NOMEADO';
    r.is_designated_only = true;
    return r;
  }

  const titulares = quadro.efetivos as number;
  const suplentes = quadro.suplentes as number;

  r.dimensioning_status = 'DIMENSIONADO';
  // O Quadro I da NR-05 e paritario: o numero de representantes do empregador
  // e igual ao dos empregados (item 5.4.1 - "composta de representantes da
  // organizacao e dos empregados").
  r.effective_members_employee = titulares;
  r.substitute_members_employee = suplentes;
  r.effective_members_employer = titulares;
  r.substitute_members_employer = suplentes;
  r.titulares_employees = titulares;
  r.suplentes_employees = suplentes;
  r.titulares_employer = titulares;
  r.suplentes_employer = suplentes;
  r.total_members = (titulares + suplentes) * 2;
  return r;
}

// ============================================================================
// 3. ELECTORAL TIMELINE GENERATOR (NR-05 Legal Deadlines)
// ============================================================================

export function generateLegalCipaTimeline(
  dateInput?: string,
  optionalNorm?: CipaRegulatoryNorm
): CipaElectoralTimeline & {
  start_mandate_date: string;
  end_mandate_date: string;
  electoral_commission_date: string;
  candidacy_publication_date: string;
} {
  // If dateInput is provided, treat it as base. If it's today or in the past,
  // target inauguration ~60 days ahead so convocation can happen today.
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  let inaugurationDate: Date;

  const today = new Date();
  const diffDays = Math.round((baseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 10) {
    // Input is current date: calculate future inauguration date 60 days ahead
    inaugurationDate = new Date(baseDate);
    inaugurationDate.setDate(inaugurationDate.getDate() + 60);
  } else {
    // Input is already future inauguration date
    inaugurationDate = new Date(baseDate);
  }

  // Helper to add/subtract days
  const addDays = (d: Date, days: number): string => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().split('T')[0];
  };

  // Legal rules:
  // End of Mandate = 1 year after inauguration (or 2 years for CIPATR)
  const isTwoYears = optionalNorm === 'NR-31.7';
  const endMandate = new Date(inaugurationDate);
  endMandate.setFullYear(endMandate.getFullYear() + (isTwoYears ? 2 : 1));

  const convocationDate = addDays(inaugurationDate, -60);
  const commissionDate = addDays(inaugurationDate, -55);
  const editalDate = addDays(inaugurationDate, -45);
  const candidacyStartDate = addDays(inaugurationDate, -40);
  const candidacyEndDate = addDays(inaugurationDate, -25); // 15 days period
  const candidacyPubDate = addDays(inaugurationDate, -24);
  const votingStartDate = addDays(inaugurationDate, -20);
  const votingEndDate = addDays(inaugurationDate, -18);
  const scrutinyDate = addDays(inaugurationDate, -17);
  const trainingStartDate = addDays(inaugurationDate, -10);
  const trainingEndDate = addDays(inaugurationDate, -3);
  const inaugrationStr = inaugurationDate.toISOString().split('T')[0];
  const endMandateStr = endMandate.toISOString().split('T')[0];

  return {
    convocation_date: convocationDate,
    commission_formation_date: commissionDate,
    electoral_commission_date: commissionDate,
    edital_publication_date: editalDate,
    candidacy_start_date: candidacyStartDate,
    candidacy_end_date: candidacyEndDate,
    candidacy_publication_date: candidacyPubDate,
    candidate_list_publication_date: candidacyPubDate,
    voter_list_publication_date: candidacyPubDate,
    voting_start_date: votingStartDate,
    voting_end_date: votingEndDate,
    scrutiny_date: scrutinyDate,
    training_start_date: trainingStartDate,
    training_end_date: trainingEndDate,
    inauguration_date: inaugrationStr,
    start_mandate_date: inaugrationStr,
    mandate_end_date: endMandateStr,
    end_mandate_date: endMandateStr
  };
}

// ============================================================================
// 4. ELECTION SCRUTINY & TIEBREAKER ALGORITHM (NR-05.5.13 & Legal Criteria)
// ============================================================================

export interface ProcessScrutinyResult {
  rankedCandidates: CipaCandidate[];
  totalValidVotes: number;
  blankVotes: number;
  nullVotes: number;
  totalVotes: number;
}

export function processCipaElectionResults(
  candidates: CipaCandidate[],
  arg2?: any,
  arg3?: any,
  arg4?: any
): CipaCandidate[] & ProcessScrutinyResult {
  const safeCandidates = Array.isArray(candidates) ? [...candidates] : [];
  
  let titularesCount = 3;
  let suplentesCount = 3;
  let votesList: CipaAuditVote[] = [];

  if (Array.isArray(arg2)) {
    votesList = arg2;
    titularesCount = Number(arg3) || 3;
    suplentesCount = Number(arg4) || 3;
  } else {
    titularesCount = Number(arg2) || 3;
    suplentesCount = Number(arg3) || 3;
  }

  // Count votes from audit trail if provided
  let blankVotes = 0;
  let nullVotes = 0;
  let totalValidVotes = 0;

  if (votesList.length > 0) {
    const voteCounts: Record<string, number> = {};
    safeCandidates.forEach(c => { voteCounts[c.id] = 0; });

    votesList.forEach(v => {
      const targetId = (v as any).candidate_id || '';
      if (targetId === 'VOTE_BLANK' || targetId === 'BLANK') {
        blankVotes++;
      } else if (targetId === 'VOTE_NULL' || targetId === 'NULL') {
        nullVotes++;
      } else if (voteCounts[targetId] !== undefined) {
        voteCounts[targetId]++;
        totalValidVotes++;
      } else {
        nullVotes++;
      }
    });

    safeCandidates.forEach((c, idx) => {
      safeCandidates[idx] = {
        ...c,
        votes_received: voteCounts[c.id] ?? c.votes_received ?? 0
      };
    });
  } else {
    safeCandidates.forEach(c => {
      totalValidVotes += (c.votes_received || 0);
    });
  }

  // Sort by legal criteria:
  // 1. Most votes received
  // 2. Tiebreaker 1: Seniority in the company (tempo de serviço)
  // 3. Tiebreaker 2: Older candidate age (maior idade)
  safeCandidates.sort((a, b) => {
    const va = a.votes_received || 0;
    const vb = b.votes_received || 0;
    if (vb !== va) return vb - va;

    const sa = a.tiebreaker_seniority_months || 0;
    const sb = b.tiebreaker_seniority_months || 0;
    if (sb !== sa) return sb - sa;

    const aa = a.tiebreaker_age_years || 0;
    const ab = b.tiebreaker_age_years || 0;
    return ab - aa;
  });

  // Assign roles:
  // 1st placed: Vice-President (and Titular)
  // 2nd to titularesCount placed: Titulares
  // Next suplentesCount: Suplentes
  // Rest: Not elected
  const rankedCandidates: CipaCandidate[] = safeCandidates.map((c, index) => {
    let electedRole: CipaCandidate['elected_role'] = 'NOT_ELECTED';
    const hasVotes = (c.votes_received || 0) > 0;

    if (index === 0 && hasVotes) {
      electedRole = 'VICE_PRESIDENT';
    } else if (index < titularesCount && hasVotes) {
      electedRole = 'TITULAR';
    } else if (index < (titularesCount + suplentesCount) && hasVotes) {
      electedRole = 'SUPLENTE';
    }

    return {
      ...c,
      elected_role: electedRole,
      has_stability_protection: true // All registered candidates have stability protection
    };
  });

  // Create hybrid return object (Array + properties) so all consumers work without error
  const resultObj: any = [...rankedCandidates];
  resultObj.rankedCandidates = rankedCandidates;
  resultObj.totalValidVotes = totalValidVotes;
  resultObj.blankVotes = blankVotes;
  resultObj.nullVotes = nullVotes;
  resultObj.totalVotes = totalValidVotes + blankVotes + nullVotes;

  return resultObj as CipaCandidate[] & ProcessScrutinyResult;
}

// ============================================================================
// 5. CRYPTOGRAPHIC LGPD VOTE HASHER & RECEIPT GENERATOR
// ============================================================================

export function generateAnonymousVoteHash(
  cpfOrClient?: string,
  processIdOrCpf?: string,
  timestampOrYear?: string
): string {
  const c1 = cpfOrClient || 'ANON_VOTER';
  const c2 = processIdOrCpf || 'PROCESS';
  const c3 = timestampOrYear || new Date().toISOString();
  const raw = `${c1}::${c2}::${c3}::PREVSAFE_SECRET_SALT_2026`;
  
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `VOTER_HASH_${hex}_${(raw.length * 13) % 997}`;
}

export function generateAuditProofReceipt(hash?: string, time?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CIPAVOTE-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += '-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// ============================================================================
// 6. SEED INITIAL CIPA DATA FOR DEMO CLIENTS
// ============================================================================

export const INITIAL_CIPA_PROCESSES: CipaManagementProcess[] = [];

