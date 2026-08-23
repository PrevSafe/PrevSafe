import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarCpf } from '@/lib/funcionarios';
import {
  STATUS_VALIDADE_LABEL,
  corStatusValidade,
  formatarData,
  statusValidade,
  type StatusValidade,
} from '@/lib/treinamentos';

type Treinamento = {
  id: string;
  funcionario_id: string;
  nome: string;
  carga_horaria: number | null;
  data_realizacao: string;
  data_validade: string | null;
};

type Funcionario = { id: string; nome: string; cpf: string };

export default function Treinamentos() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusValidade>('todos');

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
          .from('treinamentos')
          .select('id, funcionario_id, nome, carga_horaria, data_realizacao, data_validade'),
        empresaId
      ).order('data_realizacao', { ascending: false }),
      daEmpresa(supabase.from('funcionarios').select('id, nome, cpf'), empresaId),
    ]).then(([rt, rf]) => {
      if (!ativo) return;
      const erroCombinado = rt.error ?? rf.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setTreinamentos(rt.data as Treinamento[]);
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

  const filtrados = treinamentos.filter((t) => {
    const status = statusValidade(t.data_validade);
    if (statusFiltro !== 'todos' && status !== statusFiltro) return false;
    if (!termo) return true;
    const funcionario = funcionariosPorId.get(t.funcionario_id);
    const nomeMatch = (funcionario?.nome ?? '').toLowerCase().includes(termo);
    const cpfMatch = termoDigits.length > 0 && (funcionario?.cpf ?? '').includes(termoDigits);
    const treinoMatch = t.nome.toLowerCase().includes(termo);
    return nomeMatch || cpfMatch || treinoMatch;
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <Link to="/dds" className="text-label-sm uppercase tracking-wider text-outline hover:text-primary">
            ← DDS e Treinamentos
          </Link>
          <h1 className="text-headline-lg text-primary mt-1">Treinamentos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Capacitações formais por funcionário, com prazo de reciclagem
          </p>
        </div>
        <Link
          to="/dds/treinamentos/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo treinamento
        </Link>
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
              placeholder="Buscar por funcionário, CPF ou treinamento"
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
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">school</span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || statusFiltro !== 'todos'
                ? 'Nenhum treinamento encontrado para este filtro.'
                : 'Nenhum treinamento registrado ainda.'}
            </p>
            {!termo && statusFiltro === 'todos' && (
              <Link to="/dds/treinamentos/novo" className="text-label-md text-primary-container hover:underline">
                Registrar o primeiro treinamento
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((t) => {
              const funcionario = funcionariosPorId.get(t.funcionario_id);
              const status = statusValidade(t.data_validade);
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/dds/treinamentos/${t.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{t.nome}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {funcionario?.nome ?? '—'}
                      {funcionario ? ` · ${formatarCpf(funcionario.cpf)}` : ''}
                    </p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      Realizado em {formatarData(t.data_realizacao)}
                      {t.carga_horaria ? ` · ${t.carga_horaria}h` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusValidade(status)}`}>
                      {STATUS_VALIDADE_LABEL[status]}
                    </span>
                    {t.data_validade && (
                      <span className="text-label-sm text-outline">{formatarData(t.data_validade)}</span>
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
