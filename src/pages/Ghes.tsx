import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';

type Ghe = {
  id: string;
  unidade_id: string;
  nome: string;
  descricao: string | null;
};

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };

export default function Ghes() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const empresaId = empresaAtiva.empresa_id;
    Promise.all([
      daEmpresa(supabase.from('ghes').select('id, unidade_id, nome, descricao'), empresaId).order('nome'),
      daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId),
    ]).then(([rg, ru]) => {
      if (!ativo) return;
      const erroCombinado = rg.error ?? ru.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setGhes(rg.data as Ghe[]);
        setUnidades(ru.data as Unidade[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const unidadesPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);

  const termo = busca.trim().toLowerCase();
  const filtrados = ghes.filter((g) => {
    if (!termo) return true;
    const unidade = unidadesPorId.get(g.unidade_id);
    const nomeUnidade = unidade ? unidade.nome_fantasia || unidade.razao_social : '';
    return (
      g.nome.toLowerCase().includes(termo) ||
      (g.descricao ?? '').toLowerCase().includes(termo) ||
      nomeUnidade.toLowerCase().includes(termo)
    );
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Grupos de Exposição (GHE)</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Conjuntos de funcionários, cargos ou setores expostos aos mesmos riscos ocupacionais (NR-1)
          </p>
        </div>
        <Link
          to="/ghe/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo GHE
        </Link>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="search"
            placeholder="Buscar por nome, descrição ou unidade"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
          />
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
              workspaces
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo ? 'Nenhum GHE encontrado para esta busca.' : 'Nenhum GHE cadastrado ainda.'}
            </p>
            {!termo && (
              <Link to="/ghe/novo" className="text-label-md text-primary-container hover:underline">
                Cadastrar o primeiro GHE
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((g) => {
              const unidade = unidadesPorId.get(g.unidade_id);
              return (
                <button
                  key={g.id}
                  onClick={() => navigate(`/ghe/${g.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">workspaces</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{g.nome}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {unidade ? unidade.nome_fantasia || unidade.razao_social : '—'}
                    </p>
                    {g.descricao && (
                      <p className="text-label-sm text-outline truncate mt-1">{g.descricao}</p>
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
