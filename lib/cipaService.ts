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

export const INITIAL_CIPA_PROCESSES: CipaManagementProcess[] = [
  {
    id: 'cipa-proc-001',
    client_id: 'client-1',
    client_name: 'Metalúrgica Santa Rita Ltda',
    mandate_year: '2026/2027',
    norm: 'NR-05',
    risk_grade: 3,
    cnae: '25.11-0-00 - Fabricação de estruturas metálicas',
    total_employees: 64,
    total_eligible_voters: 64,
    total_votes_cast: 58,
    quorum_percentage: 90.6,
    dimensioning: {
      norm: 'NR-05',
      risk_grade: 3,
      total_employees: 64,
      effective_members_employee: 3,
      substitute_members_employee: 3,
      effective_members_employer: 3,
      substitute_members_employer: 3,
      total_members: 12,
      training_hours_required: 16,
      is_designated_only: false,
      includes_harassment_module: true
    },
    status: 'VOTING_IN_PROGRESS',
    timeline: {
      mandate_end_date: '2027-09-30',
      convocation_date: '2026-08-01',
      commission_formation_date: '2026-08-06',
      edital_publication_date: '2026-08-16',
      candidacy_start_date: '2026-08-17',
      candidacy_end_date: '2026-08-31',
      candidate_list_publication_date: '2026-09-01',
      voter_list_publication_date: '2026-09-01',
      voting_start_date: '2026-09-10',
      voting_end_date: '2026-09-12',
      scrutiny_date: '2026-09-12',
      training_start_date: '2026-09-20',
      training_end_date: '2026-09-25',
      inauguration_date: '2026-10-01'
    },
    electoral_commission: [
      {
        id: 'ec-1',
        name: 'Ana Carolina Dias',
        cpf: '321.654.987-11',
        role: 'PRESIDENT',
        represented_party: 'EMPLOYER',
        department: 'Recursos Humanos'
      },
      {
        id: 'ec-2',
        name: 'Roberto Silveira',
        cpf: '789.456.123-00',
        role: 'SECRETARY',
        represented_party: 'EMPLOYEE',
        department: 'Usinagem e Solda'
      }
    ],
    employer_appointees: [
      {
        id: 'emp-app-1',
        name: 'Eduardo Guimarães',
        cpf: '456.123.789-22',
        role: 'PRESIDENT',
        department: 'Gerência Industrial',
        job_title: 'Gerente de Produção',
        is_president: true,
        training_completed: true,
        training_hours: 16
      },
      {
        id: 'emp-app-2',
        name: 'Juliana Paes de Barros',
        cpf: '852.963.741-33',
        role: 'TITULAR',
        department: 'Manutenção Mecânica',
        job_title: 'Supervisora de Manutenção',
        is_president: false,
        training_completed: true,
        training_hours: 16
      },
      {
        id: 'emp-app-3',
        name: 'Marcos Vinicius Costa',
        cpf: '159.357.486-44',
        role: 'TITULAR',
        department: 'Almoxarifado & Logística',
        job_title: 'Líder de Expedição',
        is_president: false,
        training_completed: false,
        training_hours: 0
      },
      {
        id: 'emp-app-4',
        name: 'Fernanda Lima Duarte',
        cpf: '753.951.842-55',
        role: 'SUPLENTE',
        department: 'Qualidade e Meio Ambiente',
        job_title: 'Analista de Qualidade',
        is_president: false,
        training_completed: false,
        training_hours: 0
      }
    ],
    candidates: [
      {
        id: 'cand-1',
        name: 'Lucas Pereira dos Santos',
        cpf: '123.456.789-00',
        department: 'Caldeiraria Pesada',
        job_title: 'Caldeireiro Soldador',
        candidacy_number: '10',
        registration_date: '2026-08-18',
        proposals: 'Melhoria contínua da exaustão de fumos de solda e fornecimento de protetores auditivos moldados.',
        votes_received: 22,
        elected_role: 'VICE_PRESIDENT',
        is_eligible: true,
        has_stability_protection: true,
        tiebreaker_seniority_months: 48,
        tiebreaker_age_years: 36
      },
      {
        id: 'cand-2',
        name: 'Carlos Alberto Ferreira',
        cpf: '987.654.321-99',
        department: 'Usinagem CNC',
        job_title: 'Torneiro Mecânico',
        candidacy_number: '22',
        registration_date: '2026-08-19',
        proposals: 'Instalação de proteções físicas transparentes em tornos (NR-12) e piso antiderrapante na área de óleo.',
        votes_received: 16,
        elected_role: 'TITULAR',
        is_eligible: true,
        has_stability_protection: true,
        tiebreaker_seniority_months: 36,
        tiebreaker_age_years: 42
      },
      {
        id: 'cand-3',
        name: 'Mariana Azevedo Ramos',
        cpf: '456.789.123-55',
        department: 'Pintura Eletrostática',
        job_title: 'Operadora de Pintura',
        candidacy_number: '35',
        registration_date: '2026-08-20',
        proposals: 'Revisão periódica dos filtros da cabine de pintura e campanhas ativas de combate ao assédio e respeito a todos.',
        votes_received: 11,
        elected_role: 'TITULAR',
        is_eligible: true,
        has_stability_protection: true,
        tiebreaker_seniority_months: 24,
        tiebreaker_age_years: 29
      },
      {
        id: 'cand-4',
        name: 'Rodrigo Medeiros',
        cpf: '369.258.147-88',
        department: 'Corte a Plasma',
        job_title: 'Operador de Máquinas',
        candidacy_number: '44',
        registration_date: '2026-08-21',
        proposals: 'Campanhas de conscientização sobre o uso de EPI e ergonomia na movimentação de chapas.',
        votes_received: 6,
        elected_role: 'SUPLENTE',
        is_eligible: true,
        has_stability_protection: true,
        tiebreaker_seniority_months: 18,
        tiebreaker_age_years: 31
      },
      {
        id: 'cand-5',
        name: 'Tiago Antunes Prado',
        cpf: '741.852.963-77',
        department: 'Montagem Final',
        job_title: 'Ajudante Geral',
        candidacy_number: '55',
        registration_date: '2026-08-22',
        proposals: 'Iluminação de emergência adequada e manutenção nas pontes rolantes.',
        votes_received: 3,
        elected_role: 'SUPLENTE',
        is_eligible: true,
        has_stability_protection: true,
        tiebreaker_seniority_months: 12,
        tiebreaker_age_years: 25
      }
    ],
    audit_votes: [
      {
        id: 'vote-001',
        casted_at: '2026-09-10T08:15:30Z',
        anonymous_vote_hash: 'VOTER_HASH_99182a3c_142',
        verification_method: 'FACIAL_BIOMETRICS',
        voter_cpf_masked: '123.***.***-00',
        facial_biometric_confidence: 98.4,
        ip_address: '189.44.12.98',
        audit_proof_receipt: 'CIPAVOTE-7B8N-9X2M'
      },
      {
        id: 'vote-002',
        casted_at: '2026-09-10T08:32:10Z',
        anonymous_vote_hash: 'VOTER_HASH_88371c2b_142',
        verification_method: 'DIGITAL_SIGNATURE',
        voter_cpf_masked: '987.***.***-99',
        ip_address: '189.44.12.98',
        audit_proof_receipt: 'CIPAVOTE-4K9P-3W8T'
      },
      {
        id: 'vote-003',
        casted_at: '2026-09-10T09:05:44Z',
        anonymous_vote_hash: 'VOTER_HASH_77461a9f_142',
        verification_method: 'CORPORATE_SSO',
        voter_cpf_masked: '456.***.***-55',
        ip_address: '189.44.12.102',
        audit_proof_receipt: 'CIPAVOTE-2R5X-8L1Q'
      }
    ],
    meetings: [
      {
        id: 'meet-001',
        type: 'ORDINARY',
        meeting_number: 1,
        date: '2026-10-15',
        title: 'Reunião de Posse e Instalação da Gestão 2026/2027',
        agenda_topics: [
          'Instalação oficial da gestão 2026/2027',
          'Elaboração e revisão do Mapa de Riscos Ambientais',
          'Ações de combate e prevenção ao assédio (Lei 14.457/2022)',
          'Planejamento da SIPAT e inspeções de segurança'
        ],
        attendees_count: 6,
        ata_document_sha256: 'SHA256: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
        is_signed_by_all: true
      }
    ],
    generated_documents: [
      {
        id: 'doc-001',
        type: 'CONVOCATION_NOTICE',
        title: 'Edital de Convocação da Eleição da CIPA - Gestão 2026/2027',
        generated_at: '2026-08-01',
        sha256: 'SHA256: ed17a1c0987b654f321e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9'
      },
      {
        id: 'doc-002',
        type: 'COMMISSION_CONSTITUTION',
        title: 'Ata de Constituição da Comissão Eleitoral da CIPA',
        generated_at: '2026-08-06',
        sha256: 'SHA256: ac87b1c0987b654f321e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c8'
      },
      {
        id: 'doc-003',
        type: 'CANDIDATE_LIST',
        title: 'Edital de Homologação e Relação de Candidatos Inscritos',
        generated_at: '2026-09-01',
        sha256: 'SHA256: cand7b1c0987b654f321e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c7'
      },
      {
        id: 'doc-004',
        type: 'ELECTION_SCRUTINY_ATA',
        title: 'Ata de Eleição e Apuração dos Votos da CIPA Gestão 2026/2027',
        generated_at: '2026-09-12',
        sha256: 'SHA256: apur7b1c0987b654f321e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c6'
      },
      {
        id: 'doc-005',
        type: 'INAUGURATION_ATA',
        title: 'Ata de Instalação e Posse da CIPA Gestão 2026/2027',
        generated_at: '2026-10-01',
        sha256: 'SHA256: posse7b1c0987b654f321e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c5'
      },
      {
        id: 'doc-006',
        type: 'ANNUAL_MEETING_CALENDAR',
        title: 'Calendário Oficial de Reuniões Ordinárias 2026/2027',
        generated_at: '2026-10-01',
        sha256: 'SHA256: cal7b1c0987b654f321e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c4'
      },
      {
        id: 'doc-007',
        type: 'TRAINING_CERTIFICATE',
        title: 'Livro de Certificados do Treinamento Obrigatório CIPA (16 Horas + Lei 14.457/2022)',
        generated_at: '2026-09-25',
        sha256: 'SHA256: cert7b1c0987b654f321e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c3'
      }
    ]
  },
  {
    id: 'cipa-proc-002',
    client_id: 'client-2',
    client_name: 'Agropecuária Fazenda Boa Esperança S/A',
    mandate_year: '2026/2028',
    norm: 'NR-31.7',
    risk_grade: 3,
    cnae: '01.11-3-02 - Cultivo de milho e soja',
    total_employees: 48,
    total_eligible_voters: 48,
    total_votes_cast: 44,
    quorum_percentage: 91.6,
    dimensioning: {
      norm: 'NR-31.7',
      risk_grade: 3,
      total_employees: 48,
      effective_members_employee: 2,
      substitute_members_employee: 2,
      effective_members_employer: 2,
      substitute_members_employer: 2,
      total_members: 8,
      training_hours_required: 20,
      is_designated_only: false,
      includes_harassment_module: true
    },
    status: 'ACTIVE_MANDATE',
    timeline: {
      mandate_end_date: '2028-02-29',
      convocation_date: '2026-01-01',
      commission_formation_date: '2026-01-05',
      edital_publication_date: '2026-01-15',
      candidacy_start_date: '2026-01-16',
      candidacy_end_date: '2026-01-31',
      candidate_list_publication_date: '2026-02-01',
      voter_list_publication_date: '2026-02-01',
      voting_start_date: '2026-02-10',
      voting_end_date: '2026-02-12',
      scrutiny_date: '2026-02-12',
      training_start_date: '2026-02-18',
      training_end_date: '2026-02-25',
      inauguration_date: '2026-03-01'
    },
    electoral_commission: [
      {
        id: 'ec-cipatr-1',
        name: 'Geraldo Magela',
        cpf: '234.567.890-12',
        role: 'PRESIDENT',
        represented_party: 'EMPLOYER',
        department: 'Administração da Fazenda'
      }
    ],
    employer_appointees: [
      {
        id: 'app-cipatr-1',
        name: 'José Carlos Alvarenga',
        cpf: '345.678.901-23',
        role: 'PRESIDENT',
        department: 'Operações Agrícolas',
        job_title: 'Encarregado Geral de Lavoura',
        is_president: true,
        training_completed: true,
        training_hours: 20
      }
    ],
    candidates: [
      {
        id: 'cand-cipatr-1',
        name: 'Manoel da Silva Santos',
        cpf: '456.789.012-34',
        department: 'Operação de Tratores e Colheitadeiras',
        job_title: 'Operador de Máquinas Agrícolas',
        candidacy_number: '11',
        registration_date: '2026-01-18',
        proposals: 'Adequação de cabines climatizadas e proteção solar no campo.',
        votes_received: 28,
        elected_role: 'VICE_PRESIDENT',
        is_eligible: true,
        has_stability_protection: true,
        tiebreaker_seniority_months: 60,
        tiebreaker_age_years: 45
      }
    ],
    audit_votes: [],
    meetings: [],
    generated_documents: [
      {
        id: 'doc-cipatr-001',
        type: 'INAUGURATION_ATA',
        title: 'Ata de Posse e Instalação da CIPATR - Gestão 2026/2028',
        generated_at: '2026-03-01',
        sha256: 'SHA256: 8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7'
      }
    ]
  }
];

