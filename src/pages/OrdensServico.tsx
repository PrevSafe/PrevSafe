import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  STATUS_OS_LABEL,
  PRIORIDADE_OS_LABEL,
  corStatusOS,
  corPrioridadeOS,
  formatarDataOS,
  type StatusOS,
  type PrioridadeOS,
} from '@/lib/ordensServico';

type OrdemServico = {
  id: string;
  numero: string | null;
  titulo: string;
  status: StatusOS;
  prioridade: PrioridadeOS;
  data_prazo: string | null;
  progresso: number;
  modelos_servico: { nome: string; codigo: string } | null;
};

export default function OrdensServico() {
  const { empresaAtiva, can } = useAuth();
  const navigate = useNavigate();
  const podeCriar = can('ordens_servico', 'criar');

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusOS>('todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    daEmpresa(
      supabase
        .from('ordens_servico')
        .select('id, numero, titulo, status, prioridade, data_prazo, progresso, modelos_servico(nome, codigo)'),
      empresaAtiva.empresa_id
    )
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setOrdens((data ?? []) as unknown as OrdemServico[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const termo = busca.trim().toLowerCase();

  const filtradas = ordens.filter((os) => {
    if (statusFiltro !== 'todos' && os.status !== statusFiltro) return false;
    if (!termo) return true;
    return (
      (os.numero ?? '').toLowerCase().includes(termo) ||
      os.titulo.toLowerCase().includes(termo) ||
      (os.modelos_servico?.nome ?? '').toLowerCase().includes(termo)
    );
  });

  const filtroAtivo = Boolean(termo) || statusFiltro !== 'todos';

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Ordens de Serviço</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Workflow de execução dos serviços contratados, com etapas e tarefas geradas
            automaticamente a partir do modelo escolhido
          </p>
        </div>
        {podeCriar && (
          <Link
            to="/ordens-servico/nova"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova OS
          </Link>
        )}
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
              placeholder="Buscar por número, título ou serviço"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusOS)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os status</option>
            {(Object.keys(STATUS_OS_LABEL) as StatusOS[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_OS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              assignment
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {filtroAtivo ? 'Nenhuma OS encontrada para este filtro.' : 'Nenhuma ordem de serviço criada ainda.'}
            </p>
            {!filtroAtivo && podeCriar && (
              <Link to="/ordens-servico/nova" className="text-label-md text-primary-container hover:underline">
                Criar a primeira OS
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtradas.map((os) => (
              <button
                key={os.id}
                onClick={() => navigate(`/ordens-servico/${os.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-label-sm text-outline">{os.numero ?? '—'}</p>
                    <h3 className="text-body-lg text-primary font-semibold truncate">{os.titulo}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {os.modelos_servico?.nome ?? 'Sem modelo de serviço'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusOS(os.status)}`}>
                      {STATUS_OS_LABEL[os.status]}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corPrioridadeOS(os.prioridade)}`}>
                      {PRIORIDADE_OS_LABEL[os.prioridade]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary-container transition-all"
                      style={{ width: `${os.progresso}%` }}
                    />
                  </div>
                  <span className="text-label-sm text-on-surface-variant shrink-0">{os.progresso}%</span>
                </div>

                {os.data_prazo && (
                  <p className="text-label-sm text-outline">Prazo: {formatarDataOS(os.data_prazo)}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
