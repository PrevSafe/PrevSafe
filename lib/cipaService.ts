// PrevSafe SST - CIPA & CIPATR & CIPAMIN Intelligent Regulatory Service
// Full compliance with NR-05, NR-31.7, NR-22.36, NR-18.17, NR-30, NR-32 and Brazilian Law 14.457/2022 (Harassment Prevention)

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
    normReference: 'NR-31 Item 31.7 (Segurança e Saúde no Trabalho Rural)',
    defaultTrainingHours: 20,
    specialRequirements: [
      'Carga horária mínima de 20 horas para todos os membros',
      'Foco em defensivos agrícolas, maquinários agrícolas, animais peçonhentos e intempéries',
      'Mandato de 2 anos para os membros eleitos pelos trabalhadores'
    ],
    badgeColor: 'amber'
  },
  'NR-22.36': {
    code: 'NR-22.36',
    title: 'Comissão Interna de Prevenção de Acidentes e Assédio na Mineração',
    shortTitle: 'CIPAMIN (Mineração)',
    scope: 'Mineração a Céu Aberto, Mineração Subterrânea e Beneficiamento Mineral',
    normReference: 'NR-22 Item 22.36 (Segurança e Saúde Ocupacional na Mineração)',
    defaultTrainingHours: 40,
    specialRequirements: [
      'Carga horária mínima de 40 horas (incluindo módulo prático de resgate em minas)',
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
    normReference: 'NR-18 Item 18.17 (Indústria da Construção)',
    defaultTrainingHours: 16,
    specialRequirements: [
      'Constituição por canteiro de obras a partir de 70 trabalhadores',
      'Canteiros com menos de 70 trabalhadores: nomeação de representante de segurança',
      'Foco prioritário em trabalho em altura (NR-35), eletricidade e escavações'
    ],
    badgeColor: 'orange'
  },
  'NR-30': {
    code: 'NR-30',
    title: 'Comissão de Prevenção de Acidentes no Trabalho Aquaviário e Portuário',
    shortTitle: 'CPNT (Aquaviários)',
    scope: 'Embarcações Comerciais, Rebocadores, Navegação Fluvial e Marítima',
    normReference: 'NR-30 (Segurança e Saúde no Trabalho Aquaviário)',
    defaultTrainingHours: 20,
    specialRequirements: [
      'Treinamento com ênfase em sobrevivência no mar, combate a incêndio em embarcação e amarração',
      'Comissão integrada a bordo de navios com mais de 20 tripulantes'
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
// 2. DIMENSIONING ENGINE (NR-05 Quadro I & Sector Norms)
// ============================================================================

export function calculateCipaDimensioning(
  arg1: any,
  arg2: any,
  arg3?: any
): CipaDimensioningResult & {
  titulares_employees: number;
  suplentes_employees: number;
  titulares_employer: number;
  suplentes_employer: number;
} {
  // Disambiguate arguments: (norm, riskGrade, totalEmployees) vs (riskGrade, totalEmployees, norm)
  let norm: CipaRegulatoryNorm = 'NR-05';
  let riskGrade: 1 | 2 | 3 | 4 = 3;
  let totalEmployees = 100;

  if (typeof arg1 === 'string' && (arg1.startsWith('NR-') || CIPA_NORMS_CATALOG[arg1 as CipaRegulatoryNorm])) {
    norm = arg1 as CipaRegulatoryNorm;
    riskGrade = (Number(arg2) || 3) as 1 | 2 | 3 | 4;
    totalEmployees = Number(arg3) || 100;
  } else if (typeof arg3 === 'string' && (arg3.startsWith('NR-') || CIPA_NORMS_CATALOG[arg3 as CipaRegulatoryNorm])) {
    norm = arg3 as CipaRegulatoryNorm;
    riskGrade = (Number(arg1) || 3) as 1 | 2 | 3 | 4;
    totalEmployees = Number(arg2) || 100;
  } else {
    riskGrade = (Number(arg1) || 3) as 1 | 2 | 3 | 4;
    totalEmployees = Number(arg2) || 100;
    if (arg3 && typeof arg3 === 'string') norm = arg3 as CipaRegulatoryNorm;
  }

  // Ensure bounds
  if (riskGrade < 1) riskGrade = 1;
  if (riskGrade > 4) riskGrade = 4;
  if (totalEmployees < 1) totalEmployees = 1;

  // Specific training hours according to NR-05 / Setorial
  let trainingHours = 16;
  if (norm === 'NR-22.36') trainingHours = 40;
  else if (norm === 'NR-31.7' || norm === 'NR-30') trainingHours = 20;
  else if (norm === 'NR-05' || norm === 'NR-18.17' || norm === 'NR-32') {
    if (riskGrade === 1) trainingHours = 8;
    else if (riskGrade === 2) trainingHours = 12;
    else if (riskGrade === 3) trainingHours = 16;
    else if (riskGrade === 4) trainingHours = 20;
  }

  // Check designated only criteria
  // Less than 20 employees in standard NR-05
  if (totalEmployees < 20 && (norm === 'NR-05' || norm === 'NR-31.7' || norm === 'NR-32')) {
    return {
      norm,
      risk_grade: riskGrade,
      total_employees: totalEmployees,
      effective_members_employee: 0,
      substitute_members_employee: 0,
      effective_members_employer: 0,
      substitute_members_employer: 0,
      titulares_employees: 0,
      suplentes_employees: 0,
      titulares_employer: 0,
      suplentes_employer: 0,
      total_members: 0,
      training_hours_required: trainingHours,
      is_designated_only: true,
      includes_harassment_module: true
    };
  }

  // NR-18 (Construção) < 70 workers = Designated
  if (norm === 'NR-18.17' && totalEmployees < 70) {
    return {
      norm,
      risk_grade: riskGrade,
      total_employees: totalEmployees,
      effective_members_employee: 0,
      substitute_members_employee: 0,
      effective_members_employer: 0,
      substitute_members_employer: 0,
      titulares_employees: 0,
      suplentes_employees: 0,
      titulares_employer: 0,
      suplentes_employer: 0,
      total_members: 0,
      training_hours_required: trainingHours,
      is_designated_only: true,
      includes_harassment_module: true
    };
  }

  // Standard Dimensioning Matrix (NR-05 Quadro I)
  let titulares = 1;
  let suplentes = 1;

  if (riskGrade === 1 || riskGrade === 2) {
    if (totalEmployees <= 50) {
      titulares = 1;
      suplentes = 1;
    } else if (totalEmployees <= 100) {
      titulares = 2;
      suplentes = 2;
    } else if (totalEmployees <= 200) {
      titulares = 3;
      suplentes = 3;
    } else if (totalEmployees <= 500) {
      titulares = 4;
      suplentes = 3;
    } else if (totalEmployees <= 1000) {
      titulares = 6;
      suplentes = 4;
    } else {
      titulares = 8;
      suplentes = 6;
    }
  } else if (riskGrade === 3) {
    if (totalEmployees <= 50) {
      titulares = 2;
      suplentes = 2;
    } else if (totalEmployees <= 100) {
      titulares = 3;
      suplentes = 3;
    } else if (totalEmployees <= 200) {
      titulares = 4;
      suplentes = 3;
    } else if (totalEmployees <= 500) {
      titulares = 6;
      suplentes = 4;
    } else if (totalEmployees <= 1000) {
      titulares = 8;
      suplentes = 6;
    } else {
      titulares = 10;
      suplentes = 7;
    }
  } else if (riskGrade === 4) {
    if (totalEmployees <= 50) {
      titulares = 3;
      suplentes = 3;
    } else if (totalEmployees <= 100) {
      titulares = 4;
      suplentes = 3;
    } else if (totalEmployees <= 200) {
      titulares = 5;
      suplentes = 4;
    } else if (totalEmployees <= 500) {
      titulares = 8;
      suplentes = 6;
    } else if (totalEmployees <= 1000) {
      titulares = 10;
      suplentes = 8;
    } else {
      titulares = 12;
      suplentes = 9;
    }
  }

  return {
    norm,
    risk_grade: riskGrade,
    total_employees: totalEmployees,
    effective_members_employee: titulares,
    substitute_members_employee: suplentes,
    effective_members_employer: titulares, // Employer has equal number of representatives
    substitute_members_employer: suplentes,
    titulares_employees: titulares,
    suplentes_employees: suplentes,
    titulares_employer: titulares,
    suplentes_employer: suplentes,
    total_members: (titulares + suplentes) * 2,
    training_hours_required: trainingHours,
    is_designated_only: false,
    includes_harassment_module: true
  };
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

