import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarCpf } from '@/lib/funcionarios';
import {
  MOTIVO_LABEL,
  STATUS_VALIDADE_LABEL,
  corStatusValidade,
  formatarData,
  statusValidade,
  type StatusValidade,
} from '@/lib/epi';

type Entrega = {
  id: string;
  funcionario_id: string;
  epi_id: string;
  quantidade: number;
  data_entrega: string;
  data_validade: string | null;
  motivo: string;
};

type Funcionario = { id: string; nome: string; cpf: string };
type Epi = { id: string; nome: string; ca: string };

export default function EpiEntregas() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [epis, setEpis] = useState<Epi[]>([]);
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
          .from('epi_entregas')
          .select('id, funcionario_id, epi_id, quantidade, data_entrega, data_validade, motivo'),
        empresaId
      ).order('data_entrega', { ascending: false }),
      daEmpresa(supabase.from('funcionarios').select('id, nome, cpf'), empresaId),
      daEmpresa(supabase.from('epis').select('id, nome, ca'), empresaId),
    ]).then(([re, rf, repis]) => {
      if (!ativo) return;
      const erroCombinado = re.error ?? rf.error ?? repis.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setEntregas(re.data as Entrega[]);
        setFuncionarios(rf.data as Funcionario[]);
        setEpis(repis.data as Epi[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const funcionariosPorId = useMemo(() => new Map(funcionarios.map((f) => [f.id, f])), [funcionarios]);
  const episPorId = useMemo(() => new Map(epis.map((e) => [e.id, e])), [epis]);

  const termo = busca.trim().toLowerCase();
  const termoDigits = busca.replace(/\D/g, '');

  const filtradas = entregas.filter((e) => {
    const status = statusValidade(e.data_validade);
    if (statusFiltro !== 'todos' && status !== statusFiltro) return false;
    if (!termo) return true;
    const funcionario = funcionariosPorId.get(e.funcionario_id);
    const epi = episPorId.get(e.epi_id);
    const nomeMatch = (funcionario?.nome ?? '').toLowerCase().includes(termo);
    const cpfMatch = termoDigits.length > 0 && (funcionario?.cpf ?? '').includes(termoDigits);
    const epiMatch =
      (epi?.nome ?? '').toLowerCase().includes(termo) || (epi?.ca ?? '').includes(termoDigits || termo);
    return nomeMatch || cpfMatch || epiMatch;
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Entrega de EPI</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Livro de entrega de equipamentos de proteção individual (NR-6)
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/epi/catalogo"
            className="h-12 rounded-lg border border-outline text-on-surface-variant text-label-md flex items-center justify-center gap-2 px-5 hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            Catálogo de EPIs
          </Link>
          <Link
            to="/epi/nova"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova entrega
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
              placeholder="Buscar por funcionário, CPF, equipamento ou CA"
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
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              engineering
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || statusFiltro !== 'todos'
                ? 'Nenhuma entrega encontrada para este filtro.'
                : 'Nenhuma entrega de EPI registrada ainda.'}
            </p>
            {!termo && statusFiltro === 'todos' && (
              <Link to="/epi/nova" className="text-label-md text-primary-container hover:underline">
                Registrar a primeira entrega
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtradas.map((e) => {
              const funcionario = funcionariosPorId.get(e.funcionario_id);
              const epi = episPorId.get(e.epi_id);
              const status = statusValidade(e.data_validade);
              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/epi/${e.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">engineering</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">
                      {funcionario?.nome ?? '—'}
                    </h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {funcionario ? formatarCpf(funcionario.cpf) : '—'}
                    </p>
                    <p className="text-label-sm text-on-surface-variant truncate mt-1">
                      {epi ? `${epi.nome} — CA ${epi.ca}` : '—'} · Qtd. {e.quantidade}
                    </p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      Entregue em {formatarData(e.data_entrega)} · {MOTIVO_LABEL[e.motivo as keyof typeof MOTIVO_LABEL] ?? e.motivo}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusValidade(status)}`}>
                      {STATUS_VALIDADE_LABEL[status]}
                    </span>
                    {e.data_validade && (
                      <span className="text-label-sm text-outline">{formatarData(e.data_validade)}</span>
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
