'use client';

/**
 * Resultados clinicos de um ASO, na ficha do colaborador.
 *
 * A ficha abre para toda a equipe; este bloco nao. O resultado e a observacao
 * de cada exame, a conclusao "apto com restricao" e a restricao estao na
 * colecao examResults, que o banco so entrega aos papeis SAUDE e ADMIN. Para
 * os demais a lista chega vazia - e a tela diz que o resultado e restrito,
 * porque "nenhum resultado" seria uma afirmacao falsa sobre o prontuario.
 */
import React, { useState } from 'react';
import { Lock, Stethoscope, Edit3, Save, X } from 'lucide-react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import type { Employee, EmployeeASOHistory, ExamResultRecord, ResultadoDeExame } from '@/types';
import {
  conclusaoDoAso,
  montarResultadosDoAso,
  resultadosDoAso,
  RESULTADO_RESTRITO,
  RESULTADOS_DE_EXAME,
  ROTULO_DA_CONCLUSAO_CLINICA,
  ROTULO_DO_RESULTADO
} from '@/lib/resultadosDeExame';

interface Props {
  employee: Employee;
  aso: EmployeeASOHistory;
}

export const ResultadosDoAso: React.FC<Props> = ({ employee, aso }) => {
  const { examResults = [], acessoAResultadosDeExame, salvarResultadosDoAso, currentProfile } = usePrevSafe();
  const [editando, setEditando] = useState(false);
  const [conclusao, setConclusao] = useState<ExamResultRecord['aso_result']>('APTO');
  const [restricao, setRestricao] = useState('');
  const [valores, setValores] = useState<Record<string, { result: ResultadoDeExame | ''; observation: string }>>({});
  const [erro, setErro] = useState<string | null>(null);

  if (!acessoAResultadosDeExame) {
    return (
      <p className="pl-3 border-l border-slate-800 text-slate-500 italic flex items-center gap-1.5">
        <Lock className="w-3 h-3 shrink-0" />
        {RESULTADO_RESTRITO}
      </p>
    );
  }

  const registro = resultadosDoAso(examResults, employee.id, aso.id);
  const exames = Array.isArray(aso.exams) ? aso.exams : [];
  const conclusaoNoCadastro = conclusaoDoAso(aso);
  // A conclusao clinica nao contradiz o ASO: inapto continua inapto, e a
  // restricao so acompanha um ASO apto.
  const conclusoesPossiveis: ExamResultRecord['aso_result'][] =
    conclusaoNoCadastro === 'INAPTO' ? ['INAPTO'] : ['APTO', 'APTO_COM_RESTRICAO'];
  const nomeDoExame = (examId: string) => {
    const exame = exames.find((x) => x.id === examId);
    return exame ? `${exame.exam_code_table_27} ${exame.exam_name}` : 'Exame fora deste ASO';
  };

  const abrirEdicao = () => {
    const inicial: Record<string, { result: ResultadoDeExame | ''; observation: string }> = {};
    exames.forEach((x) => {
      const anotado = registro?.results.find((r) => r.exam_id === x.id);
      inicial[x.id] = { result: anotado?.result || '', observation: anotado?.observation || '' };
    });
    setValores(inicial);
    setConclusao(registro?.aso_result && conclusoesPossiveis.includes(registro.aso_result) ? registro.aso_result : conclusoesPossiveis[0]);
    setRestricao(registro?.restrictions_notes || '');
    setErro(null);
    setEditando(true);
  };

  const salvar = () => {
    if (conclusao === 'APTO_COM_RESTRICAO' && !restricao.trim()) {
      setErro('Descreva a restrição.');
      return;
    }
    const gravacao = salvarResultadosDoAso(
      montarResultadosDoAso({
        organizationId: employee.organization_id,
        clientId: employee.client_id,
        employeeId: employee.id,
        asoId: aso.id,
        conclusao,
        restricao,
        exames: exames.map((x) => ({
          exam_id: x.id,
          exam_code_table_27: x.exam_code_table_27,
          result: valores[x.id]?.result || '',
          observation: valores[x.id]?.observation || ''
        })),
        autor: currentProfile.full_name,
        anterior: registro
      })
    );
    if (!gravacao.ok) {
      setErro(gravacao.motivo || 'Não foi possível gravar os resultados.');
      return;
    }
    setEditando(false);
  };

  if (!editando) {
    return (
      <div className="pl-3 border-l border-pink-500/30 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 flex items-center gap-1">
            <Stethoscope className="w-3 h-3" /> Prontuário (papel Saúde)
          </span>
          <button
            type="button"
            onClick={abrirEdicao}
            className="text-[10px] font-semibold text-pink-300 hover:text-pink-200 flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" /> {registro ? 'Editar resultados' : 'Lançar resultados'}
          </button>
        </div>
        {registro ? (
          <>
            <p className="text-slate-300">
              Conclusão clínica: <span className="font-semibold">{ROTULO_DA_CONCLUSAO_CLINICA[registro.aso_result] || 'não registrada'}</span>
              {registro.restrictions_notes ? ` — ${registro.restrictions_notes}` : ''}
            </p>
            <ul className="space-y-0.5">
              {registro.results.map((r) => (
                <li key={r.exam_id} className="flex justify-between gap-2 text-slate-400">
                  <span className="truncate">{nomeDoExame(r.exam_id)}{r.observation ? ` — ${r.observation}` : ''}</span>
                  <span className="shrink-0 text-slate-200">{r.result ? ROTULO_DO_RESULTADO[r.result] : 'Sem resultado'}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-amber-500/80">Resultados ainda não lançados para este ASO.</p>
        )}
      </div>
    );
  }

  return (
    <div className="pl-3 border-l border-pink-500/40 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-[10px] font-semibold text-slate-400">Conclusão clínica</span>
          <select
            value={conclusao}
            onChange={(e) => setConclusao(e.target.value as ExamResultRecord['aso_result'])}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          >
            {conclusoesPossiveis.map((c) => (
              <option key={c} value={c}>{ROTULO_DA_CONCLUSAO_CLINICA[c]}</option>
            ))}
          </select>
        </label>
        {conclusao === 'APTO_COM_RESTRICAO' && (
          <label className="space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-400">Restrição</span>
            <input
              type="text"
              value={restricao}
              onChange={(e) => setRestricao(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </label>
        )}
      </div>

      {exames.length === 0 ? (
        <p className="text-slate-500">Este ASO não tem exames lançados.</p>
      ) : (
        <div className="space-y-1">
          {exames.map((x) => (
            <div key={x.id} className="grid grid-cols-12 gap-1.5 items-center">
              <span className="col-span-12 sm:col-span-5 truncate text-slate-300">{x.exam_code_table_27} {x.exam_name}</span>
              <select
                value={valores[x.id]?.result || ''}
                onChange={(e) => setValores((v) => ({ ...v, [x.id]: { result: e.target.value as ResultadoDeExame | '', observation: v[x.id]?.observation || '' } }))}
                className="col-span-5 sm:col-span-3 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-100"
              >
                <option value="">Sem resultado</option>
                {RESULTADOS_DE_EXAME.map((r) => (
                  <option key={r} value={r}>{ROTULO_DO_RESULTADO[r]}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Observação"
                value={valores[x.id]?.observation || ''}
                onChange={(e) => setValores((v) => ({ ...v, [x.id]: { result: v[x.id]?.result || '', observation: e.target.value } }))}
                className="col-span-7 sm:col-span-4 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-100"
              />
            </div>
          ))}
        </div>
      )}

      {erro && <p className="text-rose-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="px-2 py-1 rounded bg-slate-800 text-slate-300 flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          className="px-2 py-1 rounded bg-pink-500 text-slate-950 font-bold flex items-center gap-1"
        >
          <Save className="w-3 h-3" /> Gravar no prontuário
        </button>
      </div>
    </div>
  );
};
