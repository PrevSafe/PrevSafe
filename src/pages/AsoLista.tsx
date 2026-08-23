import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarCpf } from '@/lib/funcionarios';
import {
  RESULTADO_LABEL,
  STATUS_VALIDADE_LABEL,
  TIPO_EXAME_LABEL,
  corResultado,
  corStatusValidade,
  formatarData,
  statusValidade,
  type Resultado,
  type StatusValidade,
} from '@/lib/aso';

type Aso = {
  id: string;
  funcionario_id: string;
  tipo_exame: string;
  data_exame: string;
  data_vencimento: string | null;
  resultado: string;
  medico_nome: string | null;
};

type Funcionario = { id: string; nome: string; cpf: string };

export default function AsoLista() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [asos, setAsos] = useState<Aso[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusValidade>('todos');
  const [resultadoFiltro, setResultadoFiltro] = useState<'todos' | Resultado>('todos');

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const empresaId = empresaAtiva.empresa_id;
    Promise.all([
      daEmpresa(
        supabase
          .from('asos')
          .select('id, funcionario_id, tipo_exame, data_exame, data_vencimento, resultado, medico_nome'),
        empresaId
      ).order('data_exame', { ascending: false }),
      daEmpresa(supabase.from('funcionarios').select('id, nome, cpf'), empresaId),
    ]).then(([ra, rf]) => {
      if (!ativo) return;
      const erroCombinado = ra.error ?? rf.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setAsos(ra.data as Aso[]);
        setFuncionarios(rf.data as Funcionario[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const funcionariosPorId = useMemo(() => new Map(funcionarios.map((f) => [f.id, f])), [funcionarios]);

  const termo = busca.trim().toLowerCase();
  const termoDigits = busca.replace(/\D/g, '');

  const filtrados = asos.filter((a) => {
    const status = statusValidade(a.data_vencimento);
    if (statusFiltro !== 'todos' && status !== statusFiltro) return false;
    if (resultadoFiltro !== 'todos' && a.resultado !== resultadoFiltro) return false;
    if (!termo) return true;
    const funcionario = funcionariosPorId.get(a.funcionario_id);
    const nomeMatch = (funcionario?.nome ?? '').toLowerCase().includes(termo);
    const cpfMatch = termoDigits.length > 0 && (funcionario?.cpf ?? '').includes(termoDigits);
    return nomeMatch || cpfMatch;
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Controle de ASO</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Atestados de Saúde Ocupacional dos funcionários (NR-7/PCMSO)
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/aso/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo ASO
          </Link>
        </div>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar por funcionário ou CPF"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusValidade)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os status</option>
            <option value="valido">Válidos</option>
            <option value="vencendo">Vencendo em breve</option>
            <option value="vencido">Vencidos</option>
            <option value="sem_validade">Sem prazo definido</option>
          </select>
          <select
            value={resultadoFiltro}
            onChange={(e) => setResultadoFiltro(e.target.value as 'todos' | Resultado)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os resultados</option>
            <option value="apto">Apto</option>
            <option value="apto_com_restricoes">Apto com restrições</option>
            <option value="inapto">Inapto</option>
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              medical_information
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || statusFiltro !== 'todos' || resultadoFiltro !== 'todos'
                ? 'Nenhum ASO encontrado para este filtro.'
                : 'Nenhum ASO registrado ainda.'}
            </p>
            {!termo && statusFiltro === 'todos' && resultadoFiltro === 'todos' && (
              <Link to="/aso/novo" className="text-label-md text-primary-container hover:underline">
                Registrar o primeiro ASO
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((a) => {
              const funcionario = funcionariosPorId.get(a.funcionario_id);
              const status = statusValidade(a.data_vencimento);
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/aso/${a.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">medical_information</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">
                      {funcionario?.nome ?? '—'}
                    </h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {funcionario ? formatarCpf(funcionario.cpf) : '—'}
                    </p>
                    <p className="text-label-sm text-on-surface-variant truncate mt-1">
                      {TIPO_EXAME_LABEL[a.tipo_exame as keyof typeof TIPO_EXAME_LABEL] ?? a.tipo_exame}
                      {a.medico_nome ? ` · Dr(a). ${a.medico_nome}` : ''}
                    </p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      Exame em {formatarData(a.data_exame)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corResultado(a.resultado)}`}>
                      {RESULTADO_LABEL[a.resultado as keyof typeof RESULTADO_LABEL] ?? a.resultado}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusValidade(status)}`}>
                      {STATUS_VALIDADE_LABEL[status]}
                    </span>
                    {a.data_vencimento && (
                      <span className="text-label-sm text-outline">{formatarData(a.data_vencimento)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
