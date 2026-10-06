/**
 * Resultado de exame fora do cadastro do funcionario.
 *
 * O cadastro (colecao employees) e lido por toda a equipe, e a RLS do
 * Supabase separa por colecao, nao por campo. Por isso o que o medico anota -
 * resultado e observacao de cada exame, a conclusao "apto com restricao" e o
 * texto da restricao - vive na colecao examResults, que so os papeis SAUDE e
 * ADMIN leem e gravam. No cadastro fica o que o ASO entregue ao empregador
 * traz: tipo, data, validade, apto ou inapto e a lista de exames feitos
 * (NR-07, 7.5.19.1).
 *
 * Tudo aqui e puro (sem React, sem Supabase): os verificadores rodam estas
 * funcoes direto, e o script de migracao segue as mesmas regras.
 */
import type {
  EmployeeASOHistory,
  EmployeeExamRecord,
  ExamResultItem,
  ExamResultRecord,
  ResultadoDeExame,
} from '@/types';

/** O que quem nao tem o papel ve no lugar do resultado. Nunca um campo vazio. */
export const RESULTADO_RESTRITO = 'Resultado restrito ao papel Saúde';

export const RESULTADOS_DE_EXAME: ResultadoDeExame[] = ['NORMAL', 'ALTERADO', 'ESTAVEL', 'AGRAVAMENTO'];

export const ROTULO_DO_RESULTADO: Record<ResultadoDeExame, string> = {
  NORMAL: 'Normal',
  ALTERADO: 'Alterado',
  ESTAVEL: 'Estável',
  AGRAVAMENTO: 'Agravamento',
};

export const ROTULO_DA_CONCLUSAO_CLINICA: Record<ExamResultRecord['aso_result'], string> = {
  APTO: 'Apto',
  INAPTO: 'Inapto',
  APTO_COM_RESTRICAO: 'Apto com restrição',
};

/**
 * Conclusao do ASO como o cadastro a mostra: so apto ou inapto. O legado
 * APTO_COM_RESTRICAO vira APTO. Sem conclusao, vazio: nunca se presume apto.
 */
export function conclusaoDoAso(aso: { result?: string } | null | undefined): 'APTO' | 'INAPTO' | '' {
  const bruto = String((aso as any)?.result || (aso as any)?.aptitude || '').trim().toUpperCase();
  if (bruto === 'INAPTO') return 'INAPTO';
  if (bruto === 'APTO' || bruto === 'APTO_COM_RESTRICAO') return 'APTO';
  return '';
}

/**
 * id do registro de resultados de um ASO. Deterministico: rodar o script de
 * migracao duas vezes encontra o mesmo registro em vez de criar outro.
 */
export function idDosResultadosDoAso(employeeId: string, asoId: string): string {
  return `exres-${employeeId}-${asoId}`;
}

/** Chave de um exame no indice de resultados. */
export function chaveDoResultado(employeeId: unknown, asoId: unknown, examId: unknown): string {
  return `${String(employeeId ?? '')}|${String(asoId ?? '')}|${String(examId ?? '')}`;
}

// Lista do que PODE ir para o cadastro. Lista de permitidos, e nao de
// proibidos: um campo clinico novo, que ninguem lembrou de proibir, fica de
// fora sozinho.
const CAMPOS_DO_EXAME_NO_CADASTRO = [
  'id',
  'exam_code_table_27',
  'exam_name',
  'exam_date',
  'procedure_type',
  'protocol_id',
] as const;

const CAMPOS_DO_ASO_NO_CADASTRO = [
  'id',
  'aso_type',
  'exam_date',
  'valid_until',
  'physician_name',
  'physician_crm',
  'physician_uf',
  'document_url',
  'esocial_event_id',
] as const;

/** O exame como fica no cadastro do funcionario: sem resultado e sem observacao. */
export function exameParaOCadastro(exame: any): EmployeeExamRecord {
  const saida: Record<string, unknown> = {};
  CAMPOS_DO_EXAME_NO_CADASTRO.forEach((campo) => {
    if (exame?.[campo] !== undefined) saida[campo] = exame[campo];
  });
  return saida as unknown as EmployeeExamRecord;
}

/**
 * O ASO como fica no cadastro do funcionario: tipo, datas, medico emitente,
 * apto ou inapto e os exames feitos. E o que o S-2220 le (lib/esocialDados.ts,
 * montarAsoDoEvento), e nada alem disso.
 */
export function asoParaOCadastro(aso: any): EmployeeASOHistory {
  const saida: Record<string, unknown> = {};
  CAMPOS_DO_ASO_NO_CADASTRO.forEach((campo) => {
    if (aso?.[campo] !== undefined) saida[campo] = aso[campo];
  });
  const conclusao = conclusaoDoAso(aso);
  if (conclusao) saida.result = conclusao;
  if (Array.isArray(aso?.exams)) saida.exams = aso.exams.map(exameParaOCadastro);
  return saida as unknown as EmployeeASOHistory;
}

/**
 * Copia do funcionario (ou de um trecho dele) sem nenhum campo clinico. Para
 * exibir o registro inteiro e para a trilha de auditoria, que toda a equipe
 * le: o cadastro ainda pode trazer o resultado legado ate o script de
 * migracao rodar.
 */
export function semDadoClinico<T>(funcionario: T): T {
  const historico = (funcionario as any)?.aso_history;
  if (!funcionario || !Array.isArray(historico)) return funcionario;
  return { ...(funcionario as any), aso_history: historico.map(asoParaOCadastro) };
}

/**
 * Para telas que exibem o registro inteiro, campo a campo (o detalhe da
 * central de relatorios): tira o dado clinico do funcionario, do ASO
 * escolhido (selectedAso) e da lista de exames do S-2220 gravada no evento -
 * eventos antigos ainda levam o resultado de cada exame.
 */
export function registroParaExibir<T>(registro: T): T {
  let saida: any = semDadoClinico(registro);
  if (!saida || typeof saida !== 'object') return saida;
  if (saida.selectedAso) saida = { ...saida, selectedAso: asoParaOCadastro(saida.selectedAso) };
  const exames = saida.aso_data?.exams_list;
  if (Array.isArray(exames)) {
    saida = {
      ...saida,
      aso_data: {
        ...saida.aso_data,
        exams_list: exames.map((exame: any) => {
          const copia = { ...(exame || {}) };
          delete copia.result;
          delete copia.observation;
          return copia;
        }),
      },
    };
  }
  return saida;
}

/** O registro de resultados de um ASO, ou null quando nao ha (ou nao foi entregue). */
export function resultadosDoAso(
  registros: ExamResultRecord[] | null | undefined,
  employeeId: string,
  asoId: string
): ExamResultRecord | null {
  const id = idDosResultadosDoAso(employeeId, asoId);
  return (
    (registros || []).find(
      (r) => r?.id === id || (r?.employee_id === employeeId && r?.aso_id === asoId)
    ) || null
  );
}

/** employee|aso|exame -> resultado, para o relatorio analitico do PCMSO. */
export function indiceDeResultados(registros: ExamResultRecord[] | null | undefined): Map<string, ResultadoDeExame> {
  const indice = new Map<string, ResultadoDeExame>();
  (registros || []).forEach((registro) => {
    (Array.isArray(registro?.results) ? registro.results : []).forEach((item) => {
      if (!item?.result) return;
      indice.set(chaveDoResultado(registro.employee_id, registro.aso_id, item.exam_id), item.result);
    });
  });
  return indice;
}

/**
 * Monta o registro de resultados de um ASO a partir do que o papel Saude
 * lancou. `anterior` preserva a data de criacao quando o registro e editado.
 */
export function montarResultadosDoAso(entrada: {
  organizationId: string;
  clientId: string;
  employeeId: string;
  asoId: string;
  conclusao: ExamResultRecord['aso_result'];
  restricao?: string;
  exames: Array<{ exam_id: string; exam_code_table_27: string; result?: ResultadoDeExame | ''; observation?: string }>;
  autor?: string;
  anterior?: ExamResultRecord | null;
  agora?: string;
}): ExamResultRecord {
  const agora = entrada.agora || new Date().toISOString();
  const results: ExamResultItem[] = entrada.exames
    .filter((e) => e.result)
    .map((e) => {
      const item: ExamResultItem = {
        exam_id: e.exam_id,
        exam_code_table_27: e.exam_code_table_27,
        result: e.result as ResultadoDeExame,
      };
      const observacao = String(e.observation || '').trim();
      if (observacao) item.observation = observacao;
      return item;
    });

  const registro: ExamResultRecord = {
    id: idDosResultadosDoAso(entrada.employeeId, entrada.asoId),
    organization_id: entrada.organizationId,
    client_id: entrada.clientId,
    employee_id: entrada.employeeId,
    aso_id: entrada.asoId,
    aso_result: entrada.conclusao,
    results,
    created_at: entrada.anterior?.created_at || agora,
    updated_at: agora,
  };
  // Restricao so acompanha a conclusao que a admite.
  const restricao = String(entrada.restricao || '').trim();
  if (entrada.conclusao === 'APTO_COM_RESTRICAO' && restricao) registro.restrictions_notes = restricao;
  if (entrada.autor) registro.recorded_by_name = entrada.autor;
  return registro;
}

/**
 * A conclusao clinica bate com a do cadastro? O cadastro diz apto ou inapto;
 * "apto com restricao" so pode acompanhar um ASO apto.
 */
export function conclusaoCompativel(
  noCadastro: 'APTO' | 'INAPTO' | '',
  clinica: ExamResultRecord['aso_result']
): boolean {
  if (!noCadastro) return false;
  if (noCadastro === 'INAPTO') return clinica === 'INAPTO';
  return clinica === 'APTO' || clinica === 'APTO_COM_RESTRICAO';
}
