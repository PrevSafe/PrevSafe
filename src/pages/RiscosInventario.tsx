import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  TIPO_RISCO_LABEL,
  TIPO_RISCO_ICONE,
  calcularNivelRisco,
  classificarNivelRisco,
  corNivelRisco,
  NIVEL_RISCO_LABEL,
  type TipoRisco,
} from '@/lib/riscos';

type Risco = {
  id: string;
  ghe_id: string;
  tipo_risco: TipoRisco;
  descricao: string;
  fonte_geradora: string | null;
  probabilidade: number;
  severidade: number;
};

type Ghe = { id: string; nome: string };

export default function RiscosInventario() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [gheFiltro, setGheFiltro] = useState('todos');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoRisco>('todos');

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
          .from('riscos_inventario')
          .select('id, ghe_id, tipo_risco, descricao, fonte_geradora, probabilidade, severidade'),
        empresaId
      ).order('criado_em', { ascending: false }),
      daEmpresa(supabase.from('ghes').select('id, nome'), empresaId).order('nome'),
    ]).then(([rr, rg]) => {
      if (!ativo) return;
      const erroCombinado = rr.error ?? rg.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setRiscos(rr.data as Risco[]);
        setGhes(rg.data as Ghe[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const ghesPorId = useMemo(() => new Map(ghes.map((g) => [g.id, g])), [ghes]);

  const termo = busca.trim().toLowerCase();
  const filtrados = riscos.filter((r) => {
    if (gheFiltro !== 'todos' && r.ghe_id !== gheFiltro) return false;
    if (tipoFiltro !== 'todos' && r.tipo_risco !== tipoFiltro) return false;
    if (!termo) return true;
    const ghe = ghesPorId.get(r.ghe_id);
    return (
      r.descricao.toLowerCase().includes(termo) ||
      (r.fonte_geradora ?? '').toLowerCase().includes(termo) ||
      (ghe?.nome ?? '').toLowerCase().includes(termo)
    );
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Inventário de Riscos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Riscos ocupacionais identificados por GHE, com probabilidade, severidade e meios de controle (NR-1)
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/matriz-riscos"
            className="h-12 rounded-lg border border-outline text-on-surface-variant text-label-md flex items-center justify-center gap-2 px-5 hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            Matriz de Riscos
          </Link>
          <Link
            to="/riscos/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo risco
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
              placeholder="Buscar por descrição, fonte geradora ou GHE"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={gheFiltro}
            onChange={(e) => setGheFiltro(e.target.value)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os GHEs</option>
            {ghes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as 'todos' | TipoRisco)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-48"
          >
            <option value="todos">Todos os tipos</option>
            {(Object.keys(TIPO_RISCO_LABEL) as TipoRisco[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_RISCO_LABEL[t]}
              </option>
            ))}
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
              inventory_2
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || gheFiltro !== 'todos' || tipoFiltro !== 'todos'
                ? 'Nenhum risco encontrado para este filtro.'
                : 'Nenhum risco cadastrado ainda.'}
            </p>
            {!termo && gheFiltro === 'todos' && tipoFiltro === 'todos' && (
              <Link to="/riscos/novo" className="text-label-md text-primary-container hover:underline">
                Cadastrar o primeiro risco
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((r) => {
              const ghe = ghesPorId.get(r.ghe_id);
              const produto = calcularNivelRisco(r.probabilidade, r.severidade);
              const nivel = classificarNivelRisco(produto);
              return (
                <button
                  key={r.id}
                  onClick={() => navigate(`/riscos/${r.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">{TIPO_RISCO_ICONE[r.tipo_risco]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{r.descricao}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {ghe?.nome ?? '—'} · {TIPO_RISCO_LABEL[r.tipo_risco]}
                    </p>
                    {r.fonte_geradora && (
                      <p className="text-label-sm text-outline truncate mt-1">
                        Fonte: {r.fonte_geradora}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corNivelRisco(nivel)}`}>
                      {NIVEL_RISCO_LABEL[nivel]}
                    </span>
                    <span className="text-label-sm text-outline">P{r.probabilidade} × S{r.severidade}</span>
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
