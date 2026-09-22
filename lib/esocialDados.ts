/**
 * Monta os payloads dos eventos eSocial a partir dos registros reais do sistema.
 *
 * O QUE HAVIA ANTES
 *
 * `generateESocialFromServiceOrder` fabricava o evento inteiro. Um S-2240 saia
 * com trabalhador "Colaborador Extraido do PGR", CPF 123.456.789-01, matricula
 * sorteada, ruido de "86.2 dB(A)" medido por "Dosimetria NHO-01", EPI "CA 14235"
 * e responsavel "Eng. Eduardo Vasconcelos, CREA-SP 5069812/D". O S-2220 saia com
 * uma medica e um coordenador de PCMSO inventados e ASO "APTO". Os dois nasciam
 * com environment 'PRODUCAO' e status 'READY_TO_SEND', sem passar por validacao.
 *
 * Nada disso foi medido. Um S-2240 declarando 86,2 dB(A) acima do limite de
 * tolerancia e o documento que fundamenta aposentadoria especial: e uma
 * declaracao ao governo, em nome do empregador, sobre exposicao que ninguem
 * avaliou.
 *
 * A REGRA AQUI
 *
 * Nenhum campo e preenchido por suposicao. O que nao existe no cadastro vira
 * PENDENCIA - uma frase dizendo o que falta e onde cadastrar - e o evento sai
 * como rascunho, para a validacao existente recusa-lo com o motivo certo.
 *
 * SOBRE O S-2220 E A LISTA DE EXAMES
 *
 * O sistema registra o ASO (tipo, data, resultado, medico) no historico do
 * colaborador, mas NAO registra quais exames foram realizados nem o resultado
 * de cada um. `SSTExamProtocol` e o planejamento do PCMSO - quais exames o GHE
 * exige e com que periodicidade -, nao o registro do que foi feito.
 *
 * Por isso `exams_list` sai vazia, e nao preenchida com o protocolo como se
 * fosse resultado. A validacao entao recusa o evento dizendo que falta exame -
 * que e exatamente a lacuna real. Preencher com o planejamento faria o sistema
 * declarar ao eSocial um exame cujo resultado ninguem anotou.
 */

import type {
  Employee,
  EmployeeASOHistory,
  ESocialAmbientRiskData,
  ESocialAmbientRiskFactor,
  ESocialASOData,
  RiskCategoryType,
  SSTEnvironmentalRisk,
} from '@/types';

/** Uma lacuna do cadastro que impede o evento de sair completo. */
export interface PendenciaESocial {
  /** O que falta, em uma frase que o usuario possa agir. */
  motivo: string;
  /** A qual registro a falta se refere (colaborador, GHE, OS). */
  onde: string;
}

export interface MontagemAmbiental {
  dados: ESocialAmbientRiskData;
  pendencias: PendenciaESocial[];
}

export interface MontagemAso {
  dados: ESocialASOData;
  pendencias: PendenciaESocial[];
}

/**
 * O tipo do risco aceita forma acentuada e nao acentuada; o payload do eSocial
 * so aceita a acentuada. Normaliza sem inventar categoria: o que nao casar vira
 * 'AUSÊNCIA_RISCO', que e a unica opcao honesta para um valor desconhecido
 * (codigo 09.01.001 da Tabela 24), acompanhada de pendencia.
 */
export function normalizarCategoriaRisco(
  categoria: RiskCategoryType | undefined
): ESocialAmbientRiskFactor['category'] {
  switch (categoria) {
    case 'FÍSICO':
    case 'FISICO':
      return 'FÍSICO';
    case 'QUÍMICO':
    case 'QUIMICO':
      return 'QUÍMICO';
    case 'BIOLÓGICO':
    case 'BIOLOGICO':
      return 'BIOLÓGICO';
    case 'ERGONÔMICO':
    case 'ERGONOMICO':
      return 'ERGONÔMICO';
    case 'ACIDENTES':
      return 'ACIDENTES';
    default:
      return 'AUSÊNCIA_RISCO';
  }
}

/**
 * O codigo da Tabela 24 costuma ser gravado como "01.01.001 - Ruido Continuo".
 * O eSocial quer so o codigo. Corta na primeira separacao; se nao houver,
 * devolve o que esta la, sem completar digitos.
 */
export function extrairCodigoTabela24(valor: string | undefined): string {
  if (!valor) return '';
  return valor.split(/\s*[-–]\s*/)[0].trim();
}

/**
 * Converte um risco do inventario no fator de risco do S-2240.
 *
 * A intensidade so e declarada quando a avaliacao foi QUANTITATIVA e ha valor
 * medido. Numa avaliacao qualitativa nao existe numero, e informar um seria
 * inventar a medicao.
 */
export function montarFatorDeRisco(risco: SSTEnvironmentalRisk): {
  fator: ESocialAmbientRiskFactor;
  pendencias: PendenciaESocial[];
} {
  const pendencias: PendenciaESocial[] = [];
  const onde = `Risco "${risco.agent_name || risco.id}"`;

  const codigo = extrairCodigoTabela24(risco.risk_code_table_24);
  if (!codigo) {
    pendencias.push({
      motivo: 'Código da Tabela 24 do eSocial não informado no inventário de riscos.',
      onde,
    });
  }

  const categoria = normalizarCategoriaRisco(risco.risk_category);
  if (categoria === 'AUSÊNCIA_RISCO' && risco.risk_category !== 'AUSÊNCIA_RISCO') {
    pendencias.push({
      motivo: `Categoria do agente não reconhecida ("${risco.risk_category}").`,
      onde,
    });
  }

  // So ha intensidade quando houve medicao. Avaliacao qualitativa nao produz
  // numero, e o eSocial aceita o fator sem intensidade nesse caso.
  const quantitativa = risco.evaluation_type === 'QUANTITATIVA';
  const temMedicao = quantitativa && !!risco.measured_value;

  if (quantitativa && !risco.measured_value) {
    pendencias.push({
      motivo: 'Avaliação marcada como quantitativa, mas sem valor medido registrado.',
      onde,
    });
  }
  if (temMedicao && !risco.measurement_methodology) {
    pendencias.push({
      motivo: 'Valor medido sem metodologia/técnica de medição registrada (exigida pelo eSocial).',
      onde,
    });
  }

  // Só os EPIs efetivamente registrados, com CA. Um CA em branco reprova na
  // validacao, que e o comportamento correto.
  const epis = Array.isArray(risco.epis) ? risco.epis : [];
  const cas = epis.map((e) => e.ca_number).filter((ca) => !!ca && ca.trim().length > 0);

  if (risco.epi_required && cas.length === 0) {
    pendencias.push({
      motivo: 'Risco exige EPI, mas nenhum CA foi registrado.',
      onde,
    });
  }

  const fator: ESocialAmbientRiskFactor = {
    id: risco.id,
    risk_code_table_24: codigo,
    category: categoria,
    description: risco.agent_name || risco.risk_code_table_24 || 'Agente não descrito',
    intensity_concentration: temMedicao
      ? `${risco.measured_value}${risco.measurement_unit ? ` ${risco.measurement_unit}` : ''}`
      : undefined,
    limit_tolerance: risco.tolerance_limit || undefined,
    measurement_unit: risco.measurement_unit || undefined,
    technique_used: temMedicao ? risco.measurement_methodology || undefined : undefined,
    epc_effective: !!risco.epc_effective,
    epi_effective: epis.length > 0 && epis.every((e) => e.is_effective),
    epi_ca_numbers: cas.length > 0 ? cas : undefined,
    is_insalubre: !!risco.insalubridade_applies,
    is_periculoso: !!risco.periculosidade_applies,
  };

  return { fator, pendencias };
}

export interface EntradaAmbiental {
  colaborador: Employee;
  /** Riscos do inventario que alcancam esse colaborador. */
  riscos: SSTEnvironmentalRisk[];
  /** Nome do responsavel tecnico da OS, quando houver. */
  responsavelNome?: string;
  /** CPF do responsavel tecnico, do cadastro de usuarios. */
  responsavelCpf?: string;
  /** Registro profissional (CREA/CRM) do responsavel, quando cadastrado. */
  responsavelRegistro?: string;
  /** UF do registro profissional. */
  responsavelUf?: string;
  /** Descricao do ambiente/estabelecimento. */
  ambiente: string;
  /** Descricao das atividades, vinda do cargo. */
  atividades: string;
  /** Data de inicio da condicao ambiental (dtIniCondic). */
  dataInicio: string;
}

/**
 * Monta o bloco de condicoes ambientais do S-2240.
 *
 * O CPF e o registro do responsavel vem do cadastro de usuarios. Quando faltam,
 * o campo sai vazio e a falta vira pendencia - nunca um numero de fachada, que
 * passaria pela validacao e seria recusado pelo governo.
 */
export function montarCondicoesAmbientais(entrada: EntradaAmbiental): MontagemAmbiental {
  const pendencias: PendenciaESocial[] = [];
  const onde = `Colaborador ${entrada.colaborador.name}`;

  const fatores: ESocialAmbientRiskFactor[] = [];
  entrada.riscos.forEach((r) => {
    const { fator, pendencias: p } = montarFatorDeRisco(r);
    fatores.push(fator);
    pendencias.push(...p);
  });

  if (fatores.length === 0) {
    pendencias.push({
      motivo:
        'Nenhum risco inventariado alcança este colaborador. O S-2240 exige ao menos um fator ' +
        '(ou o código 09.01.001 - Ausência de Risco, que precisa ser declarado explicitamente no inventário).',
      onde,
    });
  }

  if (!entrada.responsavelNome) {
    pendencias.push({
      motivo: 'Ordem de Serviço sem responsável técnico definido.',
      onde: `OS do colaborador ${entrada.colaborador.name}`,
    });
  }
  if (!entrada.responsavelRegistro) {
    pendencias.push({
      motivo:
        'Responsável técnico sem registro profissional (CREA/CRM) cadastrado no perfil. ' +
        'Cadastre em Usuários › Registro Profissional.',
      onde: entrada.responsavelNome || 'Responsável técnico',
    });
  }
  if (!entrada.responsavelCpf) {
    pendencias.push({
      motivo:
        'Responsável técnico sem CPF cadastrado no perfil. O eSocial exige esse campo ' +
        '(cpfResp) no S-2240. Cadastre em Usuários › CPF.',
      onde: entrada.responsavelNome || 'Responsável técnico',
    });
  }
  if (!entrada.responsavelUf) {
    pendencias.push({
      motivo: 'Responsável técnico sem UF do registro profissional cadastrada.',
      onde: entrada.responsavelNome || 'Responsável técnico',
    });
  }

  const dados: ESocialAmbientRiskData = {
    start_date: entrada.dataInicio,
    description_activities: entrada.atividades,
    work_environment: entrada.ambiente,
    ambient_risks: fatores,
    responsible_technician_name: entrada.responsavelNome || '',
    responsible_technician_cpf: entrada.responsavelCpf || '',
    responsible_technician_crea_crm: entrada.responsavelRegistro || '',
    responsible_technician_uf: entrada.responsavelUf || '',
  };

  return { dados, pendencias };
}

/**
 * Escolhe o ASO que o evento deve declarar: o mais recente registrado.
 *
 * Devolve null quando o colaborador nao tem nenhum ASO no historico - situacao
 * em que nao ha S-2220 a emitir, e nao um S-2220 com dados de exemplo.
 */
export function selecionarAsoMaisRecente(colaborador: Employee): EmployeeASOHistory | null {
  const historico = Array.isArray(colaborador.aso_history) ? colaborador.aso_history : [];
  if (historico.length === 0) return null;

  return historico
    .slice()
    .sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''))
    .pop() as EmployeeASOHistory;
}

/**
 * Monta o bloco de ASO do S-2220 a partir de um ASO realmente registrado.
 *
 * `APTO_COM_RESTRICAO` e mapeado para APTO porque o eSocial so tem resAso
 * 1 (apto) e 2 (inapto): uma restricao nao torna o trabalhador inapto. A
 * restricao vai anotada, para nao se perder.
 */
export function montarAsoDoEvento(
  colaborador: Employee,
  aso: EmployeeASOHistory
): MontagemAso {
  const pendencias: PendenciaESocial[] = [];
  const onde = `ASO de ${colaborador.name} (${aso.exam_date || 'sem data'})`;

  if (!aso.exam_date) {
    pendencias.push({ motivo: 'ASO sem data de emissão registrada.', onde });
  }
  if (!aso.physician_name) {
    pendencias.push({ motivo: 'ASO sem nome do médico examinador.', onde });
  }
  if (!aso.physician_crm || !aso.physician_uf) {
    pendencias.push({ motivo: 'ASO sem CRM e UF do médico examinador.', onde });
  }

  // O sistema nao registra quais exames foram feitos nem seus resultados, so o
  // ASO em si. A lista sai vazia de proposito - ver o cabecalho deste arquivo.
  pendencias.push({
    motivo:
      'Nenhum exame com resultado registrado para este ASO. O S-2220 exige a lista de ' +
      'procedimentos realizados (Tabela 27) com o resultado de cada um.',
    onde,
  });

  const dados: ESocialASOData = {
    aso_type: aso.aso_type,
    exam_date: aso.exam_date || '',
    result: aso.result === 'INAPTO' ? 'INAPTO' : 'APTO',
    physician_name: aso.physician_name || '',
    physician_crm: aso.physician_crm || '',
    physician_uf: aso.physician_uf || '',
    exams_list: [],
  };

  return { dados, pendencias };
}

/**
 * Riscos do inventario que alcancam um colaborador.
 *
 * A ligacao forte e o GHE - o Grupo Homogeneo de Exposicao e, por definicao, o
 * conjunto de trabalhadores sujeitos a mesma exposicao. Sem GHE no cadastro do
 * colaborador, cai para a ligacao por cargo; sem cargo, nao adivinha: devolve
 * vazio, e quem chama registra a pendencia.
 */
export function riscosDoColaborador(
  colaborador: Employee,
  inventario: SSTEnvironmentalRisk[]
): SSTEnvironmentalRisk[] {
  const doCliente = inventario.filter((r) => r.client_id === colaborador.client_id);

  if (colaborador.ghe_id) {
    const porGhe = doCliente.filter((r) => r.ghe_id === colaborador.ghe_id);
    if (porGhe.length > 0) return porGhe;
  }

  if (colaborador.job_id) {
    const porCargo = doCliente.filter((r) => r.job_id === colaborador.job_id);
    if (porCargo.length > 0) return porCargo;
  }

  return [];
}

/** Junta pendencias iguais, para a tela nao repetir a mesma frase N vezes. */
export function resumirPendencias(pendencias: PendenciaESocial[]): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  pendencias.forEach((p) => {
    const linha = `${p.onde}: ${p.motivo}`;
    if (vistos.has(linha)) return;
    vistos.add(linha);
    saida.push(linha);
  });
  return saida;
}
