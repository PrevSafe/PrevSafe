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
 * O S-2220 exige a lista de procedimentos realizados (Tabela 27). O resultado
 * de cada um ({indResult}) e opcional e so vai com autorizacao do trabalhador
 * (MOS, item 1.6): o sistema nao o envia. Ate a versao anterior o sistema so guardava o ASO
 * (tipo, data, resultado, medico), e nao havia onde lancar exame: a lista saia
 * vazia e o evento ficava retido apontando a falta.
 *
 * Agora o ASO carrega `exams`, preenchido no lancamento. A distincao que
 * importa: `SSTExamProtocol` e o PLANEJAMENTO do PCMSO - quais exames o GHE
 * exige e com que periodicidade. `EmployeeExamResult` e o que foi FEITO. O
 * planejamento serve para sugerir as linhas do formulario; o resultado de cada
 * uma vem de quem lancou. Copiar o planejamento como se fosse resultado seria
 * declarar ao eSocial exame que ninguem realizou.
 */

import {
  consultarProcedimento,
  normalizarCodigoTabela27,
  codigoExisteNaTabela27,
} from '@/lib/tabela27';
import {
  consultarAgente,
  codigoExisteNaTabela24,
  formatoDoCodigoTabela24,
  CODIGO_AUSENCIA_DE_RISCO,
} from '@/lib/tabela24';
import { protocolosDoTrabalhador } from '@/lib/protocolosDeExame';
import { procedimentoVedado } from '@/lib/pcmso';
import type {
  Employee,
  EmployeeASOHistory,
  ESocialAmbientRiskData,
  ESocialAmbientRiskFactor,
  ESocialASOData,
  ESocialComplementaryExam,
  EmployeeExamResult,
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

  const codigo = formatoDoCodigoTabela24(risco.risk_code_table_24).codigo;
  const agente = consultarAgente(codigo);

  if (codigo && !agente) {
    // Codigo preenchido que nao existe: era assim que "Ruido" carregava
    // 01.01.001, que e Arsenio.
    pendencias.push({
      motivo: `O código ${codigo} não consta na Tabela 24 do eSocial.`,
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
    // A denominacao oficial do agente, quando o codigo existe: e ela que vale
    // perante o governo, nao o nome interno do inventario.
    description: agente?.nome || risco.agent_name || 'Agente não descrito',
    intensity_concentration: temMedicao
      ? `${risco.measured_value}${risco.measurement_unit ? ` ${risco.measurement_unit}` : ''}`
      : undefined,
    limit_tolerance: risco.tolerance_limit || undefined,
    measurement_unit: risco.measurement_unit || undefined,
    technique_used: temMedicao ? risco.measurement_methodology || undefined : undefined,
    epc_implemented: !!risco.epc_implemented,
    epc_effective: !!risco.epc_implemented && !!risco.epc_effective,
    epi_used: !!risco.epi_required || cas.length > 0,
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

  // O S-2240 declara AGENTES NOCIVOS do Anexo IV do Decreto 3.048/1999, nao o
  // inventario do PGR inteiro. Risco ergonomico e de acidente entram no PGR
  // pela NR-01 e NAO tem codigo na Tabela 24 - manda-los para o evento seria
  // declarar ao governo agente nocivo que a norma nao preve.
  const comAgente = entrada.riscos.filter((r) => codigoExisteNaTabela24(r?.risk_code_table_24));
  const semAgente = entrada.riscos.filter((r) => !codigoExisteNaTabela24(r?.risk_code_table_24));

  const fatores: ESocialAmbientRiskFactor[] = [];
  comAgente.forEach((r) => {
    const { fator, pendencias: p } = montarFatorDeRisco(r);
    fatores.push(fator);
    pendencias.push(...p);
  });

  // Codigo PREENCHIDO que nao existe na tabela e erro e precisa aparecer.
  // Codigo vazio e o estado normal de um risco ergonomico ou de acidente.
  semAgente
    .filter((r) => !!(r?.risk_code_table_24 || '').trim())
    .forEach((r) => {
      pendencias.push({
        motivo:
          `O risco "${r?.agent_name || r?.id}" tem o código ${r?.risk_code_table_24}, que não ` +
          'consta na Tabela 24. Ele ficou de fora do evento.',
        onde,
      });
    });

  if (fatores.length === 0) {
    // Sem nenhum agente do Anexo IV, o que se declara e a AUSENCIA de agente
    // nocivo - inclusive quando o PGR do colaborador tem riscos, desde que
    // nenhum deles seja do Anexo IV.
    fatores.push({
      id: `ausencia-${entrada.colaborador.id}`,
      risk_code_table_24: CODIGO_AUSENCIA_DE_RISCO,
      category: 'AUSÊNCIA_RISCO',
      description:
        consultarAgente(CODIGO_AUSENCIA_DE_RISCO)?.nome || 'Ausência de agente nocivo',
      epc_effective: false,
      epi_effective: false,
      is_insalubre: false,
      is_periculoso: false,
    });

    pendencias.push({
      motivo:
        entrada.riscos.length === 0
          ? 'Nenhum risco inventariado alcança este colaborador. O evento foi montado com ' +
            `${CODIGO_AUSENCIA_DE_RISCO} (ausência de agente nocivo) — confirme se o inventário ` +
            'do PGR está completo antes de transmitir.'
          : `Os ${entrada.riscos.length} risco(s) deste colaborador não constam do Anexo IV do ` +
            'Decreto 3.048/1999 (é o caso de riscos ergonômicos e de acidente). O evento foi ' +
            `montado com ${CODIGO_AUSENCIA_DE_RISCO} (ausência de agente nocivo), que é o ` +
            'correto — eles permanecem no PGR.',
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
 * Codigos do S-2220 conforme o leiaute S-1.3 (cons. ate a NT 07/2026 rev.).
 *
 * Os dois montadores do evento usavam tabelas proprias, e erradas: o admissional
 * saia como 1 (periodico), o demissional como 4 (monitoracao pontual), o
 * APTO_COM_RESTRICAO como 2 (inapto) e o exame sem resultado como 4
 * (agravamento). Agora os dois leem daqui.
 *
 * tpExameOcup: 0 admissional; 1 periodico; 2 retorno ao trabalho; 3 mudanca de
 * funcao ou de risco ocupacional; 4 monitoracao pontual; 9 demissional. O 4 nao
 * e gerado: o MOS (S-2220, item 3.1) o reserva ao exame que o medico decide
 * fazer por necessidade especifica, e o ASO do sistema nao tem esse tipo.
 */
export const TP_EXAME_OCUP: Record<EmployeeASOHistory['aso_type'], string> = {
  ADMISSIONAL: '0',
  PERIODICO: '1',
  RETORNO_TRABALHO: '2',
  MUDANCA_RISCO: '3',
  DEMISSIONAL: '9',
};

export function tpExameOcupDoAso(tipo: string | undefined): string {
  return (TP_EXAME_OCUP as Record<string, string>)[tipo || ''] || '';
}

/** resAso: 1 apto, 2 inapto. Restricao nao torna inapto. Sem resultado, vazio. */
export function resAsoDoAso(resultado: string | undefined): string {
  if (resultado === 'APTO' || resultado === 'APTO_COM_RESTRICAO') return '1';
  if (resultado === 'INAPTO') return '2';
  return '';
}

/**
 * Procedimentos em que o leiaute exige {obsProc}: "Preenchimento obrigatorio se
 * procRealizado = [0583, 0998, 0999, 1128, 1230, 1992, 1993, 1994, 1995, 1996,
 * 1997, 1998, 1999, 9999]". Fora deles o campo nao vai: a observacao que o
 * medico escreve no exame pode conter achado clinico, e o MOS (S-2220, item
 * 1.9) diz que a fonte do evento e o ASO, nunca o prontuario.
 */
export const PROCEDIMENTOS_COM_OBSPROC = new Set([
  '0583', '0998', '0999', '1128', '1230', '1992', '1993', '1994', '1995', '1996',
  '1997', '1998', '1999', '9999',
]);

/** Audiometria: o unico procedimento em que o leiaute exige {ordExame}. */
export const PROCEDIMENTO_COM_ORDEXAME = '0281';

const textoXml = (v: string) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Grupo [epcEpi] do S-2240, leiaute S-1.3:
 *
 *   utilizEPC  0 nao se aplica, 1 nao implementa, 2 implementa
 *   eficEpc    S/N - "Preenchimento obrigatorio e exclusivo se utilizEPC = [2]"
 *   utilizEPI  0 nao se aplica, 1 nao utilizado, 2 utilizado
 *   eficEpi    S/N - "Preenchimento obrigatorio e exclusivo se utilizEPI = [2]"
 *   epi        0-50, so com {docAval} (CA ou documento de avaliacao)
 *
 * As duas montagens do S-2240 diziam coisas diferentes, e as duas erravam: uma
 * mandava utilizEPC=2 so quando o EPC era EFICAZ (implantado e nao aferido
 * saia "nao implementa"); a outra mandava 2 quando implantado e nunca
 * informava eficEpc. E EPI entregue cuja eficacia ninguem atestou saia
 * utilizEPI=1, "nao utilizado".
 *
 * Eficacia nao verificada sai N. Declarar S sem afericao afasta a exposicao
 * da aposentadoria especial por um fato que ninguem conferiu. A eficacia do
 * EPC vem do plano de acao (lib/planoDeAcao.ts, efeitoNoRisco).
 */
export function xmlDoEpcEpi(
  p: { epcImplementado: boolean; epcEficaz: boolean; epiUtilizado: boolean; epiEficaz: boolean; cas: string[] },
  recuo = '          '
): string {
  const linhas = [`${recuo}<epcEpi>`];
  if (p.epcImplementado) {
    linhas.push(`${recuo}  <utilizEPC>2</utilizEPC>`, `${recuo}  <eficEpc>${p.epcEficaz ? 'S' : 'N'}</eficEpc>`);
  } else {
    linhas.push(`${recuo}  <utilizEPC>1</utilizEPC>`);
  }
  if (p.epiUtilizado) {
    linhas.push(`${recuo}  <utilizEPI>2</utilizEPI>`, `${recuo}  <eficEpi>${p.epiEficaz ? 'S' : 'N'}</eficEpi>`);
    (p.cas || []).filter((ca) => String(ca || '').trim()).slice(0, 50).forEach((ca) => {
      linhas.push(`${recuo}  <epi>`, `${recuo}    <docAval>${textoXml(String(ca).trim())}</docAval>`, `${recuo}  </epi>`);
    });
  } else {
    linhas.push(`${recuo}  <utilizEPI>1</utilizEPI>`);
  }
  linhas.push(`${recuo}</epcEpi>`);
  return linhas.join('\n');
}

/**
 * Grupos [exame] do S-2220.
 *
 * {indResult} nunca vai. MOS S-1.3, S-2220, item 1.6: "O campo {indResult} nao
 * e de preenchimento obrigatorio e somente pode ser informado com autorizacao
 * do trabalhador, em virtude do sigilo medico." O sistema nao registra essa
 * autorizacao; o resultado fica no ASO e no prontuario.
 *
 * {obsProc} vai so nos codigos que o exigem, com o nome do procedimento - a
 * descricao que o item 1.10 do MOS pede para o codigo 9999.
 *
 * {ordExame} vai so na audiometria, como o leiaute manda: 1 inicial, 2
 * sequencial (MOS, item 2.1), conforme `order` calculado em montarAsoDoEvento.
 */
export function xmlDosExamesDoS2220(exames: ESocialComplementaryExam[], recuo = '      '): string {
  // MOS S-1.3, S-2220, item 1.10: "o codigo 9999 somente pode ser informado 1
  // vez" - os procedimentos sem codigo proprio vao juntos, descritos no obsProc.
  const outros = (exames || []).filter((e) => String(e?.code || '').trim() === '9999');
  const lista = outros.length > 1
    ? [
      ...(exames || []).filter((e) => String(e?.code || '').trim() !== '9999'),
      { ...outros[0], name: outros.map((e) => e?.name || '').filter(Boolean).join('; ') }
    ]
    : (exames || []);
  return lista.map((e) => {
    const codigo = String(e?.code || '').trim();
    const linhas = [
      `${recuo}<exame>`,
      `${recuo}  <dtExm>${textoXml(e?.date || '')}</dtExm>`,
      `${recuo}  <procRealizado>${textoXml(codigo)}</procRealizado>`,
    ];
    if (PROCEDIMENTOS_COM_OBSPROC.has(codigo)) {
      linhas.push(`${recuo}  <obsProc>${textoXml(e?.name || '')}</obsProc>`);
    }
    if (codigo === PROCEDIMENTO_COM_ORDEXAME && e?.order) {
      linhas.push(`${recuo}  <ordExame>${e.order === 'SEQUENCIAL' ? '2' : '1'}</ordExame>`);
    }
    linhas.push(`${recuo}</exame>`);
    return linhas.join('\n');
  }).join('\n');
}

/**
 * Audiometria inicial ou sequencial (MOS S-1.3, S-2220, item 2.1): inicial e a
 * primeira realizada no declarante. O sistema so enxerga o historico que tem;
 * audiometria feita antes dele e nao lancada aqui fica de fora.
 */
function ordemDaAudiometria(colaborador: Employee, aso: EmployeeASOHistory): 'INICIAL' | 'SEQUENCIAL' {
  const historico = Array.isArray(colaborador.aso_history) ? colaborador.aso_history : [];
  const anterior = historico.some((outro) =>
    outro !== aso &&
    outro?.id !== aso.id &&
    String(outro?.exam_date || '') < String(aso.exam_date || '') &&
    (outro?.exams || []).some((x) => x?.exam_code_table_27 === PROCEDIMENTO_COM_ORDEXAME)
  );
  return anterior ? 'SEQUENCIAL' : 'INICIAL';
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

  const realizados = Array.isArray(aso.exams) ? aso.exams : [];

  if (realizados.length === 0) {
    pendencias.push({
      motivo:
        'Nenhum exame registrado para este ASO. O S-2220 exige a lista de ' +
        'procedimentos realizados (Tabela 27). ' +
        'Lance os exames em SST › PCMSO › Emitir ASO.',
      onde,
    });
  }

  const vedados = realizados.filter((e) => procedimentoVedado(e?.exam_code_table_27));
  vedados.forEach((e) => {
    const v = procedimentoVedado(e.exam_code_table_27);
    pendencias.push({
      motivo: `Exame "${e.exam_name || e.exam_code_table_27}" fora do evento: ${v?.motivo} não pode integrar exame ocupacional (${v?.fonte}). Remova-o do ASO.`,
      onde,
    });
  });
  if (!aso.result) {
    pendencias.push({ motivo: 'ASO sem conclusão de apto ou inapto (NR-07, subitem 7.5.19.1, "e").', onde });
  }

  const exams_list: ESocialComplementaryExam[] = realizados.filter((e) => !procedimentoVedado(e?.exam_code_table_27)).map((e) => {
    if (!e.exam_code_table_27) {
      pendencias.push({
        motivo: `Exame "${e.exam_name || 'sem nome'}" sem código da Tabela 27 do eSocial.`,
        onde,
      });
    } else if (!codigoExisteNaTabela27(e.exam_code_table_27)) {
      // Codigo que nao existe na tabela e recusado pelo governo. Vale apontar
      // aqui: foi assim que os seis protocolos de exemplo carregaram por
      // meses codigos de agentes quimicos no lugar de exames.
      pendencias.push({
        motivo:
          `Exame "${e.exam_name || 'sem nome'}": o código ${e.exam_code_table_27} não consta ` +
          'na Tabela 27 do eSocial.',
        onde,
      });
    }
    if (!e.exam_date) {
      pendencias.push({
        motivo: `Exame "${e.exam_name || 'sem nome'}" sem data de realização.`,
        onde,
      });
    }
    if (PROCEDIMENTOS_COM_OBSPROC.has(String(e.exam_code_table_27 || '')) && !String(e.exam_name || '').trim()) {
      pendencias.push({
        motivo:
          `O código ${e.exam_code_table_27} exige a descrição do procedimento no S-2220 ` +
          '(campo obsProc). Dê nome ao exame.',
        onde,
      });
    }
    // A observacao do exame nao entra no evento: ela nao vai ao eSocial (ver
    // xmlDosExamesDoS2220) e nao ha por que copiar texto clinico para la.
    return {
      code: e.exam_code_table_27 || '',
      name: e.exam_name || '',
      date: e.exam_date || '',
      procedure_type: e.procedure_type,
      result: e.result,
      order: e.exam_code_table_27 === PROCEDIMENTO_COM_ORDEXAME
        ? ordemDaAudiometria(colaborador, aso)
        : undefined,
    };
  });

  const dados: ESocialASOData = {
    aso_type: aso.aso_type,
    exam_date: aso.exam_date || '',
    // Sem conclusao nao se presume apto: o campo fica vazio e a pendencia acima retem o evento.
    result: aso.result === 'INAPTO' ? 'INAPTO' : aso.result ? 'APTO' : ('' as any),
    physician_name: aso.physician_name || '',
    physician_crm: aso.physician_crm || '',
    physician_uf: aso.physician_uf || '',
    exams_list,
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

/**
 * Tipo de procedimento sugerido a partir do nome do exame.
 *
 * E SUGESTAO para o campo vir pre-selecionado, nao classificacao automatica: o
 * usuario troca quando quiser. O que nao for reconhecido vira 'OUTRO' em vez
 * de cair em alguma categoria por aproximacao.
 */
export function sugerirTipoDeProcedimento(
  nomeDoExame: string
): EmployeeExamResult['procedure_type'] {
  const n = (nomeDoExame || '').toLowerCase();

  if (/audiometr/.test(n)) return 'AUDIOMETRIA';
  if (/espirometr/.test(n)) return 'ESPIROMETRIA';
  if (/rx|raio.?x|t[óo]rax/.test(n)) return 'RX_TORAX_OIT';
  if (/hemograma/.test(n)) return 'HEMOGRAMA';
  if (/glicemia|glicose/.test(n)) return 'GLICEMIA';
  if (/acuidade|oftalmol/.test(n)) return 'ACUIDADE_VISUAL';
  if (/cl[íi]nic|anamnese/.test(n)) return 'CLINICO';
  return 'OUTRO';
}

/**
 * Linhas sugeridas para o lancamento de exames de um ASO.
 *
 * Vem dos protocolos do PCMSO do GHE do colaborador, filtrados pelo tipo de
 * ASO (o `triggers` do protocolo diz em quais ocasioes aquele exame e devido).
 *
 * Sugestao e o limite do que o planejamento pode dar: ele diz o que DEVERIA ter
 * sido feito. Quais foram realizados de fato, em que data e com que resultado,
 * quem preenche e quem lancou - por isso a data e o resultado saem em branco.
 */
export function exameSugeridosParaAso(
  colaborador: Employee,
  protocolos: any[],
  tipoDeAso: EmployeeASOHistory['aso_type']
): Array<Omit<EmployeeExamResult, 'id' | 'result' | 'exam_date'>> {
  // O filtro de quem o protocolo alcanca esta em lib/protocolosDeExame.ts:
  // a tela, o card do painel e a validade do ASO leem a mesma regra. Note que
  // `client_id` vazio e protocolo MODELO e vale para qualquer cliente - o
  // filtro por igualdade estrita os descartava, e a lista de exames sugeridos
  // vinha sempre vazia.
  return protocolosDoTrabalhador(protocolos, colaborador, tipoDeAso)
    // Protocolo antigo com teste de HIV ou de gravidez nao vira exame do ASO.
    .filter((p) => !procedimentoVedado(p?.exam_code_table_27))
    .map((p) => {
      // O codigo e normalizado pela Tabela 27 (aceita "295", "0295" e
      // "0295 - Avaliacao clinica"). Quando ele consta na tabela, o NOME vem
      // de la: o nome digitado no protocolo pode estar trocado, e quem vale
      // perante o governo e a denominacao publicada.
      const oficial = consultarProcedimento(p.exam_code_table_27);
      const nome = oficial?.nome || p.exam_name || '';
      return {
        exam_code_table_27: oficial?.codigo || normalizarCodigoTabela27(p.exam_code_table_27),
        exam_name: nome,
        procedure_type: sugerirTipoDeProcedimento(nome),
        protocol_id: p.id,
      };
    });
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
